from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status

from schemas.article import (
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    ArticleListResponse,
)
from crud.article import (
    create_article,
    get_article_by_slug,
    get_article_by_id,
    get_articles,
    update_article,
    delete_article,
    search_articles,
    increment_view_count,
)
from utils.auth import get_current_user
from utils.pagination import get_pagination_params, paginated_response

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    tags: Optional[str] = None,
    author: Optional[str] = None,
):
    skip, limit = get_pagination_params(page, limit)

    tag_list = tags.split(",") if tags else None

    articles, total = await get_articles(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category,
        author_id=author,
        tags=tag_list,
    )

    return paginated_response(articles, total, page, limit)


@router.get("/search", response_model=ArticleListResponse)
async def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    skip, limit = get_pagination_params(page, limit)
    articles, total = await search_articles(q, skip, limit)
    return paginated_response(articles, total, page, limit)


@router.get("/{slug}", response_model=ArticleResponse)
async def get_article(slug: str):
    article = await get_article_by_slug(slug)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    await increment_view_count(article["id"])
    return article


@router.post("", response_model=ArticleResponse, status_code=201)
async def create(
    article: ArticleCreate, current_user: dict = Depends(get_current_user)
):
    article_dict = article.model_dump()
    return await create_article(article_dict, current_user["id"])


@router.post("/anonymous", response_model=ArticleResponse, status_code=201)
async def create_anonymous(article: ArticleCreate):
    article_dict = article.model_dump()
    return await create_article(article_dict, None)


@router.put("/{slug_or_id}", response_model=ArticleResponse)
async def update(
    slug_or_id: str,
    article: ArticleUpdate,
    current_user: dict = Depends(get_current_user),
):
    update_dict = {k: v for k, v in article.model_dump().items() if v is not None}
    return await update_article(slug_or_id, update_dict, current_user["id"])


@router.delete("/{article_id}", status_code=204)
async def delete(article_id: str, current_user: dict = Depends(get_current_user)):
    await delete_article(article_id, current_user["id"])
    return None
