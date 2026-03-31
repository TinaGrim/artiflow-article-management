from fastapi import APIRouter, Depends, HTTPException, status

from schemas.user import UserResponse, UserUpdate
from crud.user import get_user_by_id, update_user
from utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
async def update_current_user(update_data: UserUpdate,current_user: dict = Depends(get_current_user)):
    update_dict = {k:v for k,v in update_data.model_dump().items() if v is not None}
    return await update_user(current_user["id"], update_dict)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


        
