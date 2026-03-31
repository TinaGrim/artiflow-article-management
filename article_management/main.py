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
    lifespan=lifespan,
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
