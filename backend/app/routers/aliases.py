from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/aliases', tags=['aliases'])


class AliasIn(BaseModel):
    name: str
    type: str = Field(pattern='^(host|network|port)$')
    addresses: List[str] = []
    description: str = ''


@router.get('/')
async def list_aliases(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.aliases.find({}, {'_id': 0}).to_list(500)


@router.post('/')
async def create_alias(payload: AliasIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    if await db.aliases.find_one({'name': payload.name}):
        raise HTTPException(status_code=400, detail='Alias já existe')
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'created_at': now_iso()})
    await db.aliases.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{alias_id}')
async def update_alias(alias_id: str, payload: AliasIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.aliases.update_one({'id': alias_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Alias não encontrado')
    return await db.aliases.find_one({'id': alias_id}, {'_id': 0})


@router.delete('/{alias_id}')
async def delete_alias(alias_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.aliases.delete_one({'id': alias_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Alias não encontrado')
    return {'ok': True}
