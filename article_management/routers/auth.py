from os import access
from fastapi import APIRouter, Depends, HTTPException, responses, status
from fastapi.security import OAuth2PasswordRequestForm

from schemas.user import UserCreate, TokenResponse, UserResponse, RefreshTokenRequest
from crud.user import create_user, get_user_by_username, get_user_by_id
from utils.auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
async def register(user: UserCreate):
    user_dict = user.model_dump()
    new_user = await create_user(user_dict)
    access_token = create_access_token(data={"sub": new_user["id"]})
    refresh_token = create_refresh_token(data={"sub": new_user["id"]})
    return {
        "user": new_user,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = create_access_token(data={"sub": user["id"]})
    refresh_token = create_refresh_token(data={"sub": user["id"]})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    payload = decode_token(request.refresh_token)

    if payload.get("type") != "request":
        raise HTTPException(status_code=400, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)
