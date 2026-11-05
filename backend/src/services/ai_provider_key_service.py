"""
Bring-your-own-key support: users store their own cloud AI keys and pick the
model used for their videos. Jobs apply them with `user_ai_overrides`.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import Config, get_config
from ..repositories.ai_provider_key_repository import AiProviderKeyRepository
from ..runtime_settings import decrypt_setting_value, encrypt_setting_value

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class KeyProvider:
    id: str
    label: str
    setting: str  # Config/runtime setting the key overrides
    llm_prefixes: tuple[str, ...]  # LLM provider prefixes this key unlocks
    example_model: str


KEY_PROVIDERS: Dict[str, KeyProvider] = {
    p.id: p
    for p in (
        KeyProvider("openai", "OpenAI", "OPENAI_API_KEY", ("openai",), "openai:gpt-5.2"),
        KeyProvider("anthropic", "Anthropic", "ANTHROPIC_API_KEY", ("anthropic",), "anthropic:claude-sonnet-5-5"),
        KeyProvider("google", "Google Gemini", "GOOGLE_API_KEY", ("google", "google-gla"),
                    "google-gla:gemini-3-flash-preview"),
        KeyProvider("openrouter", "OpenRouter", "OPENROUTER_API_KEY", ("openrouter",),
                    "openrouter:anthropic/claude-sonnet-5.5"),
        KeyProvider("assemblyai", "AssemblyAI (transcription)", "ASSEMBLY_AI_API_KEY", (), ""),
    )
}

LLM_PROVIDER_PREFIXES = {"openai", "anthropic", "google", "google-gla", "openrouter", "ollama"}
MAX_KEY_LENGTH = 500


class AiProviderKeyError(ValueError):
    """Invalid input; the message is safe to show to the user."""


def _hint(value: str) -> str:
    return "…" + value[-4:] if len(value) > 8 else "…"


class AiProviderKeyService:
    def __init__(self, db: AsyncSession, config: Optional[Config] = None):
        self.db = db
        self.config = config or get_config()

    def _server_has_key(self, provider: KeyProvider) -> bool:
        return bool(Config._get_instance_setting(provider.setting))

    async def get_settings(self, user_id: str) -> Dict[str, Any]:
        keys = await AiProviderKeyRepository.list_keys(self.db, user_id)
        preferred = await AiProviderKeyRepository.get_preferred_llm(self.db, user_id)
        return {
            "providers": [
                {
                    "id": p.id,
                    "label": p.label,
                    "example_model": p.example_model,
                    "has_key": p.id in keys,
                    "key_hint": keys.get(p.id, {}).get("key_hint"),
                    "server_configured": self._server_has_key(p),
                }
                for p in KEY_PROVIDERS.values()
            ],
            "preferred_llm": preferred,
            "server_llm": Config._get_instance_setting("LLM") or self.config._infer_default_llm(),
            "server_transcription_provider": self.config.transcription_provider,
            "allow_ollama": self.config.allow_user_ollama,
        }

    async def set_key(self, user_id: str, provider_id: str, api_key: str) -> Dict[str, str]:
        provider = KEY_PROVIDERS.get(provider_id)
        if provider is None:
            raise AiProviderKeyError("Unknown provider.")
        value = (api_key or "").strip()
        if len(value) < 8 or len(value) > MAX_KEY_LENGTH or any(c.isspace() for c in value):
            raise AiProviderKeyError("That does not look like a valid API key.")
        try:
            encrypted = encrypt_setting_value(value)
        except RuntimeError:
            raise AiProviderKeyError(
                "This server cannot store API keys yet: set APP_SETTINGS_ENCRYPTION_KEY."
            ) from None
        await AiProviderKeyRepository.upsert_key(self.db, user_id, provider.id, encrypted, _hint(value))
        return {"provider": provider.id, "key_hint": _hint(value)}

    async def delete_key(self, user_id: str, provider_id: str) -> bool:
        if provider_id not in KEY_PROVIDERS:
            raise AiProviderKeyError("Unknown provider.")
        return await AiProviderKeyRepository.delete_key(self.db, user_id, provider_id)

    async def set_preferred_llm(self, user_id: str, llm: Optional[str]) -> Optional[str]:
        value = (llm or "").strip() or None
        if value is not None:
            prefix, _, model = value.partition(":")
            prefix = prefix.lower()
            if prefix not in LLM_PROVIDER_PREFIXES or not model.strip() or len(value) > 255:
                raise AiProviderKeyError(
                    "Use provider:model, for example openai:gpt-5.2 or ollama:qwen3:8b."
                )
            if prefix == "ollama" and not self.config.allow_user_ollama:
                raise AiProviderKeyError("Local Ollama models are not available on this server.")
            if prefix == "openrouter" and "/" not in model:
                raise AiProviderKeyError("OpenRouter models include the vendor, e.g. openrouter:anthropic/claude-sonnet-5.5.")
            value = f"{prefix}:{model.strip()}"
        await AiProviderKeyRepository.set_preferred_llm(self.db, user_id, value)
        return value

    async def load_overrides(self, user_id: Optional[str]) -> Dict[str, str]:
        """Settings to apply while running this user's jobs."""
        if not user_id:
            return {}
        overrides: Dict[str, str] = {}
        for provider_id, row in (await AiProviderKeyRepository.list_keys(self.db, user_id)).items():
            provider = KEY_PROVIDERS.get(provider_id)
            if provider is None:
                continue
            try:
                overrides[provider.setting] = decrypt_setting_value(row["encrypted_key"])
            except Exception:
                # The encryption secret changed; the user has to enter the key again.
                logger.warning("Could not decrypt %s key for user %s", provider_id, user_id)
        if "ASSEMBLY_AI_API_KEY" in overrides:
            overrides["TRANSCRIPTION_PROVIDER"] = "assemblyai"
        preferred = await AiProviderKeyRepository.get_preferred_llm(self.db, user_id)
        if preferred and (not preferred.startswith("ollama:") or self.config.allow_user_ollama):
            overrides["LLM"] = preferred
        return overrides
