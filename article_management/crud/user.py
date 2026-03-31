from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database
from models.user import UserModel
from utils.auth import hash_password


async def create_user(user_data: dict) -> dict:
    db = get_database()
    existing_user = await db.users.find_one({"username": user_data["username"]})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user_doc = {
        "username": user_data["username"],
        "password_hash": hash_password(user_data["password"]),
        "full_name": user_data["full_name"],
        "avatar_url": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    return format_user(user_doc)


async def get_user_by_username(username: str) -> Optional[dict]:
    db = get_database()
    user = await db.users.find_one({"username": username})
    return format_user(user) if user else None


async def get_user_by_id(user_id: str) -> Optional[str]:
    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        return format_user(user) if user else None
    except:
        return None


async def get_user_by_email(email: str) -> Optional[dict]:
    db = get_database()
    user = await db.users.find_one({"email": email})
    return format_user(user) if user else None


async def update_user(user_id: str, update_data: dict) -> dict:
    db = get_database()
    update_data["updated_at"] = datetime.utcnow()

    result = await db.users.find_one_and_update(
        {"_id": ObjectId(user_id)}, {"$set": update_data}, return_document=True
    )
    if not result:
        raise HTTPException(status=404, detail="User not found")
    return format_user(result)


def format_user(user: dict) -> dict:
    if not user:
        return None
    user["id"] = str(user.pop("_id"))
    return user
