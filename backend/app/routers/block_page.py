from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.db import get_db
from app.security import get_current_user, require_role
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/block-page', tags=['block-page'])


class BlockPageIn(BaseModel):
    title: str
    headline: str
    message: str
    contact_email: Optional[str] = ''
    support_url: Optional[str] = ''
    organization: Optional[str] = ''
    reference_id_visible: bool = True
    show_reason: bool = True
    show_ip: bool = True
    accent_color: Optional[str] = '#f87171'


@router.get('/')
async def get_block_page_public(request: Request):
    """Public endpoint: returns block page config + visitor info. NO AUTH."""
    db = get_db()
    cfg = await db.block_page_config.find_one({}, {'_id': 0})
    if not cfg:
        cfg = {
            'title': 'Acesso bloqueado',
            'headline': 'Você foi bloqueado pelo firewall',
            'message': 'Sua conexão foi automaticamente bloqueada por violação da política de segurança desta rede.',
            'contact_email': 'security@firewall.local',
            'support_url': '',
            'organization': 'Firewall Console',
            'reference_id_visible': True,
            'show_reason': True,
            'show_ip': True,
            'accent_color': '#f87171',
        }
    # Visitor info
    client_ip = (request.headers.get('x-forwarded-for') or '').split(',')[0].strip() or (request.client.host if request.client else '')
    return {
        'config': cfg,
        'visitor': {
            'ip': client_ip,
            'reference_id': gen_id().split('-')[0].upper(),
            'timestamp': now_iso(),
        },
    }


@router.get('/admin')
async def get_block_page_admin(user: dict = Depends(get_current_user)):
    db = get_db()
    cfg = await db.block_page_config.find_one({}, {'_id': 0})
    return cfg or {}


@router.put('/admin')
async def update_block_page(payload: BlockPageIn, user: dict = Depends(require_role('admin'))):
    db = get_db()
    existing = await db.block_page_config.find_one({})
    data = payload.model_dump()
    if existing:
        await db.block_page_config.update_one({'id': existing['id']}, {'$set': data})
        return await db.block_page_config.find_one({'id': existing['id']}, {'_id': 0})
    data['id'] = gen_id()
    data['created_at'] = now_iso()
    await db.block_page_config.insert_one(data)
    return await db.block_page_config.find_one({'id': data['id']}, {'_id': 0})
