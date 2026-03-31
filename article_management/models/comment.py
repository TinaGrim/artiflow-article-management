
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CommentModel(BaseModel):
    article_id: str
    author_id: str
    content: str = Field(..., min_length=1)
    parent_id: Optional[str] = None
    is_approved: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### 18.2 Create schemas/comment.py

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[str] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: str
    article_id: str
    author_id: str
    author_username: Optional[str] = None
    content: str
    parent_id: Optional[str]
    is_approved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]
    total: int
