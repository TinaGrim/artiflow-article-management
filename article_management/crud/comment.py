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
        "likes": 0,
        "liked_by": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
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
    from database import get_database

    db = get_database()
    cursor = db.comments.find({"article_id": article_id, "parent_id": None}).sort(
        "created_at", -1
    )

    comments = []
    async for comment in cursor:
        comment_id_str = str(comment["_id"])
        formatted = await format_comment(comment)
        formatted["replies"] = await get_replies(comment_id_str)
        comments.append(formatted)

    return comments, len(comments)


async def get_replies(parent_id: str) -> List[dict]:
    from database import get_database

    db = get_database()
    cursor = db.comments.find({"parent_id": parent_id}).sort("created_at", 1)
    replies = []
    async for reply in cursor:
        reply_id = reply["_id"]
        formatted = await format_comment(reply)
        formatted["replies"] = await get_replies(str(reply_id))
        replies.append(formatted)
    return replies


async def update_comment(comment_id: str, content: str, author_id: str) -> dict:
    db = get_database()

    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if str(comment["author_id"]) != author_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this comment"
        )

    await db.comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"content": content, "updated_at": datetime.utcnow()}},
    )

    return await get_comment_by_id(comment_id)


async def delete_comment(comment_id: str, author_id: str) -> bool:
    db = get_database()

    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if str(comment["author_id"]) != author_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this comment"
        )

    await db.comments.delete_one({"_id": ObjectId(comment_id)})
    return True


async def like_comment(comment_id: str, user_id: str) -> dict:
    db = get_database()

    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    liked_by = comment.get("liked_by", [])

    if user_id in liked_by:
        liked_by.remove(user_id)
    else:
        liked_by.append(user_id)

    await db.comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"liked_by": liked_by, "likes": len(liked_by)}},
    )

    return await get_comment_by_id(comment_id)


async def format_comment(comment: dict) -> dict:
    if not comment:
        return None

    comment["id"] = str(comment.pop("_id"))

    if comment.get("author_id"):
        comment["author_username"] = "Anonymous"

    if comment.get("replies") is None:
        comment["replies"] = []

    comment["likes"] = comment.get("likes", 0)
    comment["liked_by"] = comment.get("liked_by", [])

    return comment
