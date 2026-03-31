from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, FileUrl


class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=220)
    content: str
    fearture_image: Optional[str] = None
    category_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = Field(default="draft")


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = Field(None, min_length=1, max_length=220)
    content: Optional[str] = None
    featured_image: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class ArticleResponse(BaseModel):
    id: str
    title: str
    slug: str
    content: str
    featured_image: Optional[str]
    author_id: Optional[str] = None
    author_username: Optional[str] = None
    category_id: Optional[str]
    category_name: Optional[str] = None
    tags: List[str]
    status: str
    view_count: int
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ArticleListResponse(BaseModel):
    items: List[ArticleResponse]
    total: int
    page: int
    limit: int
    total_pages: int
