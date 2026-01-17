from enum import Enum
from typing import Literal

class FinancialTransactionCategory(str, Enum):
    """
    Categories for financial transactions.
    
    Usage:
        category = FinancialTransactionCategory.FOOD_AND_DINING_OUT
        category.value  # Returns "food_and_dining_out"
    """
    INCOME = "income"
    HOUSING = "housing"
    TRANSPORTATION = "transportation"
    FOOD_AND_DINING_OUT = "food_and_dining_out"
    ENTERTAINMENT = "entertainment"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    UTILITIES = "utilities"
    GROCERIES = "groceries"
    SUBSCRIPTIONS_AND_MEMBERSHIPS = "subscriptions_and_memberships"
    OTHER = "other"


# Type alias for use in Pydantic models
TransactionCategoryLiteral = Literal[
    "income",
    "housing",
    "transportation",
    "food_and_dining_out",
    "entertainment",
    "healthcare",
    "education",
    "utilities",
    "groceries",
    "subscriptions_and_memberships",
    "other"
]