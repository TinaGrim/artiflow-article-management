from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UserModel(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str
    full_name: Optional[str] = None
