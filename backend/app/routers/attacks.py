from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/attacks', tags=['attacks'])

BLOCKED_ALIAS_NAME = 'BLOCKED_ATTACKERS'


class BlockIn(BaseModel):
    ip: str
    hostname: Optional[str] = ''
    reason: Optional[str] = ''
    redirect_to_block_page: bool = True


class UnblockIn(BaseModel):
    ip: str


def _is_internal(ip: str) -> bool:
    if not ip:
        return False
    parts = ip.split('.')
    if len(parts) != 4:
        return False
    try:
        a, b = int(parts[0]), int(parts[1])
    except ValueError:
        return False
    if a == 10:
        return True
    if a == 192 and b == 168:
        return True
    if a == 172 and 16 <= b <= 31:
        return True
    return False


@router.get('/')
async def list_attacks(
    direction: Optional[str] = Query(None, description='internal|external|all'),
    severity: Optional[str] = Query(None),
    minutes: int = Query(15, ge=1, le=120),
    user: dict = Depends(get_current_user),
):
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    query = {'action': 'block', 'ts': {'$gte': cutoff}}
    if severity and severity != 'all':
        query['severity'] = severity

    items = await db.logs.find(query, {'_id': 0}).sort('ts', -1).to_list(2000)

    # Aggregate by source IP
    grouped = defaultdict(lambda: {
        'src_ip': None,
        'src_hostname': '',
        'src_country': '',
        'src_flag': '',
        'direction': 'external',
        'severity_max': 'info',
        'attack_types': set(),
        'count': 0,
        'targets': set(),
        'first_seen': None,
        'last_seen': None,
        'sample_message': '',
    })

    severity_rank = {'info': 0, 'warning': 1, 'critical': 2}

    for log in items:
        ip = log.get('src_ip')
        if not ip:
            continue
        agg = grouped[ip]
        agg['src_ip'] = ip
        agg['src_hostname'] = log.get('src_hostname') or agg['src_hostname']
        agg['src_country'] = log.get('src_country') or agg['src_country']
        agg['src_flag'] = log.get('src_flag') or agg['src_flag']
        agg['direction'] = 'internal' if _is_internal(ip) else 'external'
        if severity_rank.get(log.get('severity', 'info'), 0) >= severity_rank.get(agg['severity_max'], 0):
            agg['severity_max'] = log['severity']
            agg['sample_message'] = log.get('message', '')
        if log.get('attack_type'):
            agg['attack_types'].add(log['attack_type'])
        agg['count'] += 1
        if log.get('dst_ip'):
            agg['targets'].add(f"{log['dst_ip']}:{log.get('port', '')}")
        ts = log.get('ts')
        if ts:
            if not agg['first_seen'] or ts < agg['first_seen']:
                agg['first_seen'] = ts
            if not agg['last_seen'] or ts > agg['last_seen']:
                agg['last_seen'] = ts

    # Get blocked alias addresses
    blocked_alias = await db.aliases.find_one({'name': BLOCKED_ALIAS_NAME})
    blocked_set = set((blocked_alias or {}).get('addresses', []))

    out = []
    for ip, v in grouped.items():
        if direction and direction != 'all' and v['direction'] != direction:
            continue
        out.append({
            **v,
            'attack_types': sorted(v['attack_types']),
            'targets': sorted(list(v['targets']))[:5],
            'is_blocked': ip in blocked_set,
        })

    out.sort(key=lambda x: (severity_rank.get(x['severity_max'], 0), x['count']), reverse=True)
    return {'items': out, 'total': len(out), 'window_minutes': minutes}


@router.get('/summary')
async def attacks_summary(user: dict = Depends(get_current_user)):
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    items = await db.logs.find(
        {'action': 'block', 'ts': {'$gte': cutoff}}, {'_id': 0, 'src_ip': 1, 'attack_type': 1, 'severity': 1}
    ).to_list(5000)

    unique_attackers = {l.get('src_ip') for l in items if l.get('src_ip')}
    type_counts = defaultdict(int)
    severity_counts = defaultdict(int)
    for l in items:
        if l.get('attack_type'):
            type_counts[l['attack_type']] += 1
        if l.get('severity'):
            severity_counts[l['severity']] += 1

    blocked_alias = await db.aliases.find_one({'name': BLOCKED_ALIAS_NAME})
    blocked_count = len((blocked_alias or {}).get('addresses', []))

    return {
        'unique_attackers': len(unique_attackers),
        'total_blocked_events': len(items),
        'attack_types': dict(type_counts),
        'severity_counts': dict(severity_counts),
        'currently_blocked_ips': blocked_count,
        'window_minutes': 15,
    }


@router.post('/block')
async def block_attacker(payload: BlockIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    ip = payload.ip.strip()
    if not ip:
        raise HTTPException(status_code=400, detail='IP obrigatório')

    # 1) Add IP to BLOCKED_ATTACKERS alias (create if missing)
    alias = await db.aliases.find_one({'name': BLOCKED_ALIAS_NAME})
    if not alias:
        alias_doc = {
            'id': gen_id(),
            'name': BLOCKED_ALIAS_NAME,
            'type': 'host',
            'addresses': [ip],
            'description': 'IPs bloqueados via Análise de Ataques',
            'created_at': now_iso(),
        }
        await db.aliases.insert_one(alias_doc)
    else:
        addrs = list(alias.get('addresses') or [])
        if ip not in addrs:
            addrs.append(ip)
            await db.aliases.update_one({'id': alias['id']}, {'$set': {'addresses': addrs}})

    # 2) Ensure a firewall rule exists referencing this alias
    rule_exists = await db.firewall_rules.find_one({'source': BLOCKED_ALIAS_NAME, 'action': 'block'})
    created_rule = None
    if not rule_exists:
        last = await db.firewall_rules.find({}, {'order': 1}).sort('order', -1).limit(1).to_list(1)
        next_order = (last[0]['order'] + 1) if last else 0
        created_rule = {
            'id': gen_id(),
            'order': next_order,
            'enabled': True,
            'action': 'block',
            'interface': 'WAN',
            'direction': 'in',
            'protocol': 'any',
            'source': BLOCKED_ALIAS_NAME,
            'source_port': 'any',
            'destination': 'any',
            'destination_port': 'any',
            'description': 'Auto-block: IPs identificados como atacantes',
            'log': True,
            'created_at': now_iso(),
        }
        await db.firewall_rules.insert_one(created_rule)
        created_rule.pop('_id', None)

    # 3) Optional: create a NAT redirect to block page port (for inbound HTTP/HTTPS)
    nat_rule = None
    if payload.redirect_to_block_page:
        existing_redirect = await db.nat_rules.find_one({'description': f'Redirect blocked {ip} to block page'})
        if not existing_redirect:
            nat_rule = {
                'id': gen_id(),
                'enabled': True,
                'direction': 'inbound',
                'interface': 'WAN',
                'protocol': 'tcp',
                'external_port': '80',
                'internal_ip': '127.0.0.1',
                'internal_port': '8080',
                'description': f'Redirect blocked {ip} to block page',
                'source': ip,
                'created_at': now_iso(),
            }
            await db.nat_rules.insert_one(nat_rule)
            nat_rule.pop('_id', None)

    return {
        'ok': True,
        'ip': ip,
        'rule_created': bool(created_rule),
        'redirect_created': bool(nat_rule),
        'reason': payload.reason,
    }


@router.post('/unblock')
async def unblock_attacker(payload: UnblockIn, user: dict = Depends(require_role('admin', 'operator'))):
    db = get_db()
    ip = payload.ip.strip()
    alias = await db.aliases.find_one({'name': BLOCKED_ALIAS_NAME})
    if alias:
        addrs = [a for a in (alias.get('addresses') or []) if a != ip]
        await db.aliases.update_one({'id': alias['id']}, {'$set': {'addresses': addrs}})
    # Remove redirect if present
    await db.nat_rules.delete_many({'description': f'Redirect blocked {ip} to block page'})
    return {'ok': True, 'ip': ip}


@router.get('/blocked-list')
async def blocked_list(user: dict = Depends(get_current_user)):
    db = get_db()
    alias = await db.aliases.find_one({'name': BLOCKED_ALIAS_NAME})
    return {'addresses': (alias or {}).get('addresses', [])}
