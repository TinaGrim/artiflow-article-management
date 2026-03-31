
from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database


async def create_category(category_data: dict) -> dict:
    db = get_database()
    
    existing = await db.categories.find_one({"slug": category_data["slug"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this slug already exists"
        )
    
    category_doc = {
        "name": category_data["name"],
        "slug": category_data["slug"],
        "description": category_data.get("description"),
        "created_at": datetime.utcnow()
    }
    
    result = await db.categories.insert_one(category_doc)
    category_doc["_id"] = result.inserted_id
    
    return format_category(category_doc)


async def get_category_by_id(category_id: str) -> Optional[dict]:
    db = get_database()
    try:
        category = await db.categories.find_one({"_id": ObjectId(category_id)})
        return format_category(category) if category else None
    except:
        return None


async def get_category_by_slug(slug: str) -> Optional[dict]:
    db = get_database()
    category = await db.categories.find_one({"slug": slug})
    return format_category(category) if category else None


async def get_all_categories() -> list:
    db = get_database()
    cursor = db.categories.find().sort("name", 1)
    categories = []
    async for category in cursor:
        categories.append(format_category(category))
    return categories


async def update_category(category_id: str, update_data: dict) -> dict:
    db = get_database()
    
    result = await db.categories.find_one_and_update(
        {"_id": ObjectId(category_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return format_category(result)


async def delete_category(category_id: str) -> bool:
    db = get_database()
    
    result = await db.categories.delete_one({"_id": ObjectId(category_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return True


def format_category(category: dict) -> dict:
    if not category:
        return None
    category["id"] = str(category.pop("_id"))
    return category
