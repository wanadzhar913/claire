"""Tool for querying user financial goals from the database.

This tool lets the agent fetch saved goals (target amount/date and current saved)
so it can answer "am I on track?" questions without asking the user to retype
their goal details.
"""

import asyncio
import json
from typing import Optional

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from backend.services.db.postgres_connector import database_service


class QueryGoalsInput(BaseModel):
    """Input schema for querying user goals."""

    user_id: Optional[int] = Field(default=1, description="Filter by user ID (default: 1)")
    limit: Optional[int] = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum number of goals to return",
    )
    offset: int = Field(default=0, ge=0, description="Number of results to skip (for pagination)")
    order_by: str = Field(default="created_at", description="Field to order by")
    order_desc: bool = Field(default=True, description="Sort descending if True, ascending if False")


async def query_user_goals(
    user_id: Optional[int] = 1,
    limit: Optional[int] = 50,
    offset: int = 0,
    order_by: str = "created_at",
    order_desc: bool = True,
) -> str:
    """Return the user's saved goals as JSON.

    NOTE: user_id will be overridden by the agent runtime (GraphState.user_id) for safety.
    """
    try:
        goals = await asyncio.to_thread(
            database_service.get_user_goals,
            user_id=int(user_id) if user_id is not None else 1,
            limit=limit,
            offset=offset,
            order_by=order_by,
            order_desc=order_desc,
        )

        result = [
            {
                "id": g.id,
                "user_id": g.user_id,
                "name": g.name,
                "target_amount": str(g.target_amount),
                "current_saved": str(g.current_saved),
                "target_year": g.target_year,
                "target_month": g.target_month,
                "banner_key": g.banner_key,
                "created_at": g.created_at.isoformat() if getattr(g, "created_at", None) else None,
            }
            for g in goals
        ]

        if not result:
            return json.dumps({"message": "No goals found for user", "goals": []}, indent=2)

        return json.dumps({"goals": result, "total_goals": len(result)}, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to query goals: {str(e)}"})


query_goals_tool = StructuredTool.from_function(
    coroutine=query_user_goals,
    name="query_user_goals",
    description="""Query the user's saved financial goals.

Use this tool when users ask about:
- Whether they are on track for their savings goals
- Their goal target amount/date
- How much they have saved toward a goal

Returns a JSON list of goals with target_amount, current_saved, and target_year/month.""",
    args_schema=QueryGoalsInput,
    handle_tool_error=True,
)

