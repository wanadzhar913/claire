"""This file contains the user upload model for the application."""

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
    from backend.models.banking_transaction import BankingTransaction


class UserUpload(BaseModel, table=True):
    """User upload model for storing user file uploads.

    Attributes:
        file_id: The primary key (file identifier)
        user_id: Foreign key to the user
        file_name: Name of the uploaded file
        file_type: Type of the file
        file_size: Size of the file in bytes
        file_url: URL/path to the file in object storage
        file_mime_type: MIME type of the file
        file_extension: File extension
        statement_type: Type of statement (banking_transaction, receipt, invoice, other)
        expense_month: Month of the expense (1-12)
        expense_year: Year of the expense
        created_at: When the upload was created
        user: Relationship to the upload owner
        banking_transactions: Relationship to banking transactions extracted from this upload
    """
    __tablename__ = "user_upload"

    file_id: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="app_users.id")
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    file_mime_type: str
    file_extension: str
    statement_type: str  # Values: 'banking_transaction', 'receipt', 'invoice', 'other'
    expense_month: int = Field(ge=1, le=12)
    expense_year: int
    user: "User" = Relationship(back_populates="uploads")
    banking_transactions: List["BankingTransaction"] = Relationship(back_populates="user_upload")


# Avoid circular imports
from backend.models.banking_transaction import BankingTransaction  # noqa: E402
