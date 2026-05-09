from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/interfaces', tags=['interfaces'])


class InterfaceIn(BaseModel):
    name: str
    device: str
    role: str = Field(pattern='^(wan|lan|opt)$')
    ipv4: str
    gateway: str = ''
    mac: str = ''
    mtu: int = 1500
    enabled: bool = True
    description: str = ''


@router.get('/')
async def list_interfaces(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.interfaces.find({}, {'_id': 0}).to_list(100)


@router.post('/')
async def create_interface(payload: InterfaceIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    if await db.interfaces.find_one({'name': payload.name}):
        raise HTTPException(status_code=400, detail='Interface já existe')
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'created_at': now_iso(), 'rx_bytes': 0, 'tx_bytes': 0, 'rx_mbps': 0, 'tx_mbps': 0})
    await db.interfaces.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{iface_id}')
async def update_interface(iface_id: str, payload: InterfaceIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    res = await db.interfaces.update_one({'id': iface_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Interface não encontrada')
    return await db.interfaces.find_one({'id': iface_id}, {'_id': 0})


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
