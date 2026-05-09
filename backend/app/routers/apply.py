from fastapi import APIRouter, Depends, HTTPException
from app.security import require_role, get_current_user
from app.system_apply import (
    apply_enabled,
    apply_nftables,
    rollback_last,
    flush_ruleset,
    get_current_ruleset,
    list_backups,
)
from app.db import get_db
from app.routers.export import generate_nftables
from app.utils import now_iso, gen_id

router = APIRouter(prefix='/apply', tags=['apply'])


@router.get('/status')
async def status(user: dict = Depends(get_current_user)):
    db = get_db()
    last = await db.apply_history.find({}, {'_id': 0}).sort('ts', -1).limit(1).to_list(1)
    return {
        'apply_enabled': apply_enabled(),
        'mode': 'real' if apply_enabled() else 'simulation',
        'last_apply': last[0] if last else None,
        'backups': list_backups(limit=10),
    }


@router.get('/current-ruleset')
async def current_ruleset(user: dict = Depends(require_role('admin', 'operator'))):
    return {
        'ruleset': get_current_ruleset(),
        'mode': 'real' if apply_enabled() else 'simulation',
    }


@router.post('/nftables')
async def apply_now(user: dict = Depends(require_role('admin'))):
    if not apply_enabled():
        raise HTTPException(status_code=400, detail='Aplicação real desativada (FIREWALL_APPLY_REAL=false). Use o Export para baixar e aplicar manualmente.')
    db = get_db()
    config_text = await generate_nftables(db)
    result = apply_nftables(config_text)
    record = {
        'id': gen_id(),
        'ts': now_iso(),
        'user': user.get('email'),
        'ok': result.get('ok', False),
        'backup': result.get('backup'),
        'error': result.get('error'),
        'config_path': result.get('config_path'),
    }
    await db.apply_history.insert_one(record)
    if not result.get('ok'):
        raise HTTPException(status_code=500, detail=result)
    return {**result, 'history_id': record['id']}


@router.post('/rollback')
async def rollback(user: dict = Depends(require_role('admin'))):
    if not apply_enabled():
        raise HTTPException(status_code=400, detail='Aplicação real desativada')
    db = get_db()
    res = rollback_last()
    await db.apply_history.insert_one({
        'id': gen_id(),
        'ts': now_iso(),
        'user': user.get('email'),
        'action': 'rollback',
        'ok': res.get('ok', False),
        'restored_from': res.get('restored_from'),
        'error': res.get('error'),
    })
    if not res.get('ok'):
        raise HTTPException(status_code=500, detail=res)
    return res


@router.post('/flush')
async def flush(user: dict = Depends(require_role('admin'))):
    if not apply_enabled():
        raise HTTPException(status_code=400, detail='Aplicação real desativada')
    db = get_db()
    res = flush_ruleset()
    await db.apply_history.insert_one({
        'id': gen_id(),
        'ts': now_iso(),
        'user': user.get('email'),
        'action': 'flush',
        'ok': res.get('ok', False),
        'error': res.get('error'),
    })
    if not res.get('ok'):
        raise HTTPException(status_code=500, detail=res)
    return res


@router.get('/history')
async def history(limit: int = 30, user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.apply_history.find({}, {'_id': 0}).sort('ts', -1).limit(max(1, min(200, limit))).to_list(200)
    return {'items': items}
