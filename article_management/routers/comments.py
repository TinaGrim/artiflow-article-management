from fastapi import APIRouter, Depends, HTTPException

from schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentListResponse,
)
from crud.comment import (
    create_comment,
    get_comment_by_id,
    get_comments_by_article,
    update_comment,
    delete_comment,
    like_comment,
)
from utils.auth import get_current_user

router = APIRouter(tags=["Comments"])


@router.get("/articles/{article_id}/comments", response_model=CommentListResponse)
async def get_comments(article_id: str):
    import logging

    logging.warning(f"GET comments called for article: {article_id}")
    comments, total = await get_comments_by_article(article_id)
    logging.warning(f"Returning {len(comments)} comments with replies")
    for c in comments:
        logging.warning(f"Comment {c['id']} has {len(c.get('replies', []))} replies")
    return CommentListResponse(comments=comments, total=total)


@router.post(
    "/articles/{article_id}/comments", response_model=CommentResponse, status_code=201
)
async def create(
    article_id: str,
    comment: CommentCreate,
    current_user: dict = Depends(get_current_user),
):
    comment_dict = comment.model_dump()
    comment_dict["article_id"] = article_id
    return await create_comment(comment_dict, current_user["id"])


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update(
    comment_id: str,
    comment: CommentUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await update_comment(comment_id, comment.content, current_user["id"])


@router.post("/comments/{comment_id}/like", response_model=CommentResponse)
async def like(comment_id: str, current_user: dict = Depends(get_current_user)):
    return await like_comment(comment_id, current_user["id"])


@router.delete("/comments/{comment_id}", status_code=204)
async def delete(comment_id: str, current_user: dict = Depends(get_current_user)):
    await delete_comment(comment_id, current_user["id"])
    return None
