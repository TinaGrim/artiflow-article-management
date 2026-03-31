
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CategoryModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=110)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
