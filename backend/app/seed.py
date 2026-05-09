import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.security import hash_password
from app.utils import gen_id, now_iso

SEED_DEMO_DATA = os.environ.get('SEED_DEMO_DATA', 'true').lower() in ('1', 'true', 'yes', 'on')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@firewall.local').lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@123')


async def seed_initial_data(db: AsyncIOMotorDatabase) -> None:
    # Migration: ensure existing nat_rules have a direction field
    await db.nat_rules.update_many({'direction': {'$exists': False}}, {'$set': {'direction': 'inbound'}})

    # Always seed admin (idempotent)
    if not await db.users.find_one({'email': ADMIN_EMAIL}):
        await db.users.insert_one({
            'id': gen_id(),
            'email': ADMIN_EMAIL,
            'name': 'Administrator',
            'role': 'admin',
            'password_hash': hash_password(ADMIN_PASSWORD),
            'enabled': True,
            'created_at': now_iso(),
        })

    if not SEED_DEMO_DATA:
        # Production: only the admin user is seeded; no demo data
        return

    if not await db.users.find_one({'email': 'operator@firewall.local'}):
        await db.users.insert_one({
            'id': gen_id(),
            'email': 'operator@firewall.local',
            'name': 'Operator',
            'role': 'operator',
            'password_hash': hash_password('Operator@123'),
            'enabled': True,
            'created_at': now_iso(),
        })
    if not await db.users.find_one({'email': 'viewer@firewall.local'}):
        await db.users.insert_one({
            'id': gen_id(),
            'email': 'viewer@firewall.local',
            'name': 'Viewer',
            'role': 'viewer',
            'password_hash': hash_password('Viewer@123'),
            'enabled': True,
            'created_at': now_iso(),
        })

    # Seed interfaces
    if await db.interfaces.count_documents({}) == 0:
        await db.interfaces.insert_many([
            {'id': gen_id(), 'name': 'WAN', 'device': 'eth0', 'role': 'wan', 'ipv4': '203.0.113.10/24', 'gateway': '203.0.113.1', 'mac': '52:54:00:12:34:56', 'mtu': 1500, 'enabled': True, 'description': 'Internet uplink', 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'LAN', 'device': 'eth1', 'role': 'lan', 'ipv4': '192.168.1.1/24', 'gateway': '', 'mac': '52:54:00:12:34:57', 'mtu': 1500, 'enabled': True, 'description': 'Internal network', 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'OPT1', 'device': 'eth2', 'role': 'opt', 'ipv4': '192.168.50.1/24', 'gateway': '', 'mac': '52:54:00:12:34:58', 'mtu': 1500, 'enabled': True, 'description': 'DMZ / Servers', 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'GUEST', 'device': 'eth3', 'role': 'opt', 'ipv4': '192.168.99.1/24', 'gateway': '', 'mac': '52:54:00:12:34:59', 'mtu': 1500, 'enabled': False, 'description': 'Guest WiFi', 'created_at': now_iso()},
        ])

    # Seed aliases
    if await db.aliases.count_documents({}) == 0:
        await db.aliases.insert_many([
            {'id': gen_id(), 'name': 'TRUSTED_ADMINS', 'type': 'host', 'addresses': ['192.168.1.10', '192.168.1.11'], 'description': 'Workstations dos administradores', 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'BLOCKED_COUNTRIES', 'type': 'network', 'addresses': ['10.10.0.0/16', '172.16.0.0/12'], 'description': 'Redes bloqueadas', 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'WEB_SERVERS', 'type': 'host', 'addresses': ['192.168.50.10', '192.168.50.11', '192.168.50.12'], 'description': 'Servidores web internos', 'created_at': now_iso()},
        ])

    # Seed firewall rules
    if await db.firewall_rules.count_documents({}) == 0:
        await db.firewall_rules.insert_many([
            {'id': gen_id(), 'order': 0, 'enabled': True, 'action': 'allow', 'interface': 'LAN', 'direction': 'in', 'protocol': 'any', 'source': '192.168.1.0/24', 'source_port': 'any', 'destination': 'any', 'destination_port': 'any', 'description': 'Permitir LAN para qualquer destino', 'log': False, 'created_at': now_iso()},
            {'id': gen_id(), 'order': 1, 'enabled': True, 'action': 'allow', 'interface': 'WAN', 'direction': 'in', 'protocol': 'tcp', 'source': 'any', 'source_port': 'any', 'destination': '203.0.113.10', 'destination_port': '443', 'description': 'HTTPS público', 'log': True, 'created_at': now_iso()},
            {'id': gen_id(), 'order': 2, 'enabled': True, 'action': 'block', 'interface': 'WAN', 'direction': 'in', 'protocol': 'tcp', 'source': 'any', 'source_port': 'any', 'destination': 'any', 'destination_port': '22', 'description': 'Bloquear SSH externo', 'log': True, 'created_at': now_iso()},
            {'id': gen_id(), 'order': 3, 'enabled': True, 'action': 'block', 'interface': 'WAN', 'direction': 'in', 'protocol': 'any', 'source': 'BLOCKED_COUNTRIES', 'source_port': 'any', 'destination': 'any', 'destination_port': 'any', 'description': 'Bloquear redes suspeitas', 'log': True, 'created_at': now_iso()},
            {'id': gen_id(), 'order': 4, 'enabled': True, 'action': 'allow', 'interface': 'OPT1', 'direction': 'in', 'protocol': 'tcp', 'source': 'any', 'source_port': 'any', 'destination': 'WEB_SERVERS', 'destination_port': '80,443', 'description': 'Acesso web aos servidores', 'log': False, 'created_at': now_iso()},
            {'id': gen_id(), 'order': 5, 'enabled': False, 'action': 'allow', 'interface': 'LAN', 'direction': 'out', 'protocol': 'icmp', 'source': 'any', 'source_port': 'any', 'destination': 'any', 'destination_port': 'any', 'description': 'Permitir ping (desativada)', 'log': False, 'created_at': now_iso()},
        ])

    # Seed NAT rules
    if await db.nat_rules.count_documents({}) == 0:
        await db.nat_rules.insert_many([
            {'id': gen_id(), 'enabled': True, 'direction': 'inbound', 'interface': 'WAN', 'protocol': 'tcp', 'external_port': '443', 'internal_ip': '192.168.50.10', 'internal_port': '443', 'source': 'any', 'description': 'HTTPS para servidor web', 'created_at': now_iso()},
            {'id': gen_id(), 'enabled': True, 'direction': 'inbound', 'interface': 'WAN', 'protocol': 'tcp', 'external_port': '8080', 'internal_ip': '192.168.50.11', 'internal_port': '80', 'source': 'any', 'description': 'App interno para externo', 'created_at': now_iso()},
            {'id': gen_id(), 'enabled': False, 'direction': 'inbound', 'interface': 'WAN', 'protocol': 'udp', 'external_port': '51820', 'internal_ip': '192.168.1.5', 'internal_port': '51820', 'source': 'any', 'description': 'WireGuard (desativado)', 'created_at': now_iso()},
            {'id': gen_id(), 'enabled': True, 'direction': 'outbound', 'interface': 'WAN', 'protocol': 'any', 'external_port': '', 'internal_ip': '', 'internal_port': '', 'source': 'any', 'nat_to': 'masquerade', 'description': 'Auto outbound NAT (MASQUERADE) on WAN → eth0', 'created_at': now_iso()},
        ])

    # Seed block page config
    if await db.block_page_config.count_documents({}) == 0:
        await db.block_page_config.insert_one({
            'id': gen_id(),
            'title': 'Acesso bloqueado',
            'headline': 'Você foi bloqueado pelo firewall',
            'message': 'Sua conexão foi automaticamente bloqueada por violação da política de segurança desta rede. Se você acredita que isso é um engano, entre em contato com o administrador.',
            'contact_email': 'security@firewall.local',
            'support_url': '',
            'organization': 'Firewall Console',
            'reference_id_visible': True,
            'show_reason': True,
            'show_ip': True,
            'accent_color': '#f87171',
            'created_at': now_iso(),
        })

    # Seed VPN configs
    if await db.vpn_configs.count_documents({}) == 0:
        await db.vpn_configs.insert_many([
            {'id': gen_id(), 'type': 'wireguard', 'name': 'wg0', 'enabled': True, 'listen_port': 51820, 'subnet': '10.10.0.0/24', 'public_key': 'fXyL3pZQ4kK6G8NhE2sP1V9yFqUeWcRzAaSdFgHj8m=', 'peers': [
                {'id': gen_id(), 'name': 'Carlos-Laptop', 'public_key': 'aB1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4=', 'allowed_ips': '10.10.0.2/32', 'last_handshake': now_iso(), 'connected': True},
                {'id': gen_id(), 'name': 'Maria-Phone', 'public_key': 'pQ1rS2tU3vW4xY5zA6bC7dE8fG9hI0jK1lM2nO3pQ4=', 'allowed_ips': '10.10.0.3/32', 'last_handshake': now_iso(), 'connected': True},
                {'id': gen_id(), 'name': 'Office-Branch', 'public_key': 'wX1yZ2aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4=', 'allowed_ips': '10.10.0.4/32', 'last_handshake': now_iso(), 'connected': False},
            ], 'created_at': now_iso()},
            {'id': gen_id(), 'type': 'openvpn', 'name': 'ovpn-server', 'enabled': True, 'listen_port': 1194, 'subnet': '10.20.0.0/24', 'protocol': 'udp', 'cipher': 'AES-256-GCM', 'peers': [
                {'id': gen_id(), 'name': 'Remote-User-1', 'common_name': 'remote_user_1', 'allowed_ips': '10.20.0.2/32', 'connected': True, 'last_handshake': now_iso()},
                {'id': gen_id(), 'name': 'Remote-User-2', 'common_name': 'remote_user_2', 'allowed_ips': '10.20.0.3/32', 'connected': False, 'last_handshake': now_iso()},
            ], 'created_at': now_iso()},
        ])

    # Seed DHCP config
    if await db.dhcp_config.count_documents({}) == 0:
        await db.dhcp_config.insert_one({
            'id': gen_id(),
            'enabled': True,
            'interface': 'LAN',
            'subnet': '192.168.1.0/24',
            'range_start': '192.168.1.100',
            'range_end': '192.168.1.200',
            'gateway': '192.168.1.1',
            'dns_servers': ['192.168.1.1', '1.1.1.1'],
            'lease_time': 86400,
            'domain_name': 'firewall.local',
            'created_at': now_iso(),
        })

    # Seed DHCP leases
    if await db.dhcp_leases.count_documents({}) == 0:
        await db.dhcp_leases.insert_many([
            {'id': gen_id(), 'ip': '192.168.1.101', 'mac': '54:e1:ad:11:22:33', 'hostname': 'desktop-carlos', 'state': 'active', 'expires_at': now_iso(), 'created_at': now_iso()},
            {'id': gen_id(), 'ip': '192.168.1.102', 'mac': '8c:85:90:aa:bb:cc', 'hostname': 'iphone-maria', 'state': 'active', 'expires_at': now_iso(), 'created_at': now_iso()},
            {'id': gen_id(), 'ip': '192.168.1.103', 'mac': 'a8:5e:45:dd:ee:ff', 'hostname': 'macbook-joao', 'state': 'active', 'expires_at': now_iso(), 'created_at': now_iso()},
            {'id': gen_id(), 'ip': '192.168.1.104', 'mac': 'b8:27:eb:00:11:22', 'hostname': 'raspberry-pi', 'state': 'active', 'expires_at': now_iso(), 'created_at': now_iso()},
            {'id': gen_id(), 'ip': '192.168.1.150', 'mac': 'dc:a6:32:44:55:66', 'hostname': 'printer-office', 'state': 'static', 'expires_at': '', 'created_at': now_iso()},
        ])

    # Seed DNS config + records
    if await db.dns_config.count_documents({}) == 0:
        await db.dns_config.insert_one({
            'id': gen_id(),
            'enabled': True,
            'forwarders': ['1.1.1.1', '8.8.8.8'],
            'cache_size_mb': 256,
            'dnssec': True,
            'block_lists': ['malware', 'ads'],
            'created_at': now_iso(),
        })

    if await db.dns_records.count_documents({}) == 0:
        await db.dns_records.insert_many([
            {'id': gen_id(), 'name': 'firewall.local', 'type': 'A', 'value': '192.168.1.1', 'ttl': 3600, 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'web.local', 'type': 'A', 'value': '192.168.50.10', 'ttl': 3600, 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'mail.local', 'type': 'A', 'value': '192.168.50.20', 'ttl': 3600, 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'api.local', 'type': 'CNAME', 'value': 'web.local', 'ttl': 3600, 'created_at': now_iso()},
            {'id': gen_id(), 'name': 'firewall.local', 'type': 'MX', 'value': 'mail.local', 'ttl': 3600, 'created_at': now_iso()},
        ])
