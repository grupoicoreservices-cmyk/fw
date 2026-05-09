from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/nat', tags=['nat'])


class NatIn(BaseModel):
    enabled: bool = True
    direction: str = Field(default='inbound', pattern='^(inbound|outbound)$')
    interface: str
    protocol: str = Field(pattern='^(tcp|udp|tcp/udp|any)$')
    external_port: Optional[str] = ''
    internal_ip: Optional[str] = ''
    internal_port: Optional[str] = ''
    source: Optional[str] = 'any'
    nat_to: Optional[str] = ''
    description: str = ''


@router.get('/')
async def list_nat(direction: Optional[str] = None, user: dict = Depends(get_current_user)):
    db = get_db()
    q = {}
    if direction in ('inbound', 'outbound'):
        q['direction'] = direction
    return await db.nat_rules.find(q, {'_id': 0}).to_list(500)


@router.post('/')
async def create_nat(payload: NatIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'created_at': now_iso()})
    await db.nat_rules.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{rule_id}')
async def update_nat(rule_id: str, payload: NatIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.nat_rules.update_one({'id': rule_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='NAT não encontrada')
    return await db.nat_rules.find_one({'id': rule_id}, {'_id': 0})


@router.delete('/{rule_id}')
async def delete_nat(rule_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.nat_rules.delete_one({'id': rule_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='NAT não encontrada')
    return {'ok': True}


@router.post('/auto-outbound')
async def auto_outbound(user: dict = Depends(require_role('admin', 'operator'))):
    """Automatically create MASQUERADE outbound rules for every WAN interface."""
    db = get_db()
    interfaces = await db.interfaces.find({'role': 'wan', 'enabled': True}, {'_id': 0}).to_list(50)
    created = []
    for iface in interfaces:
        existing = await db.nat_rules.find_one({
            'direction': 'outbound',
            'interface': iface['name'],
            'protocol': 'any',
        })
        if existing:
            continue
        doc = {
            'id': gen_id(),
            'enabled': True,
            'direction': 'outbound',
            'interface': iface['name'],
            'protocol': 'any',
            'external_port': '',
            'internal_ip': '',
            'internal_port': '',
            'source': 'any',
            'nat_to': 'masquerade',
            'description': f'Auto outbound NAT (MASQUERADE) on {iface["name"]} → {iface["device"]}',
            'created_at': now_iso(),
        }
        await db.nat_rules.insert_one(doc)
        doc.pop('_id', None)
        created.append(doc)
    return {'created': created, 'count': len(created)}
