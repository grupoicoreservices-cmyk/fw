from fastapi import APIRouter, Depends
from typing import Optional
from app.db import get_db
from app.security import get_current_user

router = APIRouter(prefix='/metrics', tags=['metrics'])


@router.get('/live')
async def live_metrics(limit: int = 60, user: dict = Depends(get_current_user)):
    db = get_db()
    samples = await db.metrics_samples.find({}, {'_id': 0}).sort('ts', -1).limit(max(1, min(200, limit))).to_list(200)
    samples.reverse()
    return {'samples': samples}


@router.get('/summary')
async def metrics_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    last = await db.metrics_samples.find({}, {'_id': 0}).sort('ts', -1).limit(1).to_list(1)
    last_doc = last[0] if last else {}
    rules_total = await db.firewall_rules.count_documents({})
    rules_active = await db.firewall_rules.count_documents({'enabled': True})
    nat_total = await db.nat_rules.count_documents({'enabled': True})
    interfaces_up = await db.interfaces.count_documents({'enabled': True})
    vpn_total = await db.vpn_configs.count_documents({'enabled': True})
    leases = await db.dhcp_leases.count_documents({})
    return {
        'current': last_doc,
        'rules_total': rules_total,
        'rules_active': rules_active,
        'nat_active': nat_total,
        'interfaces_up': interfaces_up,
        'vpn_active': vpn_total,
        'leases': leases,
    }
