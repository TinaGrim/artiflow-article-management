from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from database import get_database
from crud.user import get_user_by_id


async def create_article(article_data: dict, author_id: Optional[str]) -> dict:
    db = get_database()

    existing = await db.articles.find_one({"slug": article_data["slug"]})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Article with this slug already exists",
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
        "published_at": datetime.utcnow()
        if article_data.get("status") == "published"
        else None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.articles.insert_one(article_doc)
    article_doc["_id"] = result.inserted_id

    return await get_article_by_id(str(result.inserted_id))


async def get_article_by_id(article_id: str) -> Optional[dict]:
    db = get_database()
    try:
        article = await db.articles.find_one({"_id": ObjectId(article_id)})
        if article:
            return await format_article(article)
        # Fallback: search by iterating
        all_articles = await db.articles.find().to_list(1000)
        print(f"DEBUG: Searching for article_id: {article_id}")
        print(f"DEBUG: Total articles: {len(all_articles)}")
        for a in all_articles:
            aid = str(a.get("_id"))
            print(f"DEBUG: Comparing {article_id} with {aid}: {aid == article_id}")
            if aid == article_id:
                return await format_article(a)
        return None
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
    tags: Optional[List[str]] = None,
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

    article = await db.articles.find_one({"slug": article_id})
    if not article:
        all_articles = await db.articles.find().to_list(1000)
        for a in all_articles:
            if str(a.get("_id")) == article_id or a.get("slug") == article_id:
                article = a
                break
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if str(article["author_id"]) != author_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this article"
        )

    update_data["updated_at"] = datetime.utcnow()

    if (
        "status" in update_data
        and update_data["status"] == "published"
        and not article.get("published_at")
    ):
        update_data["published_at"] = datetime.utcnow()

    await db.articles.update_one({"_id": article["_id"]}, {"$set": update_data})

    return await get_article_by_slug(article["slug"])


async def delete_article(article_id: str, author_id: str) -> bool:
    db = get_database()

    article = await db.articles.find_one({"_id": ObjectId(article_id)})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    if str(article["author_id"]) != author_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this article"
        )

    await db.articles.delete_one({"_id": ObjectId(article_id)})
    return True


async def search_articles(query: str, skip: int = 0, limit: int = 10) -> tuple:
    db = get_database()

    search_query = {"$text": {"$search": query}}
    total = await db.articles.count_documents(search_query)

    cursor = (
        db.articles.find(search_query, {"score": {"$meta": "textScore"}})
        .sort([("score", {"$meta": "textScore"})])
        .skip(skip)
        .limit(limit)
    )

    articles = []
    async for article in cursor:
        articles.append(await format_article(article))

    return articles, total


async def increment_view_count(article_id: str):
    db = get_database()
    await db.articles.update_one(
        {"_id": ObjectId(article_id)}, {"$inc": {"view_count": 1}}
    )


async def format_article(article: dict) -> dict:
    if not article:
        return None

    db = get_database()
    article["id"] = str(article.pop("_id"))

    if article.get("author_id"):
        author = await get_user_by_id(article["author_id"])
        article["author_username"] = author["username"] if author else None

    if article.get("category_id"):
        all_cats = await db.categories.find().to_list(100)
        for c in all_cats:
            if str(c.get("_id")) == article["category_id"]:
                article["category_name"] = c.get("name")
                break
        else:
            article["category_name"] = None

    return article
