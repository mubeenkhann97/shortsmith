"""
AI provider key repository - a user's own cloud model keys (bring your own key).

Keys are stored encrypted with the same AES-GCM scheme as admin runtime
settings; only a short hint (last four characters) is ever returned.
"""

from typing import Dict, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AiProviderKeyRepository:
    """Repository for per-user AI provider keys and model preference."""

    @staticmethod
    async def list_keys(db: AsyncSession, user_id: str) -> Dict[str, Dict[str, str]]:
        """Return {provider: {"encrypted_key", "key_hint"}} for one user."""
        result = await db.execute(
            text(
                """
                SELECT provider, encrypted_key, key_hint
                FROM user_ai_provider_keys
                WHERE user_id = :user_id
                """
            ),
            {"user_id": user_id},
        )
        return {
            row["provider"]: {"encrypted_key": row["encrypted_key"], "key_hint": row["key_hint"]}
            for row in result.mappings()
        }

    @staticmethod
    async def upsert_key(
        db: AsyncSession, user_id: str, provider: str, encrypted_key: str, key_hint: str
    ) -> None:
        await db.execute(
            text(
                """
                INSERT INTO user_ai_provider_keys (user_id, provider, encrypted_key, key_hint)
                VALUES (:user_id, :provider, :encrypted_key, :key_hint)
                ON CONFLICT (user_id, provider) DO UPDATE
                SET encrypted_key = EXCLUDED.encrypted_key,
                    key_hint = EXCLUDED.key_hint,
                    updated_at = NOW()
                """
            ),
            {
                "user_id": user_id,
                "provider": provider,
                "encrypted_key": encrypted_key,
                "key_hint": key_hint,
            },
        )
        await db.commit()

    @staticmethod
    async def delete_key(db: AsyncSession, user_id: str, provider: str) -> bool:
        result = await db.execute(
            text(
                "DELETE FROM user_ai_provider_keys WHERE user_id = :user_id AND provider = :provider"
            ),
            {"user_id": user_id, "provider": provider},
        )
        await db.commit()
        return (result.rowcount or 0) > 0

    @staticmethod
    async def get_preferred_llm(db: AsyncSession, user_id: str) -> Optional[str]:
        result = await db.execute(
            text("SELECT llm FROM user_ai_preferences WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def set_preferred_llm(db: AsyncSession, user_id: str, llm: Optional[str]) -> None:
        await db.execute(
            text(
                """
                INSERT INTO user_ai_preferences (user_id, llm)
                VALUES (:user_id, :llm)
                ON CONFLICT (user_id) DO UPDATE
                SET llm = EXCLUDED.llm, updated_at = NOW()
                """
            ),
            {"user_id": user_id, "llm": llm},
        )
        await db.commit()
