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
        "total_pages": (total + limit - 1) // limit,
    }
