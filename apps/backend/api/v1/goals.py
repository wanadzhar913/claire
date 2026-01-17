"""Goals endpoints for managing user financial goals."""

from decimal import Decimal
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.models.goal import Goal
from backend.services.db.postgres_connector import database_service

router = APIRouter()

BannerKey = Literal["banner_1", "banner_2", "banner_3", "banner_4"]


# TODO: Implement proper authentication dependency
# For now, using a simple user_email query parameter (same pattern as file_uploads.py)
async def get_current_user_id(user_email: str = Query(...)) -> int:
    user = await database_service.get_user_by_email(user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.id


class GoalCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    target_amount: Decimal = Field(ge=0)
    target_year: int = Field(ge=1900, le=3000)
    target_month: int = Field(ge=1, le=12)
    current_saved: Decimal = Field(ge=0, default=Decimal("0.00"))
    banner_key: BannerKey


class GoalUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    target_amount: Optional[Decimal] = Field(default=None, ge=0)
    target_year: Optional[int] = Field(default=None, ge=1900, le=3000)
    target_month: Optional[int] = Field(default=None, ge=1, le=12)
    current_saved: Optional[Decimal] = Field(default=None, ge=0)
    banner_key: Optional[BannerKey] = None


class GoalResponse(BaseModel):
    id: str
    user_id: int
    name: str
    target_amount: Decimal
    current_saved: Decimal
    target_year: int
    target_month: int
    banner_key: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("", response_model=GoalResponse, tags=["Goals"])
async def create_goal(
    payload: GoalCreateRequest,
    user_id: int = Depends(get_current_user_id),
) -> GoalResponse:
    if payload.current_saved > payload.target_amount:
        raise HTTPException(status_code=400, detail="current_saved cannot exceed target_amount")

    goal = Goal(
        user_id=user_id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_saved=payload.current_saved,
        target_year=payload.target_year,
        target_month=payload.target_month,
        banner_key=payload.banner_key,
    )

    created = database_service.create_goal(goal)
    return GoalResponse(
        id=created.id,
        user_id=created.user_id,
        name=created.name,
        target_amount=created.target_amount,
        current_saved=created.current_saved,
        target_year=created.target_year,
        target_month=created.target_month,
        banner_key=created.banner_key,
        created_at=created.created_at.isoformat() if created.created_at else None,
    )


@router.get("", response_model=List[GoalResponse], tags=["Goals"])
async def list_goals(
    user_id: int = Depends(get_current_user_id),
    limit: Optional[int] = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    order_by: str = Query(default="created_at"),
    order_desc: bool = Query(default=True),
) -> List[GoalResponse]:
    goals = database_service.get_user_goals(
        user_id=user_id,
        limit=limit,
        offset=offset,
        order_by=order_by,
        order_desc=order_desc,
    )
    return [
        GoalResponse(
            id=g.id,
            user_id=g.user_id,
            name=g.name,
            target_amount=g.target_amount,
            current_saved=g.current_saved,
            target_year=g.target_year,
            target_month=g.target_month,
            banner_key=g.banner_key,
            created_at=g.created_at.isoformat() if g.created_at else None,
        )
        for g in goals
    ]


@router.get("/{goal_id}", response_model=GoalResponse, tags=["Goals"])
async def get_goal(
    goal_id: str,
    user_id: int = Depends(get_current_user_id),
) -> GoalResponse:
    goal = database_service.get_goal(user_id=user_id, goal_id=goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return GoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        name=goal.name,
        target_amount=goal.target_amount,
        current_saved=goal.current_saved,
        target_year=goal.target_year,
        target_month=goal.target_month,
        banner_key=goal.banner_key,
        created_at=goal.created_at.isoformat() if goal.created_at else None,
    )


@router.patch("/{goal_id}", response_model=GoalResponse, tags=["Goals"])
async def update_goal(
    goal_id: str,
    payload: GoalUpdateRequest,
    user_id: int = Depends(get_current_user_id),
) -> GoalResponse:
    # Enforce current_saved <= target_amount when both are provided or when one changes
    existing = database_service.get_goal(user_id=user_id, goal_id=goal_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found")

    new_target = payload.target_amount if payload.target_amount is not None else existing.target_amount
    new_current = payload.current_saved if payload.current_saved is not None else existing.current_saved
    if new_current > new_target:
        raise HTTPException(status_code=400, detail="current_saved cannot exceed target_amount")

    updated = database_service.update_goal(
        user_id=user_id,
        goal_id=goal_id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_saved=payload.current_saved,
        target_year=payload.target_year,
        target_month=payload.target_month,
        banner_key=payload.banner_key,
    )
    return GoalResponse(
        id=updated.id,
        user_id=updated.user_id,
        name=updated.name,
        target_amount=updated.target_amount,
        current_saved=updated.current_saved,
        target_year=updated.target_year,
        target_month=updated.target_month,
        banner_key=updated.banner_key,
        created_at=updated.created_at.isoformat() if updated.created_at else None,
    )


@router.delete("/{goal_id}", tags=["Goals"])
async def delete_goal(
    goal_id: str,
    user_id: int = Depends(get_current_user_id),
) -> dict:
    deleted = database_service.delete_goal(user_id=user_id, goal_id=goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"deleted": True, "goal_id": goal_id}

