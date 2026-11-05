"""Per-user AI provider overrides (bring your own API key).

A job sets the overrides for the user it runs for; `Config` reads them before
instance settings. They live in a ContextVar, so they follow the job into
`asyncio.to_thread` workers and never touch `os.environ`, which is shared by
every job in the process.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import Iterator, Mapping

# Setting names a user may override. OLLAMA_BASE_URL is deliberately absent:
# letting users point the server at arbitrary hosts would be an SSRF hole.
USER_OVERRIDABLE_SETTINGS = frozenset(
    {
        "LLM",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_API_KEY",
        "OPENROUTER_API_KEY",
        "ASSEMBLY_AI_API_KEY",
        "TRANSCRIPTION_PROVIDER",
    }
)

_user_overrides: ContextVar[Mapping[str, str] | None] = ContextVar(
    "user_ai_overrides", default=None
)


def get_user_override(name: str) -> str | None:
    overrides = _user_overrides.get()
    if not overrides:
        return None
    return overrides.get(name) or None


def has_user_overrides() -> bool:
    return bool(_user_overrides.get())


@contextmanager
def user_ai_overrides(values: Mapping[str, str] | None) -> Iterator[None]:
    clean = {
        key: value
        for key, value in (values or {}).items()
        if key in USER_OVERRIDABLE_SETTINGS and value
    }
    token = _user_overrides.set(clean or None)
    try:
        yield
    finally:
        _user_overrides.reset(token)
