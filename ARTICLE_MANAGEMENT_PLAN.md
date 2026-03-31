# Article Management System - Project Plan

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Local)
- **ODM**: Motor (async MongoDB driver)
- **Validation**: Pydantic v2
- **Authentication**: JWT (python-jose)
- **Password Hashing**: passlib[bcrypt]

---

## Project Structure

```
article_management/
├── main.py                    # FastAPI app entry
├── config.py                  # Environment/config
├── database.py                # MongoDB connection
├── models/                    # Pydantic models
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── schemas/                   # Request/Response schemas
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── crud/                      # Database operations
│   ├── user.py
│   ├── article.py
│   ├── category.py
│   └── comment.py
├── routers/                   # API endpoints
│   ├── __init__.py
│   ├── auth.py
│   ├── users.py
│   ├── articles.py
│   ├── categories.py
│   └── comments.py
├── utils/                     # Helpers
│   ├── __init__.py
│   ├── auth.py
│   └── pagination.py
├── requirements.txt
└── .env.example
```

---

## Database Schema (MongoDB Collections)

### 1. users

```json
{
  "_id": ObjectId,
  "username": "string (unique, indexed)",
  "email": "string (unique, indexed)",
  "password_hash": "string",
  "full_name": "string",
  "avatar_url": "string (optional)",
  "is_active": true,
  "created_at": DateTime,
  "updated_at": DateTime
}
```

### 2. categories

```json
{
  "_id": ObjectId,
  "name": "string (unique)",
  "slug": "string (unique, indexed)",
  "description": "string",
  "created_at": DateTime
}
```

### 3. articles

```json
{
  "_id": ObjectId,
  "title": "string (indexed)",
  "slug": "string (unique, indexed)",
  "content": "string",
  "featured_image": "string (optional)",
  "author_id": ObjectId (ref: users),
  "category_id": ObjectId (ref: categories),
  "tags": ["string"] (indexed),
  "status": "draft | published",
  "view_count": 0,
  "published_at": DateTime (optional),
  "created_at": DateTime,
  "updated_at": DateTime
}
```

### 4. comments

```json
{
  "_id": ObjectId,
  "article_id": ObjectId (ref: articles, indexed),
  "author_id": ObjectId (ref: users),
  "content": "string",
  "parent_id": ObjectId (ref: comments, for replies),
  "is_approved": true,
  "created_at": DateTime,
  "updated_at": DateTime
}
```

---

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, returns JWT token | No |
| POST | `/auth/refresh` | Refresh access token | Yes |

### Users (`/users`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user profile | Yes |
| PUT | `/users/me` | Update profile | Yes |
| GET | `/users/{id}` | Get user by ID | No |

### Articles (`/articles`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/articles` | List articles (paginated, filterable) | No |
| GET | `/articles/{slug}` | Get single article by slug | No |
| POST | `/articles` | Create article | Yes |
| PUT | `/articles/{id}` | Update article | Yes (author) |
| DELETE | `/articles/{id}` | Delete article | Yes (author) |
| GET | `/articles/search` | Full-text search | No |

**Query Parameters**: `page`, `limit`, `status`, `category`, `tags`, `author`

### Categories (`/categories`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/categories` | List all categories | No |
| GET | `/categories/{slug}` | Get category with articles | No |
| POST | `/categories` | Create category | Yes |
| PUT | `/categories/{id}` | Update category | Yes |
| DELETE | `/categories/{id}` | Delete category | Yes |

### Comments (`/comments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/articles/{id}/comments` | Get comments for article | No |
| POST | `/articles/{id}/comments` | Add comment | Yes |
| PUT | `/comments/{id}` | Update comment | Yes (author) |
| DELETE | `/comments/{id}` | Delete comment | Yes (author) |

---

## Key Implementation Details

### Authentication Flow

1. **Register**: Hash password with bcrypt, store user
2. **Login**: Verify password, generate JWT (access + refresh tokens)
3. **Protected routes**: Decode JWT, inject `current_user` into request

### Search Implementation

- MongoDB Text Index on `title` and `content`
- Use `$text` operator for search queries
- Sort by relevance score

### Pagination

```python
# Query params: page=1, limit=10
skip = (page - 1) * limit
articles = collection.find(query).skip(skip).limit(limit)
```

### Indexing Strategy

```python
# Text index for search
articles.create_index([("title", "text"), ("content", "text")])

# Performance indexes
articles.create_index("slug", unique=True)
articles.create_index("tags")
articles.create_index([("status", 1), ("created_at", -1)])
comments.create_index("article_id")
```

---

## Learning Milestones

1. **Phase 1**: Project setup, MongoDB connection, basic CRUD
2. **Phase 2**: Authentication with JWT
3. **Phase 3**: Article system with categories/tags
4. **Phase 4**: Search and pagination
5. **Phase 5**: Comments system
6. **Phase 6**: Indexing and performance optimization

---

## Setup Instructions

### 1. Install MongoDB (Local)

```bash
# Ubuntu
sudo apt update
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Create Virtual Environment

```bash
cd article_management
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 5. Run the Application

```bash
uvicorn main:app --reload
```

### 6. Access API Documentation

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>

---

## Environment Variables (.env)

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=article_management

SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Testing the API

### Register a User

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123","full_name":"John Doe"}'
```

### Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secret123"}'
```

### Create Article (with token)

```bash
curl -X POST "http://localhost:8000/articles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Post","slug":"my-first-post","content":"Hello world!","tags":["python","mongodb"]}'
```

---

## Important Tips for Learning

### MongoDB Best Practices

1. **Document Design**: Think in documents, not rows
2. **Embedding vs References**: Embed related data that's often accessed together
3. **Indexes**: Create indexes for frequently queried fields
4. **Aggregation**: Use aggregation pipeline for complex queries

### FastAPI Best Practices

1. **Async**: Use async/await for I/O operations
2. **Validation**: Let Pydantic handle validation
3. **Dependency Injection**: Use dependencies for auth, db connections
4. **Error Handling**: Use HTTPException for proper error responses

### Security Best Practices

1. **Password Hashing**: Always hash passwords, never store plain text
2. **JWT**: Use short-lived access tokens, longer-lived refresh tokens
3. **Input Validation**: Validate all user input with Pydantic
4. **Rate Limiting**: Consider adding rate limiting for sensitive endpoints
