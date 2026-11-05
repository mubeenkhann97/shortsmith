"""Product identity shown in emails, API docs, and server-rendered pages."""

from __future__ import annotations

import os

PRODUCT_NAME = "Shortsmith"


def support_email() -> str:
    """Public support address (``SUPPORT_EMAIL``); empty when the operator has not set one."""
    return os.getenv("SUPPORT_EMAIL", "").strip()
