import asyncio
import random
from datetime import datetime, timezone
from typing import Any, Dict
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.utils import gen_id, now_iso

LOG_TEMPLATES = [
    ('info', 'Connection established from {src} to {dst}:{port}'),
    ('info', 'DHCP lease renewed for {host} ({mac})'),
    ('info', 'DNS query resolved: {domain} -> {ip}'),
    ('warning', 'High traffic on {iface}: {mbps} Mbps'),
    ('warning', 'Repeated connection attempts from {src} to {dst}:{port}'),
    ('warning', 'TLS handshake delayed: {dst}'),
    ('critical', 'BLOCKED: Suspicious traffic from {src} to {dst}:{port} (policy: {policy})'),
    ('critical', 'Port scan detected from {src} on interface {iface}'),
    ('critical', 'Brute force attempt detected on {dst}:{port} from {src}'),
    ('info', 'VPN peer {peer} connected from {src}'),
]

DOMAINS = ['google.com', 'github.com', 'cloudflare.com', 'amazon.com', 'microsoft.com', 'apple.com', 'ubuntu.com', 'docker.io', 'firewall.local', 'web.local']
INTERFACES = ['WAN', 'LAN', 'OPT1']
PORTS = [22, 53, 80, 443, 3306, 3389, 5432, 8080, 8443, 51820]
POLICIES = ['BLOCK_SSH_EXTERNAL', 'GEO_BLOCK', 'RATE_LIMIT', 'IPS_RULE_403']


def rnd_ip(private: bool = False) -> str:
    if private:
        return f'192.168.{random.randint(1,99)}.{random.randint(2,254)}'
    return f'{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}'


def rnd_mac() -> str:
    return ':'.join(f'{random.randint(0,255):02x}' for _ in range(6))


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

        # Occasional spike
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
        # Keep only last 200 samples
        count = await self.db.metrics_samples.count_documents({})
        if count > 240:
            extra = count - 200
            cursor = self.db.metrics_samples.find({}, {'_id': 1, 'ts': 1}).sort('ts', 1).limit(extra)
            old_ids = [d['_id'] async for d in cursor]
            if old_ids:
                await self.db.metrics_samples.delete_many({'_id': {'$in': old_ids}})

        # Generate logs
        n_logs = random.randint(2, 5)
        for _ in range(n_logs):
            severity, template = random.choice(LOG_TEMPLATES)
            data = {
                'src': rnd_ip(private=random.random() < 0.4),
                'dst': rnd_ip(private=random.random() < 0.5),
                'port': random.choice(PORTS),
                'iface': random.choice(INTERFACES),
                'mbps': round(random.uniform(50, 220), 1),
                'host': f'host-{random.randint(1,99)}',
                'mac': rnd_mac(),
                'domain': random.choice(DOMAINS),
                'ip': rnd_ip(),
                'policy': random.choice(POLICIES),
                'peer': random.choice(['Carlos-Laptop', 'Maria-Phone', 'Office-Branch']),
            }
            try:
                msg = template.format(**data)
            except KeyError:
                msg = template
            action = 'block' if severity == 'critical' else ('allow' if 'BLOCKED' not in msg else 'block')
            log = {
                'id': gen_id(),
                'ts': now_iso(),
                'severity': severity,
                'action': action,
                'interface': data['iface'],
                'src_ip': data['src'],
                'dst_ip': data['dst'],
                'port': data['port'],
                'protocol': random.choice(['tcp', 'udp', 'icmp']),
                'message': msg,
            }
            await self.db.logs.insert_one(log)

        # Trim logs (keep last 500)
        log_count = await self.db.logs.count_documents({})
        if log_count > 600:
            extra = log_count - 500
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
                }}
            )
        # Disabled interfaces -> down
        await self.db.interfaces.update_many({'enabled': False}, {'$set': {'status': 'down', 'rx_mbps': 0, 'tx_mbps': 0, 'updated_at': now_iso()}})
