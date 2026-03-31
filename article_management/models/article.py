from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ArticleModel(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(...,min_length=1, max_length=220)
    content: str = Field(...)
    featured_image: Optional[str] = None
    author_id: str
    category_i: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = Field(default="draft")
    view_count: int = Field(default=0)
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

