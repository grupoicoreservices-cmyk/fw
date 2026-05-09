from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from app.db import get_db
from app.security import get_current_user, require_role, hash_password
from app.utils import gen_id, now_iso

router = APIRouter(prefix='/users', tags=['users'])


class UserCreate(BaseModel):
    email: str
    name: str
    role: str = Field(pattern='^(admin|operator|viewer)$')
    password: str = Field(min_length=6)
    enabled: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern='^(admin|operator|viewer)$')
    password: Optional[str] = None
    enabled: Optional[bool] = None


@router.get('/')
async def list_users(user: dict = Depends(get_current_user)):
    db = get_db()
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(500)
    return users


@router.post('/')
async def create_user(payload: UserCreate, user: dict = Depends(require_role('admin'))):
    db = get_db()
    exists = await db.users.find_one({'email': payload.email.lower()})
    if exists:
        raise HTTPException(status_code=400, detail='E-mail já cadastrado')
    doc = {
        'id': gen_id(),
        'email': payload.email.lower(),
        'name': payload.name,
        'role': payload.role,
        'password_hash': hash_password(payload.password),
        'enabled': payload.enabled,
        'created_at': now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop('_id', None)
    return {k: v for k, v in doc.items() if k != 'password_hash'}


@router.put('/{user_id}')
async def update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_role('admin'))):
    db = get_db()
    update = {}
    if payload.name is not None:
        update['name'] = payload.name
    if payload.role is not None:
        update['role'] = payload.role
    if payload.enabled is not None:
        update['enabled'] = payload.enabled
    if payload.password:
        update['password_hash'] = hash_password(payload.password)
    if not update:
        raise HTTPException(status_code=400, detail='Nada a atualizar')
    res = await db.users.update_one({'id': user_id}, {'$set': update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    full = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    return full


@router.delete('/{user_id}')
async def delete_user(user_id: str, user: dict = Depends(require_role('admin'))):
    db = get_db()
    if user['sub'] == user_id:
        raise HTTPException(status_code=400, detail='Não é possível excluir o próprio usuário')
    res = await db.users.delete_one({'id': user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return {'ok': True}
