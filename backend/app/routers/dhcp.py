from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/dhcp', tags=['dhcp'])


class DhcpConfigIn(BaseModel):
    enabled: bool = True
    interface: str
    subnet: str
    range_start: str
    range_end: str
    gateway: str
    dns_servers: List[str] = []
    lease_time: int = 86400
    domain_name: str = 'firewall.local'


class LeaseIn(BaseModel):
    ip: str
    mac: str
    hostname: str = ''
    state: str = Field(default='static', pattern='^(active|expired|static)$')


@router.get('/config')
async def get_config(user: dict = Depends(get_current_user)):
    db = get_db()
    cfg = await db.dhcp_config.find_one({}, {'_id': 0})
    return cfg or {}


@router.put('/config')
async def update_config(payload: DhcpConfigIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    existing = await db.dhcp_config.find_one({})
    data = payload.model_dump()
    if existing:
        await db.dhcp_config.update_one({'id': existing['id']}, {'$set': data})
        cfg = await db.dhcp_config.find_one({'id': existing['id']}, {'_id': 0})
    else:
        data['id'] = gen_id()
        data['created_at'] = now_iso()
        await db.dhcp_config.insert_one(data)
        cfg = await db.dhcp_config.find_one({'id': data['id']}, {'_id': 0})
    return cfg


@router.get('/leases')
async def list_leases(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.dhcp_leases.find({}, {'_id': 0}).to_list(500)


@router.post('/leases')
async def create_lease(payload: LeaseIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'expires_at': now_iso(), 'created_at': now_iso()})
    await db.dhcp_leases.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.delete('/leases/{lease_id}')
async def delete_lease(lease_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.dhcp_leases.delete_one({'id': lease_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Lease não encontrado')
    return {'ok': True}
