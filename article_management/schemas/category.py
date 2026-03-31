
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=110)
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=110)
    description: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryWithArticlesResponse(BaseModel):
    category: CategoryResponse
    articles: List[dict]
    total: int
