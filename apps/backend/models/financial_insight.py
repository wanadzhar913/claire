"""Financial insight model for storing AI-generated transaction analysis."""

from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, JSON, Column

from backend.models.base import BaseModel

if TYPE_CHECKING:
    from backend.models.user import User
    from backend.models.user_upload import UserUpload


class FinancialInsight(BaseModel, table=True):
    """Financial insight model for storing AI-generated insights.

    Attributes:
        id: The primary key (unique identifier)
        user_id: Foreign key to the user
        file_id: Foreign key to the user upload file (optional, for file-specific insights)
        insight_type: Type of insight (pattern, alert, recommendation)
        title: Short title for the insight
        description: Detailed description of the insight
        icon: Icon identifier for UI display
        severity: Severity level (info, warning, critical) - mainly for alerts
    insight_metadata: Additional JSON metadata for the insight
        created_at: When the insight was created
        user: Relationship to the user
        user_upload: Relationship to the source upload (optional)
    """
    __tablename__ = "financial_insight"

    id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="app_users.id")
    file_id: Optional[str] = Field(default=None, foreign_key="user_upload.file_id")
    insight_type: str  # Values: 'pattern', 'alert', 'recommendation'
    title: str
    description: str
    icon: str = Field(default="Lightbulb")  # Icon identifier for UI
    severity: Optional[str] = Field(default=None)  # Values: 'info', 'warning', 'critical'
    insight_metadata: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSON))
    
    user: "User" = Relationship()
    user_upload: Optional["UserUpload"] = Relationship()


# Avoid circular imports
from backend.models.user import User  # noqa: E402
from backend.models.user_upload import UserUpload  # noqa: E402
