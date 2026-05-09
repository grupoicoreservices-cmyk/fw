from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.db import get_db
from app.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix='/auth', tags=['auth'])


class LoginInput(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: dict


@router.post('/login', response_model=LoginResponse)
async def login(payload: LoginInput):
    db = get_db()
    user = await db.users.find_one({'email': payload.email.lower()}, {'_id': 0})
    if not user or not user.get('enabled', True):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    if not verify_password(payload.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    token = create_access_token({
        'sub': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user.get('name', ''),
    })
    safe_user = {k: v for k, v in user.items() if k != 'password_hash'}
    return {'access_token': token, 'token_type': 'bearer', 'user': safe_user}


@router.get('/me')
async def me(user: dict = Depends(get_current_user)):
    db = get_db()
    full = await db.users.find_one({'id': user['sub']}, {'_id': 0, 'password_hash': 0})
    if not full:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return full
