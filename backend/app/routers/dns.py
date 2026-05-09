from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/dns', tags=['dns'])


class DnsConfigIn(BaseModel):
    enabled: bool = True
    forwarders: List[str] = []
    cache_size_mb: int = 256
    dnssec: bool = True
    block_lists: List[str] = []


class DnsRecordIn(BaseModel):
    name: str
    type: str = Field(pattern='^(A|AAAA|CNAME|MX|TXT)$')
    value: str
    ttl: int = 3600


@router.get('/config')
async def get_config(user: dict = Depends(get_current_user)):
    db = get_db()
    cfg = await db.dns_config.find_one({}, {'_id': 0})
    return cfg or {}


@router.put('/config')
async def update_config(payload: DnsConfigIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    existing = await db.dns_config.find_one({})
    data = payload.model_dump()
    if existing:
        await db.dns_config.update_one({'id': existing['id']}, {'$set': data})
        return await db.dns_config.find_one({'id': existing['id']}, {'_id': 0})
    data['id'] = gen_id()
    data['created_at'] = now_iso()
    await db.dns_config.insert_one(data)
    return await db.dns_config.find_one({'id': data['id']}, {'_id': 0})


@router.get('/records')
async def list_records(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.dns_records.find({}, {'_id': 0}).to_list(500)


@router.post('/records')
async def create_record(payload: DnsRecordIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'created_at': now_iso()})
    await db.dns_records.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/records/{record_id}')
async def update_record(record_id: str, payload: DnsRecordIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.dns_records.update_one({'id': record_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Registro não encontrado')
    return await db.dns_records.find_one({'id': record_id}, {'_id': 0})


@router.delete('/records/{record_id}')
async def delete_record(record_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.dns_records.delete_one({'id': record_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Registro não encontrado')
    return {'ok': True}
