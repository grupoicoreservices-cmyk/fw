from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso
from app.url_resolver import resolve_domains, flatten_ips

router = APIRouter(prefix='/url-filter', tags=['url-filter'])


class UrlFilterIn(BaseModel):
    name: str
    enabled: bool = True
    source: str = 'any'  # IP, CIDR, or alias name
    domains: List[str] = []
    action: str = Field(default='block', pattern='^(block|redirect)$')
    description: str = ''


@router.get('/')
async def list_filters(user: dict = Depends(get_current_user)):
    db = get_db()
    return await db.url_filters.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)


@router.post('/')
async def create_filter(payload: UrlFilterIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    domains_clean = [d.strip().lower() for d in payload.domains if d.strip()]
    if not domains_clean:
        raise HTTPException(status_code=400, detail='Informe ao menos um domínio')
    resolved = resolve_domains(domains_clean)
    flat_ips = flatten_ips(resolved)
    doc = payload.model_dump()
    doc.update({
        'id': gen_id(),
        'domains': domains_clean,
        'resolved': resolved,
        'resolved_ips': flat_ips,
        'last_resolved_at': now_iso(),
        'created_at': now_iso(),
    })
    await db.url_filters.insert_one(doc)
    doc.pop('_id', None)
    return doc


@router.put('/{filter_id}')
async def update_filter(filter_id: str, payload: UrlFilterIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    domains_clean = [d.strip().lower() for d in payload.domains if d.strip()]
    resolved = resolve_domains(domains_clean)
    flat_ips = flatten_ips(resolved)
    update = payload.model_dump()
    update.update({
        'domains': domains_clean,
        'resolved': resolved,
        'resolved_ips': flat_ips,
        'last_resolved_at': now_iso(),
    })
    res = await db.url_filters.update_one({'id': filter_id}, {'$set': update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='URL Filter não encontrado')
    return await db.url_filters.find_one({'id': filter_id}, {'_id': 0})


@router.patch('/{filter_id}/toggle')
async def toggle_filter(filter_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    f = await db.url_filters.find_one({'id': filter_id})
    if not f:
        raise HTTPException(status_code=404, detail='URL Filter não encontrado')
    new_val = not f.get('enabled', True)
    await db.url_filters.update_one({'id': filter_id}, {'$set': {'enabled': new_val}})
    return {'id': filter_id, 'enabled': new_val}


@router.delete('/{filter_id}')
async def delete_filter(filter_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    res = await db.url_filters.delete_one({'id': filter_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='URL Filter não encontrado')
    return {'ok': True}


@router.post('/{filter_id}/resolve')
async def resolve_now(filter_id: str, user: dict = Depends(require_role('admin', 'operator'))):
    """Re-resolve domains for this filter and update DB."""
    db = get_db()
    f = await db.url_filters.find_one({'id': filter_id})
    if not f:
        raise HTTPException(status_code=404, detail='URL Filter não encontrado')
    domains = f.get('domains', [])
    resolved = resolve_domains(domains)
    flat_ips = flatten_ips(resolved)
    await db.url_filters.update_one(
        {'id': filter_id},
        {'$set': {
            'resolved': resolved,
            'resolved_ips': flat_ips,
            'last_resolved_at': now_iso(),
        }},
    )
    return {'id': filter_id, 'resolved': resolved, 'resolved_ips': flat_ips, 'count': len(flat_ips)}


@router.post('/resolve-all')
async def resolve_all(user: dict = Depends(require_role('admin', 'operator'))):
    """Re-resolve domains for ALL active filters."""
    db = get_db()
    items = await db.url_filters.find({'enabled': True}).to_list(500)
    updated = 0
    total_ips = 0
    for f in items:
        domains = f.get('domains', [])
        if not domains:
            continue
        resolved = resolve_domains(domains)
        flat_ips = flatten_ips(resolved)
        await db.url_filters.update_one(
            {'id': f['id']},
            {'$set': {
                'resolved': resolved,
                'resolved_ips': flat_ips,
                'last_resolved_at': now_iso(),
            }},
        )
        updated += 1
        total_ips += len(flat_ips)
    return {'updated': updated, 'total_ips': total_ips}
