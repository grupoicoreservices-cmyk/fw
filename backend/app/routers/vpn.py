from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/vpn', tags=['vpn'])


class VpnIn(BaseModel):
    type: str = Field(pattern='^(wireguard|openvpn)$')
    name: str
    enabled: bool = True
    listen_port: int = 51820
    subnet: str
    public_key: Optional[str] = None
    protocol: Optional[str] = None
    cipher: Optional[str] = None


class PeerIn(BaseModel):
    name: str
    public_key: Optional[str] = None
    common_name: Optional[str] = None
    allowed_ips: str
    connected: bool = False


@router.get('/')
async def list_vpn(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.vpn_configs.find({}, {'_id': 0}).to_list(200)


@router.post('/')
async def create_vpn(payload: VpnIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'peers': [], 'created_at': now_iso()})
    await db.vpn_configs.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{vpn_id}')
async def update_vpn(vpn_id: str, payload: VpnIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    res = await db.vpn_configs.update_one({'id': vpn_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='VPN não encontrada')
    return await db.vpn_configs.find_one({'id': vpn_id}, {'_id': 0})


@router.delete('/{vpn_id}')
async def delete_vpn(vpn_id: str, user: dict = Depends(require_role('admin'))):
    db = get_db()
    res = await db.vpn_configs.delete_one({'id': vpn_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='VPN não encontrada')
    return {'ok': True}


@router.post('/{vpn_id}/peers')
async def add_peer(vpn_id: str, payload: PeerIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    peer = payload.model_dump()
    peer['id'] = gen_id()
    peer['last_handshake'] = now_iso()
    res = await db.vpn_configs.update_one({'id': vpn_id}, {'$push': {'peers': peer}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='VPN não encontrada')
    return peer


@router.delete('/{vpn_id}/peers/{peer_id}')
async def remove_peer(vpn_id: str, peer_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.vpn_configs.update_one({'id': vpn_id}, {'$pull': {'peers': {'id': peer_id}}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='VPN não encontrada')
    return {'ok': True}
