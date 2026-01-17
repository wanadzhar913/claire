"""This file contains the financial goal model for the application."""

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Column, Numeric
from sqlmodel import Field, Relationship

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.user import User


class Goal(BaseModel, table=True):
    """Goal model for storing user financial goals."""

    __tablename__ = "user_goal"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: int = Field(foreign_key="app_users.id", index=True)

    name: str
    target_amount: Decimal = Field(sa_column=Column(Numeric(15, 2)))
    current_saved: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(15, 2)))

    target_year: int
    target_month: int = Field(ge=1, le=12)

    # One of 4 preset keys: banner_1, banner_2, banner_3, banner_4
    banner_key: str

    user: "User" = Relationship(back_populates="goals")
