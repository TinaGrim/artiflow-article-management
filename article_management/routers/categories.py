
from fastapi import APIRouter, Depends, HTTPException, status

from schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithArticlesResponse
from crud.category import (
    create_category, get_category_by_slug, get_category_by_id,
    get_all_categories, update_category, delete_category
)
from crud.article import get_articles
from utils.auth import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories():
    return await get_all_categories()


@router.get("/{slug}", response_model=CategoryWithArticlesResponse)
async def get_category(slug: str, page: int = 1, limit: int = 10):
    category = await get_category_by_slug(slug)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    skip = (page - 1) * limit
    articles, total = await get_articles(
        skip=skip,
        limit=limit,
        category_id=category["id"]
    )
    
    return {
        "category": category,
        "articles": articles,
        "total": total
    }


@router.post("", response_model=CategoryResponse, status_code=201)
async def create(
    category: CategoryCreate,
    current_user: dict = Depends(get_current_user)
):
    return await create_category(category.model_dump())


@router.put("/{category_id}", response_model=CategoryResponse)
async def update(
    category_id: str,
    category: CategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_dict = {k: v for k, v in category.model_dump().items() if v is not None}
    return await update_category(category_id, update_dict)


@router.delete("/{category_id}", status_code=204)
async def delete(
    category_id: str,
    current_user: dict = Depends(get_current_user)
):
    await delete_category(category_id)
    return None
