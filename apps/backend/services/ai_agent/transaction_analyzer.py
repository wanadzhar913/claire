"""LangGraph-based transaction analyzer agent for generating financial insights."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, TypedDict
from collections import defaultdict

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

try:
    from backend.config import settings
    from backend.models.financial_insight import FinancialInsight
    from backend.models.banking_transaction import BankingTransaction
    from backend.services.db.postgres_connector import database_service
except ImportError:
    import sys
    from pathlib import Path
    apps_dir = Path(__file__).parent.parent.parent.parent
    if str(apps_dir) not in sys.path:
        sys.path.insert(0, str(apps_dir))
    from backend.config import settings
    from backend.models.financial_insight import FinancialInsight
    from backend.models.banking_transaction import BankingTransaction
    from backend.services.db.postgres_connector import database_service


class AgentState(TypedDict):
    """State for the transaction analyzer agent."""
    user_id: int
    file_id: Optional[str]
    transactions: List[Dict[str, Any]]
    aggregated_data: Dict[str, Any]
    patterns: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    insights: List[FinancialInsight]


class TransactionAnalyzerAgent:
    """LangGraph agent for analyzing transactions and generating insights."""

    def __init__(self):
        """Initialize the transaction analyzer agent."""
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            api_key=settings.OPENAI_API_KEY,
        )
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("analyze_transactions", self._analyze_transactions)
        workflow.add_node("detect_patterns", self._detect_patterns)
        workflow.add_node("generate_alerts", self._generate_alerts)
        workflow.add_node("create_recommendations", self._create_recommendations)
        workflow.add_node("save_insights", self._save_insights)

        # Define edges (linear flow)
        workflow.set_entry_point("analyze_transactions")
        workflow.add_edge("analyze_transactions", "detect_patterns")
        workflow.add_edge("detect_patterns", "generate_alerts")
        workflow.add_edge("generate_alerts", "create_recommendations")
        workflow.add_edge("create_recommendations", "save_insights")
        workflow.add_edge("save_insights", END)

        return workflow.compile()

    def _analyze_transactions(self, state: AgentState) -> AgentState:
        """Aggregate transaction data for analysis."""
        transactions = state["transactions"]
        
        if not transactions:
            state["aggregated_data"] = {}
            return state

        # Aggregate by category
        category_totals = defaultdict(lambda: {"total": Decimal("0"), "count": 0, "transactions": []})
        merchant_totals = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
        daily_spending = defaultdict(lambda: Decimal("0"))
        weekday_spending = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
        
        total_income = Decimal("0")
        total_expenses = Decimal("0")

        for tx in transactions:
            amount = Decimal(str(tx.get("amount", 0)))
            category = tx.get("category", "other")
            merchant = tx.get("merchant_name", "Unknown")
            tx_type = tx.get("transaction_type", "debit")
            tx_date = tx.get("transaction_date")
            
            if tx_type == "credit":
                total_income += amount
            else:
                total_expenses += amount
                
                # Category aggregation
                category_totals[category]["total"] += amount
                category_totals[category]["count"] += 1
                category_totals[category]["transactions"].append(tx)
                
                # Merchant aggregation
                if merchant:
                    merchant_totals[merchant]["total"] += amount
                    merchant_totals[merchant]["count"] += 1
                
                # Daily spending pattern
                if tx_date:
                    if isinstance(tx_date, str):
                        date_obj = datetime.strptime(tx_date, "%Y-%m-%d")
                    else:
                        date_obj = tx_date
                    weekday = date_obj.strftime("%A")
                    weekday_spending[weekday]["total"] += amount
                    weekday_spending[weekday]["count"] += 1

        # Convert Decimals to floats for JSON serialization
        aggregated = {
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "net_flow": float(total_income - total_expenses),
            "category_breakdown": {
                k: {"total": float(v["total"]), "count": v["count"]}
                for k, v in category_totals.items()
            },
            "top_merchants": sorted(
                [{"name": k, "total": float(v["total"]), "count": v["count"]} 
                 for k, v in merchant_totals.items()],
                key=lambda x: x["total"],
                reverse=True
            )[:10],
            "weekday_spending": {
                k: {"total": float(v["total"]), "count": v["count"], 
                    "average": float(v["total"] / v["count"]) if v["count"] > 0 else 0}
                for k, v in weekday_spending.items()
            },
            "transaction_count": len(transactions),
        }

        state["aggregated_data"] = aggregated
        return state

    def _detect_patterns(self, state: AgentState) -> AgentState:
        """Use LLM to detect spending patterns from aggregated data."""
        aggregated = state.get("aggregated_data", {})
        
        if not aggregated:
            state["patterns"] = []
            return state

        # Prepare data summary for LLM
        data_summary = f"""
Transaction Analysis Summary:
- Total Income: ${aggregated.get('total_income', 0):.2f}
- Total Expenses: ${aggregated.get('total_expenses', 0):.2f}
- Net Cash Flow: ${aggregated.get('net_flow', 0):.2f}
- Total Transactions: {aggregated.get('transaction_count', 0)}

Spending by Category:
{self._format_category_breakdown(aggregated.get('category_breakdown', {}))}

Top Merchants:
{self._format_top_merchants(aggregated.get('top_merchants', []))}

Spending by Day of Week:
{self._format_weekday_spending(aggregated.get('weekday_spending', {}))}
"""

        system_prompt = """You are a financial analyst AI. Analyze the transaction data and identify 2-4 notable spending patterns.

For each pattern, provide:
1. A short, catchy title (e.g., "Weekend Dining Habit", "Morning Coffee Routine")
2. A brief description (1-2 sentences) explaining the pattern
3. An appropriate icon name from: Coffee, Utensils, ShoppingCart, Car, Home, Gamepad, Heart, GraduationCap, Zap, CreditCard, TrendingUp, ArrowRightLeft, Repeat

Respond in JSON format:
{
  "patterns": [
    {"title": "...", "description": "...", "icon": "..."},
    ...
  ]
}

Focus on actionable, interesting patterns the user might not be aware of."""

        try:
            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=data_summary)
            ])
            
            # Parse JSON response
            import json
            content = response.content
            # Extract JSON from response if wrapped in markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            state["patterns"] = result.get("patterns", [])
        except Exception as e:
            print(f"Error detecting patterns: {e}")
            # Fallback to rule-based patterns
            state["patterns"] = self._generate_fallback_patterns(aggregated)

        return state

    def _generate_alerts(self, state: AgentState) -> AgentState:
        """Generate alerts for unusual spending or budget concerns."""
        aggregated = state.get("aggregated_data", {})
        
        if not aggregated:
            state["alerts"] = []
            return state

        alerts = []
        
        # Check for negative cash flow
        net_flow = aggregated.get("net_flow", 0)
        if net_flow < 0:
            alerts.append({
                "title": "Negative Cash Flow",
                "description": f"Your expenses exceed income by ${abs(net_flow):.2f} this period",
                "severity": "warning",
                "icon": "AlertTriangle"
            })

        # Check for high spending categories
        category_breakdown = aggregated.get("category_breakdown", {})
        total_expenses = aggregated.get("total_expenses", 1)
        
        for category, data in category_breakdown.items():
            percentage = (data["total"] / total_expenses * 100) if total_expenses > 0 else 0
            if percentage > 40 and category not in ["income", "housing"]:
                alerts.append({
                    "title": f"High {category.replace('_', ' ').title()} Spending",
                    "description": f"{category.replace('_', ' ').title()} accounts for {percentage:.0f}% of your expenses",
                    "severity": "warning",
                    "icon": "AlertTriangle"
                })

        # Check for frequent small transactions (potential subscription creep)
        top_merchants = aggregated.get("top_merchants", [])
        frequent_merchants = [m for m in top_merchants if m["count"] >= 3]
        if len(frequent_merchants) > 5:
            alerts.append({
                "title": "Multiple Recurring Charges",
                "description": f"You have {len(frequent_merchants)} merchants with 3+ transactions. Review for unwanted subscriptions.",
                "severity": "info",
                "icon": "Repeat"
            })

        state["alerts"] = alerts[:4]  # Limit to 4 alerts
        return state

    def _create_recommendations(self, state: AgentState) -> AgentState:
        """Generate actionable recommendations based on analysis."""
        aggregated = state.get("aggregated_data", {})
        patterns = state.get("patterns", [])
        alerts = state.get("alerts", [])
        
        if not aggregated:
            state["recommendations"] = []
            return state

        data_context = f"""
Financial Summary:
- Net Cash Flow: ${aggregated.get('net_flow', 0):.2f}
- Total Expenses: ${aggregated.get('total_expenses', 0):.2f}

Top Spending Categories:
{self._format_category_breakdown(aggregated.get('category_breakdown', {}))}

Detected Patterns:
{[p.get('title', '') for p in patterns]}

Active Alerts:
{[a.get('title', '') for a in alerts]}
"""

        system_prompt = """You are a helpful financial advisor. Based on the user's spending data, provide 2-3 personalized, actionable recommendations to help them save money or improve their financial health.

For each recommendation:
1. A short title (e.g., "Set a Dining Budget", "Automate Savings")
2. A specific, actionable description (1-2 sentences)
3. An icon from: Lightbulb, PiggyBank, Target, TrendingDown, Calendar, Shield, Wallet

Respond in JSON format:
{
  "recommendations": [
    {"title": "...", "description": "...", "icon": "..."},
    ...
  ]
}

Be specific and reference actual spending patterns when possible."""

        try:
            response = self.llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=data_context)
            ])
            
            import json
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            state["recommendations"] = result.get("recommendations", [])
        except Exception as e:
            print(f"Error creating recommendations: {e}")
            state["recommendations"] = self._generate_fallback_recommendations(aggregated)

        return state

    def _save_insights(self, state: AgentState) -> AgentState:
        """Save all generated insights to the database."""
        user_id = state["user_id"]
        file_id = state.get("file_id")
        
        insights = []
        
        # Convert patterns to insights
        for pattern in state.get("patterns", []):
            insight = FinancialInsight(
                id=str(uuid.uuid4()),
                user_id=user_id,
                file_id=file_id,
                insight_type="pattern",
                title=pattern.get("title", "Spending Pattern"),
                description=pattern.get("description", ""),
                icon=pattern.get("icon", "TrendingUp"),
                severity=None,
                insight_metadata={"source": "ai_analysis"}
            )
            insights.append(insight)

        # Convert alerts to insights
        for alert in state.get("alerts", []):
            insight = FinancialInsight(
                id=str(uuid.uuid4()),
                user_id=user_id,
                file_id=file_id,
                insight_type="alert",
                title=alert.get("title", "Alert"),
                description=alert.get("description", ""),
                icon=alert.get("icon", "AlertTriangle"),
                severity=alert.get("severity", "info"),
                insight_metadata={"source": "ai_analysis"}
            )
            insights.append(insight)

        # Convert recommendations to insights
        for rec in state.get("recommendations", []):
            insight = FinancialInsight(
                id=str(uuid.uuid4()),
                user_id=user_id,
                file_id=file_id,
                insight_type="recommendation",
                title=rec.get("title", "Recommendation"),
                description=rec.get("description", ""),
                icon=rec.get("icon", "Lightbulb"),
                severity=None,
                insight_metadata={"source": "ai_analysis"}
            )
            insights.append(insight)

        # Delete existing insights for this file (if file_id provided) or user
        if file_id:
            database_service.delete_user_insights(user_id=user_id, file_id=file_id)
        
        # Save new insights
        if insights:
            database_service.create_financial_insights_bulk(insights)

        state["insights"] = insights
        return state

    def analyze(
        self,
        user_id: int,
        file_id: Optional[str] = None,
        transactions: Optional[List[BankingTransaction]] = None,
    ) -> List[FinancialInsight]:
        """Run the transaction analysis pipeline.

        Args:
            user_id: The user ID to analyze transactions for
            file_id: Optional file ID to filter transactions
            transactions: Optional pre-loaded transactions (if None, will fetch from DB)

        Returns:
            List[FinancialInsight]: Generated insights
        """
        # Fetch transactions if not provided
        if transactions is None:
            transactions = database_service.filter_banking_transactions(
                user_id=user_id,
                file_id=file_id,
                limit=500,  # Limit for performance
                order_desc=True,
            )

        # Convert transactions to dictionaries
        tx_dicts = []
        for tx in transactions:
            tx_dict = {
                "id": tx.id,
                "transaction_date": tx.transaction_date.isoformat() if tx.transaction_date else None,
                "description": tx.description,
                "merchant_name": tx.merchant_name,
                "amount": str(tx.amount),
                "transaction_type": tx.transaction_type,
                "category": tx.category,
                "currency": tx.currency,
            }
            tx_dicts.append(tx_dict)

        # Initialize state
        initial_state: AgentState = {
            "user_id": user_id,
            "file_id": file_id,
            "transactions": tx_dicts,
            "aggregated_data": {},
            "patterns": [],
            "alerts": [],
            "recommendations": [],
            "insights": [],
        }

        # Run the graph
        final_state = self.graph.invoke(initial_state)
        
        return final_state.get("insights", [])

    # Helper methods for formatting
    def _format_category_breakdown(self, breakdown: Dict) -> str:
        if not breakdown:
            return "No category data available"
        lines = []
        for cat, data in sorted(breakdown.items(), key=lambda x: x[1]["total"], reverse=True):
            lines.append(f"- {cat.replace('_', ' ').title()}: ${data['total']:.2f} ({data['count']} transactions)")
        return "\n".join(lines[:8])

    def _format_top_merchants(self, merchants: List[Dict]) -> str:
        if not merchants:
            return "No merchant data available"
        lines = []
        for m in merchants[:5]:
            lines.append(f"- {m['name']}: ${m['total']:.2f} ({m['count']} transactions)")
        return "\n".join(lines)

    def _format_weekday_spending(self, weekday_data: Dict) -> str:
        if not weekday_data:
            return "No weekday data available"
        days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        lines = []
        for day in days_order:
            if day in weekday_data:
                data = weekday_data[day]
                lines.append(f"- {day}: ${data['total']:.2f} avg (${data['average']:.2f}/transaction)")
        return "\n".join(lines)

    def _generate_fallback_patterns(self, aggregated: Dict) -> List[Dict]:
        """Generate basic patterns without LLM."""
        patterns = []
        
        category_breakdown = aggregated.get("category_breakdown", {})
        if "food_and_dining_out" in category_breakdown:
            data = category_breakdown["food_and_dining_out"]
            if data["count"] > 3:
                patterns.append({
                    "title": "Dining Out Habit",
                    "description": f"You've spent ${data['total']:.2f} on dining out across {data['count']} transactions",
                    "icon": "Utensils"
                })

        weekday_spending = aggregated.get("weekday_spending", {})
        weekend_total = sum(
            weekday_spending.get(day, {}).get("total", 0) 
            for day in ["Saturday", "Sunday"]
        )
        weekday_total = sum(
            weekday_spending.get(day, {}).get("total", 0) 
            for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        )
        
        if weekend_total > weekday_total * 0.5:
            patterns.append({
                "title": "Weekend Spender",
                "description": "Your weekend spending is significant compared to weekdays",
                "icon": "Calendar"
            })

        return patterns

    def _generate_fallback_recommendations(self, aggregated: Dict) -> List[Dict]:
        """Generate basic recommendations without LLM."""
        recommendations = []
        
        net_flow = aggregated.get("net_flow", 0)
        if net_flow < 0:
            recommendations.append({
                "title": "Track Your Spending",
                "description": "Consider setting a monthly budget to bring expenses in line with income",
                "icon": "Target"
            })
        else:
            recommendations.append({
                "title": "Build Emergency Fund",
                "description": f"You have positive cash flow of ${net_flow:.2f}. Consider saving a portion automatically",
                "icon": "PiggyBank"
            })

        return recommendations


# Singleton instance
transaction_analyzer = TransactionAnalyzerAgent()
