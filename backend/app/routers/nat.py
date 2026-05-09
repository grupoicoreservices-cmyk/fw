from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/nat', tags=['nat'])


class NatIn(BaseModel):
    enabled: bool = True
    interface: str
    protocol: str = Field(pattern='^(tcp|udp|tcp/udp)$')
    external_port: str
    internal_ip: str
    internal_port: str
    description: str = ''


@router.get('/')
async def list_nat(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.nat_rules.find({}, {'_id': 0}).to_list(500)


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
