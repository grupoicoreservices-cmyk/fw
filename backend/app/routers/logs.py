from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix='/logs', tags=['logs'])


@router.get('/')
async def list_logs(
    severity: Optional[str] = None,
    interface: Optional[str] = None,
    action: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    query: dict = {}
    if severity and severity != 'all':
        query['severity'] = severity
    if interface and interface != 'all':
        query['interface'] = interface
    if action and action != 'all':
        query['action'] = action
    if q:
        query['message'] = {'$regex': q, '$options': 'i'}
    items = await db.logs.find(query, {'_id': 0}).sort('ts', -1).limit(max(1, min(500, limit))).to_list(500)
    return {'items': items}
