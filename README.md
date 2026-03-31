# ArtiFlow - Article Management System

![ArtiFlow Preview](preview.png)

A full-stack article management system built with FastAPI, MongoDB, Astro, and React.

## Features

- 📝 **Create & Manage Articles** - Rich content management with categories and tags
- 💬 **Comments & Replies** - Interactive commenting system with nested replies
- ❤️ **Reactions** - Like/heart reactions on comments
- 👤 **Authentication** - User registration and login with JWT
- 🔍 **Categories** - Organize articles by category
- 🌙 **Modern UI** - Beautiful, responsive design with animations

## Tech Stack

- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: Astro + React (SSR mode)
- **Database**: MongoDB Atlas
- **Deployment**: Railway (backend), Vercel (frontend)

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+
- MongoDB Atlas account (or local MongoDB)

### Backend Setup

```bash
cd article_management

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB connection string

# Run server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup

```bash
cd astro-frontend

# Install dependencies
npm install

# Create .env file
# PUBLIC_API_URL=http://localhost:8000

# Run development server
npm run dev
```

## Deployment

### Frontend → Vercel

```bash
cd astro-frontend
npm run build
npx vercel deploy --prod
```

### Backend → Railway

```bash
cd article_management
railway up
```

Or connect your GitHub repository to Railway for automatic deployments.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login user |
| GET | /articles | List articles |
| GET | /articles/{slug} | Get article by slug |
| POST | /articles | Create article |
| GET | /articles/{id}/comments | Get comments |
| POST | /articles/{id}/comments | Add comment |

## Project Structure

```
Article_Management_System/
├── article_management/     # FastAPI backend
│   ├── main.py            # App entry point
│   ├── database.py        # MongoDB connection
│   ├── crud/              # Database operations
│   ├── routers/           # API endpoints
│   ├── schemas/           # Pydantic models
│   └── utils/             # Auth utilities
├── astro-frontend/         # Astro + React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/          # API client
│   │   └── pages/        # Astro pages
│   └── astro.config.mjs
├── preview.png            # Preview image
└── AGENTS.md              # Developer guidelines
```

## License

MIT
