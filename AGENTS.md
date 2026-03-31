# ArtiFlow - Article Management System

## Project Overview

A full-stack article management system with:
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: Astro + React (SSR mode with Vercel adapter)
- **Deployment**: Railway (backend), Vercel (frontend)
- **Database**: MongoDB Atlas

## Directory Structure

```
Article_Management_System/
├── article_management/     # FastAPI backend
│   ├── main.py           # FastAPI app entry point
│   ├── database.py       # MongoDB connection
│   ├── config.py         # Settings (from .env)
│   ├── crud/             # Database operations
│   ├── routers/          # API endpoints
│   ├── schemas/          # Pydantic models
│   └── utils/            # Auth utilities
├── astro-frontend/        # Astro + React frontend
│   ├── src/
│   │   ├── components/  # React components (.jsx)
│   │   ├── lib/          # API client (api.js)
│   │   ├── layouts/      # Astro layouts
│   │   └── pages/        # Astro pages
│   └── astro.config.mjs  # Astro configuration
├── test_api.py            # Python API test script
└── requirements.txt       # Python dependencies
```

---

## Build & Run Commands

### Frontend (Astro + React)

```bash
cd astro-frontend

# Development
npm run dev          # Start dev server at http://localhost:4321

# Production build
npm run build        # Build for production
npm run preview     # Preview production build

# Deploy to Vercel
npx vercel deploy --prod
```

### Backend (FastAPI)

```bash
cd article_management

# Development
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Run tests
python test_api.py
```

### Deployment

```bash
# Frontend → Vercel
cd astro-frontend
npm run build
npx vercel deploy --prod

# Backend → Railway
cd article_management
railway up
```

---

## Environment Variables

### Backend (.env)
```
MONGODB_URL=mongodb+srv://...
DATABASE_NAME=article_management
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend
```
PUBLIC_API_URL=https://backend-production-xxx.up.railway.app
```

---

## Code Style Guidelines

### JavaScript/React (Frontend)

#### Imports - Group & Sort
```jsx
// ✅ Good - external packages → internal modules, alphabetically sorted
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home } from 'lucide-react';
import { articlesAPI, commentsAPI } from '../lib/api';

// ❌ Bad - random order
import { Home } from 'lucide-react';
import axios from 'axios';
```

#### Components
- Use functional components with hooks
- Use `React.memo` for expensive components
- Use inline styles with JS objects
- Always export as default

```jsx
const Card = memo(({ children, onClick }) => {
  return (
    <motion.div whileHover={{ scale: 1.05 }}>
      {children}
    </motion.div>
  );
});
Card.displayName = 'Card';
export default Card;
```

#### State & Effects
- Use `useRef` to prevent double initialization in React StrictMode
- Use `localStorage` for auth tokens

```jsx
const initRef = useRef(false);
useEffect(() => {
  if (initRef.current) return;
  initRef.current = true;
  // initialization code
}, []);
```

#### Error Handling
- Always wrap API calls in try/catch
- Log errors for debugging
- Handle 401 by clearing tokens

```jsx
try {
  const res = await articlesAPI.getAll();
  setData(res.data);
} catch (err) {
  console.error('API Error:', err);
  if (err?.response?.status === 401) {
    localStorage.removeItem('access_token');
  }
}
```

---

### Python (Backend)

#### Imports
```python
# Standard library → Third-party → Local
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from . import crud, schemas
```

#### Naming Conventions
- Functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Variables: `snake_case`

```python
def get_user_by_id(user_id: str) -> Optional[User]:
    MAX_RETRY_COUNT = 3
    access_token = request.headers.get("Authorization")
```

#### Async/Await
- Use `async def` for all FastAPI endpoints
- Use `await` for all database operations
- Never mix sync/async code

```python
@router.get("/articles")
async def get_articles(page: int = 1, limit: int = 10):
    articles = await crud.get_articles(skip=(page-1)*limit, limit=limit)
    return articles
```

#### Database Patterns
```python
# Query with proper async cursor
cursor = db.comments.find({"article_id": article_id, "parent_id": None})
comments = []
async for comment in cursor:
    formatted = await format_comment(comment)
    comments.append(formatted)

# Update with $set
await db.comments.update_one(
    {"_id": ObjectId(comment_id)},
    {"$set": {"field": value}},
)
```

---

## API Conventions

### Endpoints
- `GET /articles` - List articles (paginated)
- `GET /articles/{slug}` - Get article by slug
- `POST /articles` - Create article (auth required)
- `GET /articles/{id}/comments` - Get comments (public)
- `POST /articles/{id}/comments` - Create comment (auth required)

### Response Formats
- Success: Return data directly
- Pagination: `{items: [...], total: int, pages: int, page: int}`
- Errors: `{detail: string}`

### Authentication
- Login: `POST /auth/login` (form data: username, password)
- Register: `POST /auth/register` (JSON)
- Protected: Include `Authorization: Bearer <token>` header

---

## Common Issues

1. **Auth logging out on refresh**: Use `useRef` to prevent double init; check 401 handling
2. **Comments not showing**: Ensure `replies` field is in Pydantic schema
3. **Replies disappearing after refresh**: Fix `get_replies()` to use string ID for queries
4. **Railway not updating**: Sometimes need to trigger manual deploy in dashboard
5. **API 500 errors**: Check Railway logs; verify MongoDB connection

---

## Database Notes

- Uses MongoDB Atlas with connection string in config.py
- ObjectId fields must be converted to strings for JSON responses
- Parent-child comments use `parent_id` field (null = top-level)
- Always include default values for optional fields in schemas
