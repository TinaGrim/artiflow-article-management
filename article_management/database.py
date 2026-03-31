from enum import unique
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel
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
    await users.create_indexes([IndexModel([("username", ASCENDING)], unique=True)])

    categories = db.categories
    await categories.create_indexes([IndexModel([("name", ASCENDING)], unique=True)])
    await categories.create_indexes([IndexModel([("slug", ASCENDING)], unique=True)])

    articles = db.articles
    await articles.create_indexes([IndexModel([("slug", ASCENDING)], unique=True)])
    await articles.create_indexes([IndexModel([("tags", ASCENDING)])])
    await articles.create_indexes(
        [IndexModel([("status", ASCENDING), ("create_at", DESCENDING)])]
    )
    await articles.create_indexes([IndexModel([("title", TEXT), ("content", TEXT)])])
    comment = db.comment
    await comment.create_indexes([IndexModel([("articles_id", ASCENDING)])])


def get_database() -> AsyncIOMotorDatabase:
    return db
