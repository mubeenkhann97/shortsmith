"""
Configuration for the Shortsmith MCP server.

All settings come from environment variables so the same server binary works
against any Shortsmith backend. Each ``SHORTSMITH_*`` variable also accepts the
legacy upstream ``SUPOCLIP_*`` name (still used by docker-compose.yml).
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

# A local self-hosted backend. Override with SHORTSMITH_API_URL to point at your
# hosted instance (e.g. https://api.example.com).
DEFAULT_API_URL = "http://localhost:8000"
LEGACY_PREFIX = "SUPOCLIP_"


def _env(name: str) -> Optional[str]:
    """Read ``SHORTSMITH_<name>``, falling back to the legacy ``SUPOCLIP_<name>``."""
    value = _clean(os.getenv(f"SHORTSMITH_{name}"))
    if value is not None:
        return value
    return _clean(os.getenv(f"{LEGACY_PREFIX}{name}"))


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


@dataclass(frozen=True)
class Settings:
    """Resolved runtime configuration."""

    api_url: str
    api_key: Optional[str]
    user_id: Optional[str]
    auth_secret: Optional[str]
    download_dir: str
    timeout: float
    mcp_transport: str
    mcp_host: str
    mcp_port: int
    mcp_mount_path: str
    mcp_public_url: Optional[str]
    mcp_require_bearer_auth: bool

    @property
    def auth_mode(self) -> str:
        """Describe how requests will be authenticated."""
        if self.api_key:
            return "api_key"
        if self.user_id and self.auth_secret:
            return "signed_headers"
        if self.user_id:
            return "unsigned_user_id"
        return "none"

    @property
    def is_authenticated(self) -> bool:
        return self.auth_mode != "none"


def load_settings() -> Settings:
    """Build :class:`Settings` from the current environment."""
    api_url = (_env("API_URL") or DEFAULT_API_URL).rstrip("/")
    download_dir = _env("DOWNLOAD_DIR") or os.path.join(
        os.getcwd(), "shortsmith-downloads"
    )

    raw_timeout = _env("TIMEOUT")
    try:
        timeout = float(raw_timeout) if raw_timeout else 60.0
    except ValueError:
        timeout = 60.0

    raw_port = _env("MCP_PORT")
    try:
        mcp_port = int(raw_port) if raw_port else 9100
    except ValueError:
        mcp_port = 9100

    transport = (_env("MCP_TRANSPORT") or "stdio").lower()
    if transport == "http":
        transport = "streamable-http"
    if transport not in {"stdio", "sse", "streamable-http"}:
        transport = "stdio"

    return Settings(
        api_url=api_url,
        api_key=_env("API_KEY"),
        user_id=_env("USER_ID"),
        auth_secret=_env("AUTH_SECRET"),
        download_dir=download_dir,
        timeout=timeout,
        mcp_transport=transport,
        mcp_host=_env("MCP_HOST") or "127.0.0.1",
        mcp_port=mcp_port,
        mcp_mount_path=_env("MCP_MOUNT_PATH") or "/",
        mcp_public_url=_env("MCP_PUBLIC_URL"),
        mcp_require_bearer_auth=(
            (_env("MCP_REQUIRE_BEARER_AUTH") or "").lower()
            in {"1", "true", "yes", "on"}
        ),
    )
