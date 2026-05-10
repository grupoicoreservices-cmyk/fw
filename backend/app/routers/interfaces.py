from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso
from app.host_metrics import discover_interfaces, enabled as host_metrics_enabled

router = APIRouter(prefix='/interfaces', tags=['interfaces'])


class InterfaceIn(BaseModel):
    name: str
    device: str
    role: str = Field(pattern='^(wan|lan|opt)$')
    connection_type: str = Field(default='static', pattern='^(static|dhcp|pppoe)$')
    ipv4: str = ''
    gateway: str = ''
    dns_servers: List[str] = []
    mac: str = ''
    mtu: int = 1500
    enabled: bool = True
    description: str = ''
    # PPPoE
    pppoe_username: Optional[str] = ''
    pppoe_password: Optional[str] = ''
    pppoe_service: Optional[str] = ''


@router.get('/')
async def list_interfaces(user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.interfaces.find({}, {'_id': 0}).to_list(100)
    # Mask PPPoE password in list responses
    for it in items:
        if it.get('pppoe_password'):
            it['pppoe_password'] = '••••••••'
    return items


@router.get('/{iface_id}')
async def get_interface(iface_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    iface = await db.interfaces.find_one({'id': iface_id}, {'_id': 0})
    if not iface:
        raise HTTPException(status_code=404, detail='Interface não encontrada')
    if iface.get('pppoe_password'):
        iface['pppoe_password'] = '••••••••'
    return iface


@router.post('/')
async def create_interface(payload: InterfaceIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    if await db.interfaces.find_one({'name': payload.name}):
        raise HTTPException(status_code=400, detail='Interface já existe')
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'created_at': now_iso(), 'rx_bytes': 0, 'tx_bytes': 0, 'rx_mbps': 0, 'tx_mbps': 0})
    await db.interfaces.insert_one(doc)
    res = {**doc}
    res.pop('_id', None)
    if res.get('pppoe_password'):
        res['pppoe_password'] = '••••••••'
    return res


@router.put('/{iface_id}')
async def update_interface(iface_id: str, payload: InterfaceIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    update = payload.model_dump()
    # Don't overwrite stored password if frontend sent the masked placeholder
    if update.get('pppoe_password') in ('••••••••', None, ''):
        existing = await db.interfaces.find_one({'id': iface_id}, {'pppoe_password': 1})
        if existing:
            update['pppoe_password'] = existing.get('pppoe_password', '')
    res = await db.interfaces.update_one({'id': iface_id}, {'$set': update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Interface não encontrada')
    iface = await db.interfaces.find_one({'id': iface_id}, {'_id': 0})
    if iface and iface.get('pppoe_password'):
        iface['pppoe_password'] = '••••••••'
    return iface


@router.patch('/{iface_id}/toggle')
async def toggle_interface(iface_id: str, user: dict = Depends(require_role('admin'))):
    db = get_db()
    iface = await db.interfaces.find_one({'id': iface_id})
    if not iface:
        raise HTTPException(status_code=404, detail='Interface não encontrada')
    new_val = not iface.get('enabled', True)
    await db.interfaces.update_one({'id': iface_id}, {'$set': {'enabled': new_val}})
    return {'id': iface_id, 'enabled': new_val}


@router.delete('/{iface_id}')
async def delete_interface(iface_id: str, user: dict = Depends(require_role('admin'))):
    db = get_db()
    res = await db.interfaces.delete_one({'id': iface_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Interface não encontrada')
    return {'ok': True}


@router.post('/discover')
async def discover(user: dict = Depends(require_role('admin'))):
    """Auto-detect host network interfaces via psutil and add new ones to the DB."""
    if not host_metrics_enabled():
        raise HTTPException(status_code=400, detail='Auto-detecção desabilitada (HOST_METRICS_REAL=false ou psutil ausente)')
    db = get_db()
    detected = discover_interfaces()
    if not detected:
        return {'detected': 0, 'added': [], 'count': 0, 'note': 'Nenhuma interface detectada no host'}
    added = []
    for d in detected:
        existing = await db.interfaces.find_one({'device': d['device']})
        if existing:
            continue
        doc = {
            **d,
            'id': gen_id(),
            'connection_type': 'dhcp' if d.get('role') == 'wan' else 'static',
            'dns_servers': [],
            'pppoe_username': '',
            'pppoe_password': '',
            'pppoe_service': '',
            'created_at': now_iso(),
            'rx_bytes': 0,
            'tx_bytes': 0,
            'rx_mbps': 0,
            'tx_mbps': 0,
        }
        await db.interfaces.insert_one(doc)
        doc.pop('_id', None)
        if doc.get('pppoe_password'):
            doc['pppoe_password'] = '••••••••'
        added.append(doc)
    return {'detected': len(detected), 'added': added, 'count': len(added)}


@router.get('/export/netplan', response_class=PlainTextResponse)
async def export_netplan(user: dict = Depends(get_current_user)):
    """Generate netplan YAML for all configured interfaces (Ubuntu 24)."""
    db = get_db()
    interfaces = await db.interfaces.find({}, {'_id': 0}).to_list(100)
    return _generate_netplan_yaml(interfaces)


def _generate_netplan_yaml(interfaces: List[dict]) -> str:
    """Generate /etc/netplan/99-firewall-console.yaml content."""
    lines: List[str] = []
    lines.append('# Generated by Firewall Console for Ubuntu 24')
    lines.append('# Apply with:')
    lines.append('#   sudo cp 99-firewall-console.yaml /etc/netplan/')
    lines.append('#   sudo chmod 600 /etc/netplan/99-firewall-console.yaml')
    lines.append('#   sudo netplan try    # interactive, rolls back if no Enter in 120s')
    lines.append('#   sudo netplan apply  # apply immediately (RISK: may lose connectivity)')
    lines.append('')
    lines.append('network:')
    lines.append('  version: 2')
    lines.append('  renderer: networkd')

    ethernets = []
    pppoes_block = []

    for iface in interfaces:
        if not iface.get('enabled', True):
            continue
        conn = iface.get('connection_type', 'static')
        device = iface.get('device') or iface.get('name', '').lower()
        if conn == 'pppoe':
            # The underlying ethernet must exist with no IP
            ethernets.append((device, {'static': False, 'no_ip': True, 'mtu': iface.get('mtu', 1492)}))
            pppoes_block.append({
                'name': iface.get('name', device).lower(),
                'username': iface.get('pppoe_username', ''),
                'password': iface.get('pppoe_password', ''),
                'parent': device,
                'service': iface.get('pppoe_service', ''),
            })
        else:
            ethernets.append((device, {
                'static': conn == 'static',
                'dhcp': conn == 'dhcp',
                'addresses': [iface['ipv4']] if conn == 'static' and iface.get('ipv4') else [],
                'gateway': iface.get('gateway', ''),
                'dns': iface.get('dns_servers', []),
                'mtu': iface.get('mtu', 1500),
            }))

    if ethernets:
        lines.append('  ethernets:')
        for device, cfg in ethernets:
            lines.append(f'    {device}:')
            if cfg.get('no_ip'):
                lines.append('      dhcp4: false')
                lines.append('      dhcp6: false')
            elif cfg.get('dhcp'):
                lines.append('      dhcp4: true')
            else:
                if cfg.get('addresses'):
                    lines.append('      addresses: ' + str([a for a in cfg['addresses'] if a]))
                if cfg.get('gateway'):
                    lines.append('      routes:')
                    lines.append(f'        - to: default')
                    lines.append(f'          via: {cfg["gateway"]}')
                if cfg.get('dns'):
                    lines.append('      nameservers:')
                    lines.append(f'        addresses: {list(cfg["dns"])}')
            if cfg.get('mtu'):
                lines.append(f'      mtu: {cfg["mtu"]}')

    if pppoes_block:
        lines.append('  ppp:')
        for p in pppoes_block:
            lines.append(f'    {p["name"]}:')
            lines.append(f'      parent: {p["parent"]}')
            lines.append(f'      username: "{p["username"]}"')
            if p.get('password'):
                lines.append(f'      password: "{p["password"]}"')
            if p.get('service'):
                lines.append(f'      service-name: "{p["service"]}"')
            lines.append('      mtu: 1492')
            lines.append('      auth-eap: false')

    return '\n'.join(lines) + '\n'
