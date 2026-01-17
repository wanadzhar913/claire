"""This file contains the session model for the application."""

from typing import (
    TYPE_CHECKING,
    List,
)

from sqlmodel import (
    Field,
    Relationship,
)

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.user import User


class Session(BaseModel, table=True):
    """Session model for storing chat sessions.

    Attributes:
        id: The primary key
        user_id: Foreign key to the user
        name: Name of the session (defaults to empty string)
        created_at: When the session was created
        messages: Relationship to session messages
        user: Relationship to the session owner
    """
    __tablename__ = "session"
    
    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="app_users.id")
    name: str = Field(default="")
    user: "User" = Relationship(back_populates="sessions")

# Avoid circular imports
from backend.models.user import User  # noqa: E402