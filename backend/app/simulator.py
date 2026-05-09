import asyncio
import random
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils import gen_id, now_iso

# Attack templates with severity + attack_type metadata
LOG_TEMPLATES = [
    ('info', 'allow', 'normal', 'Connection established from {src} to {dst}:{port}'),
    ('info', 'allow', 'normal', 'DHCP lease renewed for {host} ({mac})'),
    ('info', 'allow', 'normal', 'DNS query resolved: {domain} -> {ip}'),
    ('warning', 'allow', 'high_traffic', 'High traffic on {iface}: {mbps} Mbps'),
    ('warning', 'block', 'repeated_attempts', 'Repeated connection attempts from {src} to {dst}:{port}'),
    ('warning', 'allow', 'normal', 'TLS handshake delayed: {dst}'),
    ('critical', 'block', 'suspicious_traffic', 'BLOCKED: Suspicious traffic from {src} to {dst}:{port} (policy: {policy})'),
    ('critical', 'block', 'port_scan', 'Port scan detected from {src} on interface {iface}'),
    ('critical', 'block', 'brute_force', 'Brute force attempt detected on {dst}:{port} from {src}'),
    ('critical', 'block', 'sql_injection', 'SQL injection attempt from {src} targeting {dst}:{port}'),
    ('critical', 'block', 'malware_c2', 'Possible malware C2 traffic from {src} to {dst}:{port}'),
    ('info', 'allow', 'normal', 'VPN peer {peer} connected from {src}'),
]

DOMAINS = ['google.com', 'github.com', 'cloudflare.com', 'amazon.com', 'microsoft.com', 'apple.com', 'ubuntu.com', 'docker.io', 'firewall.local', 'web.local']
INTERFACES = ['WAN', 'LAN', 'OPT1']
PORTS = [22, 53, 80, 443, 3306, 3389, 5432, 8080, 8443, 51820]
POLICIES = ['BLOCK_SSH_EXTERNAL', 'GEO_BLOCK', 'RATE_LIMIT', 'IPS_RULE_403', 'BLOCKED_COUNTRIES']

# Persistent attackers with profiles (external + internal)
EXTERNAL_ATTACKERS = [
    {'ip': '185.143.220.45', 'hostname': 'scan-185-143-220-45.malicious-net.ru', 'country': 'RU', 'flag': '🇷🇺', 'profile': 'port_scan'},
    {'ip': '45.227.255.33', 'hostname': 'tor-exit-45-227.darkweb.org', 'country': 'NL', 'flag': '🇳🇱', 'profile': 'brute_force'},
    {'ip': '194.26.135.21', 'hostname': 'bot-194-26-135-21.botnet.cn', 'country': 'CN', 'flag': '🇨🇳', 'profile': 'malware_c2'},
    {'ip': '91.243.85.114', 'hostname': 'crawler-91-243.suspicious.io', 'country': 'IR', 'flag': '🇮🇷', 'profile': 'sql_injection'},
    {'ip': '103.146.230.78', 'hostname': 'vpn-103-146-230-78.proxy.kr', 'country': 'KP', 'flag': '🇰🇵', 'profile': 'port_scan'},
    {'ip': '5.188.10.179', 'hostname': 'host-5-188-10-179.attacks.bg', 'country': 'BG', 'flag': '🇧🇬', 'profile': 'brute_force'},
]

INTERNAL_SUSPICIOUS = [
    {'ip': '192.168.1.155', 'hostname': 'workstation-infected.lan', 'country': 'LAN', 'flag': '🏠', 'profile': 'malware_c2'},
    {'ip': '192.168.50.42', 'hostname': 'iot-device-anomaly.lan', 'country': 'LAN', 'flag': '🏠', 'profile': 'high_traffic'},
]

# Normal traffic IPs
NORMAL_EXTERNAL = [
    {'ip': '142.250.78.46', 'hostname': 'lhr25s35-in-f14.1e100.net', 'country': 'US', 'flag': '🇺🇸'},
    {'ip': '140.82.121.4', 'hostname': 'lb-140-82-121-4-iad.github.com', 'country': 'US', 'flag': '🇺🇸'},
    {'ip': '104.16.132.229', 'hostname': 'cloudflare-dns.com', 'country': 'US', 'flag': '🇺🇸'},
    {'ip': '52.46.249.32', 'hostname': 'server-52-46-249-32.s3-eu-central-1.amazonaws.com', 'country': 'DE', 'flag': '🇩🇪'},
]

NORMAL_INTERNAL = [
    {'ip': '192.168.1.101', 'hostname': 'desktop-carlos', 'country': 'LAN', 'flag': '🏠'},
    {'ip': '192.168.1.102', 'hostname': 'iphone-maria', 'country': 'LAN', 'flag': '🏠'},
    {'ip': '192.168.1.103', 'hostname': 'macbook-joao', 'country': 'LAN', 'flag': '🏠'},
    {'ip': '192.168.50.10', 'hostname': 'web-server-01', 'country': 'LAN', 'flag': '🏠'},
]


def rnd_mac() -> str:
    return ':'.join(f'{random.randint(0, 255):02x}' for _ in range(6))


def pick_src(target_block: bool) -> dict:
    """Pick a source IP biased toward attackers when generating block events."""
    if target_block:
        # 80% attackers when blocking
        if random.random() < 0.85:
            return random.choice(EXTERNAL_ATTACKERS + INTERNAL_SUSPICIOUS)
    # Otherwise normal
    return random.choice(NORMAL_EXTERNAL + NORMAL_INTERNAL + EXTERNAL_ATTACKERS[:2])


def pick_dst(src_country: str) -> dict:
    if src_country == 'LAN':
        return random.choice(NORMAL_EXTERNAL)
    return random.choice(NORMAL_INTERNAL)


class Simulator:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._traffic_baseline = {'rx_mbps': 12.0, 'tx_mbps': 4.5}
        self._cpu = 18.0
        self._ram = 36.0
        self._connections = 280
        self._blocked_total = 0
        self._allowed_total = 0

    async def run_forever(self) -> None:
        try:
            while True:
                await self.tick()
                await asyncio.sleep(2.0)
        except asyncio.CancelledError:
            return

    async def tick(self) -> None:
        # System metrics with smooth random walk
        self._cpu = max(4.0, min(95.0, self._cpu + random.uniform(-3.0, 3.5)))
        self._ram = max(20.0, min(90.0, self._ram + random.uniform(-1.5, 1.8)))
        self._connections = max(40, min(2000, self._connections + random.randint(-25, 30)))

        rx = max(0.5, self._traffic_baseline['rx_mbps'] + random.uniform(-3, 6))
        tx = max(0.2, self._traffic_baseline['tx_mbps'] + random.uniform(-2, 4))

        if random.random() < 0.05:
            rx *= random.uniform(2, 4)
            tx *= random.uniform(1.5, 3)

        blocked = random.randint(0, 12)
        allowed = random.randint(50, 300)
        self._blocked_total += blocked
        self._allowed_total += allowed

        sample = {
            'id': gen_id(),
            'ts': now_iso(),
            'cpu': round(self._cpu, 1),
            'ram': round(self._ram, 1),
            'connections': self._connections,
            'rx_mbps': round(rx, 2),
            'tx_mbps': round(tx, 2),
            'blocked_per_tick': blocked,
            'allowed_per_tick': allowed,
            'blocked_total': self._blocked_total,
            'allowed_total': self._allowed_total,
        }
        await self.db.metrics_samples.insert_one(sample)
        count = await self.db.metrics_samples.count_documents({})
        if count > 240:
            extra = count - 200
            cursor = self.db.metrics_samples.find({}, {'_id': 1, 'ts': 1}).sort('ts', 1).limit(extra)
            old_ids = [d['_id'] async for d in cursor]
            if old_ids:
                await self.db.metrics_samples.delete_many({'_id': {'$in': old_ids}})

        # Generate logs (mix of normal + attacker patterns)
        n_logs = random.randint(3, 7)
        for _ in range(n_logs):
            severity, action, attack_type, template = random.choice(LOG_TEMPLATES)
            blocking = action == 'block'
            src_info = pick_src(blocking)
            dst_info = pick_dst(src_info.get('country', ''))

            # If src is a known attacker, prefer their profile attack type for blocks
            if blocking and 'profile' in src_info and random.random() < 0.7:
                profile = src_info['profile']
                # Find a matching template
                matching = [tpl for tpl in LOG_TEMPLATES if tpl[2] == profile and tpl[1] == 'block']
                if matching:
                    severity, action, attack_type, template = random.choice(matching)

            # Skip if rule is disabled (check for active firewall rule on this attacker)
            if blocking:
                blocked_alias = await self.db.aliases.find_one({'name': 'BLOCKED_ATTACKERS'})
                if blocked_alias and src_info['ip'] in (blocked_alias.get('addresses') or []):
                    # Already blocked, simulate that this is the rule kicking in (still log it)
                    pass

            data = {
                'src': src_info['ip'],
                'dst': dst_info['ip'],
                'port': random.choice(PORTS),
                'iface': random.choice(INTERFACES),
                'mbps': round(random.uniform(50, 220), 1),
                'host': src_info.get('hostname', f'host-{random.randint(1, 99)}'),
                'mac': rnd_mac(),
                'domain': random.choice(DOMAINS),
                'ip': dst_info['ip'],
                'policy': random.choice(POLICIES),
                'peer': random.choice(['Carlos-Laptop', 'Maria-Phone', 'Office-Branch']),
            }
            try:
                msg = template.format(**data)
            except KeyError:
                msg = template

            log = {
                'id': gen_id(),
                'ts': now_iso(),
                'severity': severity,
                'action': action,
                'attack_type': attack_type,
                'interface': data['iface'],
                'src_ip': data['src'],
                'src_hostname': src_info.get('hostname', ''),
                'src_country': src_info.get('country', ''),
                'src_flag': src_info.get('flag', ''),
                'dst_ip': data['dst'],
                'dst_hostname': dst_info.get('hostname', ''),
                'port': data['port'],
                'protocol': random.choice(['tcp', 'udp', 'icmp']),
                'message': msg,
            }
            await self.db.logs.insert_one(log)

        # Trim logs (keep last 800 to give richer attack history)
        log_count = await self.db.logs.count_documents({})
        if log_count > 1000:
            extra = log_count - 800
            cursor = self.db.logs.find({}, {'_id': 1}).sort('ts', 1).limit(extra)
            old_ids = [d['_id'] async for d in cursor]
            if old_ids:
                await self.db.logs.delete_many({'_id': {'$in': old_ids}})

        # Update interface counters (simulated)
        async for iface in self.db.interfaces.find({'enabled': True}):
            rx_bytes = int(rx * 125000 * random.uniform(0.7, 1.3))
            tx_bytes = int(tx * 125000 * random.uniform(0.7, 1.3))
            await self.db.interfaces.update_one(
                {'id': iface['id']},
                {'$set': {
                    'rx_mbps': round(random.uniform(0.5, 80), 2),
                    'tx_mbps': round(random.uniform(0.2, 40), 2),
                    'rx_bytes': iface.get('rx_bytes', 0) + rx_bytes,
                    'tx_bytes': iface.get('tx_bytes', 0) + tx_bytes,
                    'status': 'up',
                    'updated_at': now_iso(),
                }},
            )
        await self.db.interfaces.update_many(
            {'enabled': False},
            {'$set': {'status': 'down', 'rx_mbps': 0, 'tx_mbps': 0, 'updated_at': now_iso()}},
        )
