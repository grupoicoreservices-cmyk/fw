from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/firewall-rules', tags=['firewall'])


class RuleIn(BaseModel):
    enabled: bool = True
    action: str = Field(pattern='^(allow|block|reject)$')
    interface: str
    direction: str = Field(default='in', pattern='^(in|out)$')
    protocol: str = Field(default='any')
    source: str = 'any'
    source_port: str = 'any'
    destination: str = 'any'
    destination_port: str = 'any'
    description: str = ''
    log: bool = False


class ReorderIn(BaseModel):
    ids: List[str]


@router.get('/')
async def list_rules(user: dict = Depends(get_current_user)):
    db = get_db()
    rules = await db.firewall_rules.find({}, {'_id': 0}).sort('order', 1).to_list(2000)
    return rules


@router.post('/')
async def create_rule(payload: RuleIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    last = await db.firewall_rules.find({}, {'order': 1}).sort('order', -1).limit(1).to_list(1)
    next_order = (last[0]['order'] + 1) if last else 0
    doc = payload.model_dump()
    doc.update({'id': gen_id(), 'order': next_order, 'created_at': now_iso()})
    await db.firewall_rules.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{rule_id}')
async def update_rule(rule_id: str, payload: RuleIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.firewall_rules.update_one({'id': rule_id}, {'$set': payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Regra não encontrada')
    return await db.firewall_rules.find_one({'id': rule_id}, {'_id': 0})


@router.patch('/{rule_id}/toggle')
async def toggle_rule(rule_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    rule = await db.firewall_rules.find_one({'id': rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail='Regra não encontrada')
    new_val = not rule.get('enabled', True)
    await db.firewall_rules.update_one({'id': rule_id}, {'$set': {'enabled': new_val}})
    return {'id': rule_id, 'enabled': new_val}


@router.delete('/{rule_id}')
async def delete_rule(rule_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.firewall_rules.delete_one({'id': rule_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Regra não encontrada')
    return {'ok': True}


@router.post('/reorder')
async def reorder_rules(payload: ReorderIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    for idx, rid in enumerate(payload.ids):
        await db.firewall_rules.update_one({'id': rid}, {'$set': {'order': idx}})
    rules = await db.firewall_rules.find({}, {'_id': 0}).sort('order', 1).to_list(2000)
    return rules
