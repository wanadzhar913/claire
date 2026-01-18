"""Formatting utilities for insights generation.

Goal: make currency rendering consistent (e.g., "MYR 5,659.68") and provide
basic helpers for currency detection at the file (statement) level.
"""

from __future__ import annotations

from collections import Counter
from decimal import Decimal, InvalidOperation
from typing import Iterable, Optional


def _to_decimal(amount: object) -> Decimal:
    if isinstance(amount, Decimal):
        return amount
    if amount is None:
        return Decimal("0")
    try:
        return Decimal(str(amount))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def format_money(amount: object, currency: str = "MYR") -> str:
    """Format money as: 'MYR 5,659.68' (currency code + space + 2 decimals)."""
    cur = (currency or "MYR").strip().upper()
    value = _to_decimal(amount).quantize(Decimal("0.01"))
    # thousands separators + 2 decimals
    return f"{cur} {value:,.2f}"


def detect_file_currency(
    currencies: Iterable[Optional[str]],
    *,
    default: str = "MYR",
    dominant_threshold: float = 0.9,
) -> str:
    """
		Detect statement-level currency.
    """
    normalized = [
        (c or "").strip().upper()
        for c in currencies
        if c is not None and str(c).strip() != ""
    ]
    if not normalized:
        return (default or "MYR").strip().upper()

    counts = Counter(normalized)
    currency, count = counts.most_common(1)[0]
    share = count / max(1, len(normalized))
    if share >= dominant_threshold:
        return currency
    return "MULTI"

