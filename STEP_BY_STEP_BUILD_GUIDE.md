# Article Management System - Step by Step Build Guide

Build this project yourself to learn Python + MongoDB + FastAPI.

---

## Prerequisites

1. Python 3.10+
2. MongoDB installed and running
3. Basic Python knowledge

---

## Step 1: Project Setup

### 1.1 Create Folder Structure

```bash
mkdir article_management
cd article_management
mkdir models schemas crud routers utils
touch models/__init__.py schemas/__init__.py crud/__init__.py routers/__init__.py utils/__init__.py
```

### 1.2 Create requirements.txt

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
motor==3.3.2
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
python-dotenv==1.0.0
```

### 1.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 1.4 Create .env File

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=article_management
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Step 2: Configuration

### 2.1 Create config.py

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "article_management"
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
```

**What you learned:**

- Use `pydantic_settings.BaseSettings` to load from `.env`
- Class variables with type hints become config values

---

## Step 3: Database Connection

### 3.1 Create database.py

```python
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongo():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    await create_indexes()
    print(f"Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")


async def create_indexes():
    users = db.users
    await users.create_index("username", unique=True)
    await users.create_index("email", unique=True)

    categories = db.categories
    await categories.create_index("name", unique=True)
    await categories.create_index("slug", unique=True)

    articles = db.articles
    await articles.create_index("slug", unique=True)
    await articles.create_index("tags")
    await articles.create_index([("status", 1), ("created_at", -1)])
    await articles.create_index([("title", "text"), ("content", "text")])

    comments = db.comments
    await comments.create_index("article_id")


def get_database() -> AsyncIOMotorDatabase:
    return db
```

**What you learned:**

- `motor` is the async MongoDB driver for Python
- Global `client` and `db` variables for connection
- `create_index()` for performance optimization
- Text index for full-text search

---

## Step 4: Authentication Utilities

### 4.1 Create utils/auth.py

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from config import settings
from database import get_database

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return user
```

**What you learned:**

- `bcrypt` for secure password hashing
- `python-jose` for JWT token creation/validation
- `OAuth2PasswordBearer` for FastAPI auth dependency
- `Depends()` for dependency injection

---

## Step 5: Pagination Utility

### 5.1 Create utils/pagination.py

```python
from typing import Optional


def get_pagination_params(page: int = 1, limit: int = 10) -> tuple:
    skip = (page - 1) * limit
    return skip, limit


def paginated_response(items: list, total: int, page: int, limit: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }
```

---

## Step 6: User Model

### 6.1 Create models/user.py

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class UserModel(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password_hash: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

**What you learned:**

- Pydantic `BaseModel` for data validation
- `Field()` for field constraints
- `EmailStr` for email validation
- `datetime` with default factory

---

## Step 7: User Schemas

### 7.1 Create schemas/user.py

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
```

**What you learned:**

- Separate schemas for different operations (create, update, response)
- Input schemas validate incoming data
- Response schemas format outgoing data
- Use `...` for required fields

---

## Step 8: User CRUD

### 8.1 Create crud/user.py

```python
from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database
from models.user import UserModel
from utils.auth import hash_password


async def create_user(user_data: dict) -> dict:
    db = get_database()
    
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user_data["username"]},
            {"email": user_data["email"]}
        ]
    })
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    user_doc = {
        "username": user_data["username"],
        "email": user_data["email"],
        "password_hash": hash_password(user_data["password"]),
        "full_name": user_data.get("full_name"),
        "avatar_url": None,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    return format_user(user_doc)


async def get_user_by_username(username: str) -> Optional[dict]:
    db = get_database()
    user = await db.users.find_one({"username": username})
    return format_user(user) if user else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
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
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return format_user(result)


def format_user(user: dict) -> dict:
    if not user:
        return None
    user["id"] = str(user.pop("_id"))
    return user
```

**What you learned:**

- `$or` operator for checking multiple conditions
- `insert_one()`, `find_one()`, `find_one_and_update()` methods
- `ObjectId` for MongoDB ID conversion
- Helper function to format user data

---

## Step 9: Auth Router

### 9.1 Create routers/auth.py

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from schemas.user import UserCreate, TokenResponse, UserResponse, RefreshTokenRequest
from crud.user import create_user, get_user_by_username, get_user_by_id
from utils.auth import verify_password, create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user: UserCreate):
    user_dict = user.model_dump()
    return await create_user(user_dict)


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    refresh_token = create_refresh_token(data={"sub": user["id"]})
    
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    payload = decode_token(request.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    user = await get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
```

**What you learned:**

- `OAuth2PasswordRequestForm` for login endpoint
- `Depends()` for injecting auth dependency
- Return proper HTTP status codes (201 for create, 401 for auth errors)
- Prefix routes with `APIRouter(prefix=...)`

---

## Step 10: User Router

### 10.1 Create routers/users.py

```python
from fastapi import APIRouter, Depends, HTTPException, status

from schemas.user import UserResponse, UserUpdate
from crud.user import get_user_by_id, update_user
from utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    return await update_user(current_user["id"], update_dict)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## Step 11: Article Model

### 11.1 Create models/article.py

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ArticleModel(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=220)
    content: str = Field(...)
    featured_image: Optional[str] = None
    author_id: str
    category_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    status: str = Field(default="draft")  # draft, published
    view_count: int = Field(default=0)
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## Step 12: Article Schemas

### 12.1 Create schemas/article.py

```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=220)
    content: str
    featured_image: Optional[str] = None
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
    author_id: str
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
```

---

## Step 13: Article CRUD

### 13.1 Create crud/article.py

```python
from datetime import datetime
from typing import Optional, List, Dict
from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database
from crud.user import get_user_by_id


async def create_article(article_data: dict, author_id: str) -> dict:
    db = get_database()
    
    existing = await db.articles.find_one({"slug": article_data["slug"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Article with this slug already exists"
        )
    
    article_doc = {
        "title": article_data["title"],
        "slug": article_data["slug"],
        "content": article_data["content"],
        "featured_image": article_data.get("featured_image"),
        "author_id": author_id,
        "category_id": article_data.get("category_id"),
        "tags": article_data.get("tags", []),
        "status": article_data.get("status", "draft"),
        "view_count": 0,
        "published_at": datetime.utcnow() if article_data.get("status") == "published" else None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.articles.insert_one(article_doc)
    article_doc["_id"] = result.inserted_id
    
    return await get_article_by_id(str(result.inserted_id))


async def get_article_by_id(article_id: str) -> Optional[dict]:
    db = get_database()
    try:
        article = await db.articles.find_one({"_id": ObjectId(article_id)})
        return await format_article(article) if article else None
    except:
        return None


async def get_article_by_slug(slug: str) -> Optional[dict]:
    db = get_database()
    article = await db.articles.find_one({"slug": slug})
    return await format_article(article) if article else None


async def get_articles(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    author_id: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> tuple:
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    if category_id:
        query["category_id"] = category_id
    if author_id:
        query["author_id"] = author_id
    if tags:
        query["tags"] = {"$in": tags}
    
    total = await db.articles.count_documents(query)
    cursor = db.articles.find(query).sort("created_at", -1).skip(skip).limit(limit)
    
    articles = []
    async for article in cursor:
        articles.append(await format_article(article))
    
    return articles, total


async def update_article(article_id: str, update_data: dict, author_id: str) -> dict:
    db = get_database()
    
    article = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if str(article["author_id"]) != author_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this article")
    
    update_data["updated_at"] = datetime.utcnow()
    
    if "status" in update_data and update_data["status"] == "published" and not article.get("published_at"):
        update_data["published_at"] = datetime.utcnow()
    
    await db.articles.update_one(
        {"_id": ObjectId(article_id)},
        {"$set": update_data}
    )
    
    return await get_article_by_id(article_id)


async def delete_article(article_id: str, author_id: str) -> bool:
    db = get_database()
    
    article = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if str(article["author_id"]) != author_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this article")
    
    await db.articles.delete_one({"_id": ObjectId(article_id)})
    return True


async def search_articles(query: str, skip: int = 0, limit: int = 10) -> tuple:
    db = get_database()
    
    search_query = {"$text": {"$search": query}}
    total = await db.articles.count_documents(search_query)
    
    cursor = db.articles.find(
        search_query,
        {"score": {"$meta": "textScore"}}
    ).sort(
        [("score", {"$meta": "textScore"})]
    ).skip(skip).limit(limit)
    
    articles = []
    async for article in cursor:
        articles.append(await format_article(article))
    
    return articles, total


async def increment_view_count(article_id: str):
    db = get_database()
    await db.articles.update_one(
        {"_id": ObjectId(article_id)},
        {"$inc": {"view_count": 1}}
    )


async def format_article(article: dict) -> dict:
    if not article:
        return None
    
    article["id"] = str(article.pop("_id"))
    
    if article.get("author_id"):
        author = await get_user_by_id(article["author_id"])
        article["author_username"] = author["username"] if author else None
    
    if article.get("category_id"):
        category = await db.categories.find_one({"_id": ObjectId(article["category_id"])})
        article["category_name"] = category["name"] if category else None
    
    return article
```

---

## Step 14: Article Router

### 14.1 Create routers/articles.py

```python
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status

from schemas.article import ArticleCreate, ArticleUpdate, ArticleResponse, ArticleListResponse
from crud.article import (
    create_article, get_article_by_slug, get_article_by_id,
    get_articles, update_article, delete_article,
    search_articles, increment_view_count
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
    author: Optional[str] = None
):
    skip, limit = get_pagination_params(page, limit)
    
    tag_list = tags.split(",") if tags else None
    
    articles, total = await get_articles(
        skip=skip,
        limit=limit,
        status=status,
        category_id=category,
        author_id=author,
        tags=tag_list
    )
    
    return paginated_response(articles, total, page, limit)


@router.get("/search", response_model=ArticleListResponse)
async def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
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
    article: ArticleCreate,
    current_user: dict = Depends(get_current_user)
):
    article_dict = article.model_dump()
    return await create_article(article_dict, current_user["id"])


@router.put("/{article_id}", response_model=ArticleResponse)
async def update(
    article_id: str,
    article: ArticleUpdate,
    current_user: dict = Depends(get_current_user)
):
    update_dict = {k: v for k, v in article.model_dump().items() if v is not None}
    return await update_article(article_id, update_dict, current_user["id"])


@router.delete("/{article_id}", status_code=204)
async def delete(
    article_id: str,
    current_user: dict = Depends(get_current_user)
):
    await delete_article(article_id, current_user["id"])
    return None
```

---

## Step 15: Category Model & Schemas

### 15.1 Create models/category.py

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CategoryModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=110)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

### 15.2 Create schemas/category.py

```python
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
```

---

## Step 16: Category CRUD

### 16.1 Create crud/category.py

```python
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
```

---

## Step 17: Category Router

### 17.1 Create routers/categories.py

```python
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
```

---

## Step 18: Comment Model & Schemas

### 18.1 Create models/comment.py

```python
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
```

---

## Step 19: Comment CRUD

### 19.1 Create crud/comment.py

```python
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from fastapi import HTTPException, status

from database import get_database
from crud.user import get_user_by_id


async def create_comment(comment_data: dict, author_id: str) -> dict:
    db = get_database()
    
    article = await db.articles.find_one({"_id": ObjectId(comment_data["article_id"])})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    comment_doc = {
        "article_id": comment_data["article_id"],
        "author_id": author_id,
        "content": comment_data["content"],
        "parent_id": comment_data.get("parent_id"),
        "is_approved": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id
    
    return await get_comment_by_id(str(result.inserted_id))


async def get_comment_by_id(comment_id: str) -> Optional[dict]:
    db = get_database()
    try:
        comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
        return await format_comment(comment) if comment else None
    except:
        return None


async def get_comments_by_article(article_id: str) -> tuple:
    db = get_database()
    
    cursor = db.comments.find({
        "article_id": article_id,
        "parent_id": None
    }).sort("created_at", -1)
    
    comments = []
    async for comment in cursor:
        formatted = await format_comment(comment)
        formatted["replies"] = await get_replies(comment["_id"])
        comments.append(formatted)
    
    return comments, len(comments)


async def get_replies(parent_id: ObjectId) -> List[dict]:
    db = get_database()
    cursor = db.comments.find({"parent_id": str(parent_id)}).sort("created_at", 1)
    replies = []
    async for reply in cursor:
        formatted = await format_comment(reply)
        formatted["replies"] = await get_replies(reply["_id"])
        replies.append(formatted)
    return replies


async def update_comment(comment_id: str, content: str, author_id: str) -> dict:
    db = get_database()
    
    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if str(comment["author_id"]) != author_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    
    await db.comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"content": content, "updated_at": datetime.utcnow()}}
    )
    
    return await get_comment_by_id(comment_id)


async def delete_comment(comment_id: str, author_id: str) -> bool:
    db = get_database()
    
    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if str(comment["author_id"]) != author_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.comments.delete_one({"_id": ObjectId(comment_id)})
    return True


async def format_comment(comment: dict) -> dict:
    if not comment:
        return None
    
    comment["id"] = str(comment.pop("_id"))
    
    if comment.get("author_id"):
        author = await get_user_by_id(comment["author_id"])
        comment["author_username"] = author["username"] if author else None
    
    if comment.get("replies") is None:
        comment["replies"] = []
    
    return comment
```

---

## Step 20: Comment Router

### 20.1 Create routers/comments.py

```python
from fastapi import APIRouter, Depends, HTTPException

from schemas.comment import CommentCreate, CommentUpdate, CommentResponse, CommentListResponse
from crud.comment import (
    create_comment, get_comment_by_id,
    get_comments_by_article, update_comment, delete_comment
)
from utils.auth import get_current_user

router = APIRouter(tags=["Comments"])


@router.get("/articles/{article_id}/comments", response_model=CommentListResponse)
async def get_comments(article_id: str):
    comments, total = await get_comments_by_article(article_id)
    return CommentListResponse(comments=comments, total=total)


@router.post("/articles/{article_id}/comments", response_model=CommentResponse, status_code=201)
async def create(
    article_id: str,
    comment: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    comment_dict = comment.model_dump()
    comment_dict["article_id"] = article_id
    return await create_comment(comment_dict, current_user["id"])


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update(
    comment_id: str,
    comment: CommentUpdate,
    current_user: dict = Depends(get_current_user)
):
    return await update_comment(comment_id, comment.content, current_user["id"])


@router.delete("/comments/{comment_id}", status_code=204)
async def delete(comment_id: str, current_user: dict = Depends(get_current_user)):
    await delete_comment(comment_id, current_user["id"])
    return None
```

---

## Step 21: Main Application

### 21.1 Create main.py

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_to_mongo, close_mongo_connection
from routers import auth, users, articles, categories, comments


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="Article Management System",
    description="A full-featured article management API with authentication",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(articles.router)
app.include_router(categories.router)
app.include_router(comments.router)


@app.get("/")
async def root():
    return {"message": "Article Management System API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Step 22: Initialize **init**.py Files

### 22.1 Create all **init**.py files

```bash
# These files can be empty, they just make Python treat folders as packages
touch models/__init__.py schemas/__init__.py crud/__init__.py routers/__init__.py utils/__init__.py
```

---

## Step 23: Run the Application

### 23.1 Start the Server

```bash
# Make sure MongoDB is running first!
# Then start the server
uvicorn main:app --reload
```

### 23.2 Access Documentation

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>

---

## Testing Your API

### Register a User

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123","full_name":"John Doe"}'
```

### Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=john&password=secret123"
```

### Create Category (with token)

```bash
curl -X POST "http://localhost:8000/categories" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Technology","slug":"technology","description":"Tech articles"}'
```

### Create Article (with token)

```bash
curl -X POST "http://localhost:8000/articles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Post","slug":"my-first-post","content":"Hello world!","tags":["python","mongodb"],"status":"published","category_id":"CATEGORY_ID"}'
```

### Get Articles

```bash
curl "http://localhost:8000/articles?status=published&page=1&limit=10"
```

### Search Articles

```bash
curl "http://localhost:8000/articles/search?q=mongodb"
```

---

## Project Structure (Final)

```
article_management/
├── main.py
├── config.py
├── database.py
├── models/
│   ├── __init__.py
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── schemas/
│   ├── __init__.py
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── crud/
│   ├── __init__.py
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   ├── articles.py
│   ├── categories.py
│   └── comments.py
├── utils/
│   ├── __init__.py
│   ├── auth.py
│   └── pagination.py
├── .env
└── requirements.txt
```

---

## Common Errors & Solutions

### Error: "Connection refused"

MongoDB is not running. Start it with:

```bash
sudo systemctl start mongodb
# or
docker start mongodb
```

### Error: "SECRET_KEY not found"

Make sure you have a `.env` file with `SECRET_KEY=your-secret-key`

### Error: "ObjectId conversion"

When querying by ID, always use:

```python
from bson import ObjectId
await db.collection.find_one({"_id": ObjectId(user_id)})
```

### Error: "Validation error"

Check your Pydantic schema - field types and constraints must match

---

## Next Steps to Enhance

1. Add file upload for featured images
2. Implement rate limiting
3. Add admin role
4. Add email verification
5. Add pagination cursor-based instead of offset
6. Add caching with Redis
7. Write unit tests

---

Good luck with your learning journey! 🚀
