"""Real host metrics + interface discovery via psutil.

With Docker network_mode: host + CAP_NET_ADMIN/NET_RAW the backend container
shares the host network namespace, so /proc/net/dev and psutil's net counters
report real host interfaces and traffic.
"""
import os
import socket
import logging
from typing import Dict, Any, List, Optional

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

logger = logging.getLogger('firewall-console.metrics')

USE_REAL = os.environ.get('HOST_METRICS_REAL', 'true').lower() in ('1', 'true', 'yes', 'on')

# Linux AF_PACKET constant (where MAC addresses live in psutil.net_if_addrs)
try:
    _AF_PACKET = socket.AF_PACKET  # Linux only
except AttributeError:
    _AF_PACKET = 17  # numeric fallback


def enabled() -> bool:
    return USE_REAL and HAS_PSUTIL


def get_real_metrics() -> Dict[str, Any]:
    """Return real host metrics. Empty dict if unavailable."""
    if not enabled():
        return {}
    try:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        net = psutil.net_io_counters()
        connections = _connection_count()
        return {
            'cpu': round(cpu, 1),
            'ram': round(mem.percent, 1),
            'connections': connections,
            'rx_bytes_total': net.bytes_recv,
            'tx_bytes_total': net.bytes_sent,
        }
    except Exception as e:
        logger.debug('psutil metrics failed: %s', e)
        return {}


def _connection_count() -> int:
    # Prefer reading nf_conntrack table (most accurate for a firewall)
    try:
        with open('/proc/net/nf_conntrack', 'r') as f:
            return sum(1 for _ in f)
    except (FileNotFoundError, PermissionError):
        pass
    # Fall back to /proc/net/tcp + /proc/net/tcp6 line count
    n = 0
    for path in ('/proc/net/tcp', '/proc/net/tcp6', '/proc/net/udp', '/proc/net/udp6'):
        try:
            with open(path, 'r') as f:
                # subtract header line
                n += max(0, sum(1 for _ in f) - 1)
        except Exception:
            pass
    if n > 0:
        return n
    # Last resort: psutil
    try:
        return len(psutil.net_connections(kind='inet'))
    except Exception:
        return 0


def _netmask_to_cidr(netmask: Optional[str]) -> int:
    if not netmask:
        return 24
    try:
        return sum(bin(int(x)).count('1') for x in netmask.split('.'))
    except Exception:
        return 24


def _guess_role(name: str, addr: str) -> str:
    """Heuristic to label an interface as wan/lan/opt."""
    name_l = name.lower()
    if name_l in ('lo', 'docker0') or name_l.startswith(('br-', 'veth', 'tun', 'tap', 'wg')):
        return 'opt'
    # Public IP-like heuristic - if address is private it's probably LAN
    if addr:
        if addr.startswith(('10.', '192.168.')):
            return 'lan'
        # 172.16-31
        try:
            second = int(addr.split('.')[1])
            if addr.startswith('172.') and 16 <= second <= 31:
                return 'lan'
        except (IndexError, ValueError):
            pass
        return 'wan'
    # Common interface naming convention: first physical iface = WAN
    if name_l in ('eth0', 'ens3', 'enp1s0', 'enp0s3'):
        return 'wan'
    return 'opt'


def discover_interfaces() -> List[Dict[str, Any]]:
    """Return a list of real host network interfaces.
    Each item: {name, device, ipv4, gateway, mac, mtu, enabled, role, description}
    Excludes loopback and Docker bridges by default.
    """
    if not HAS_PSUTIL:
        return []
    try:
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
    except Exception as e:
        logger.warning('Could not enumerate interfaces: %s', e)
        return []

    out = []
    for dev_name, addr_list in addrs.items():
        if dev_name == 'lo':
            continue
        # Skip Docker virtual ifaces by default
        if dev_name.startswith(('docker', 'br-', 'veth')):
            continue

        ipv4 = ''
        netmask = ''
        mac = ''
        for a in addr_list:
            fam = getattr(a, 'family', None)
            fam_int = int(fam) if fam is not None else None
            if fam == socket.AF_INET or fam_int == 2:
                ipv4 = a.address
                netmask = getattr(a, 'netmask', '') or ''
            elif fam_int == _AF_PACKET or 'PACKET' in str(fam) or 'LINK' in str(fam):
                mac = a.address

        stat = stats.get(dev_name)
        mtu = stat.mtu if stat else 1500
        is_up = bool(stat.isup) if stat else False

        cidr = _netmask_to_cidr(netmask)
        ipv4_cidr = f'{ipv4}/{cidr}' if ipv4 else ''

        out.append({
            'name': dev_name.upper(),
            'device': dev_name,
            'role': _guess_role(dev_name, ipv4),
            'ipv4': ipv4_cidr,
            'gateway': '',
            'mac': mac,
            'mtu': int(mtu),
            'enabled': is_up,
            'description': f'Auto-detected ({dev_name})',
        })
    return out


def get_interface_traffic() -> Dict[str, Dict[str, int]]:
    """Return per-NIC byte counters {name_upper: {rx_bytes, tx_bytes}}."""
    if not HAS_PSUTIL:
        return {}
    try:
        per_nic = psutil.net_io_counters(pernic=True)
        return {
            name.upper(): {'rx_bytes': c.bytes_recv, 'tx_bytes': c.bytes_sent}
            for name, c in per_nic.items()
        }
    except Exception:
        return {}
