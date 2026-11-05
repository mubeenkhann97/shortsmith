"""Free local defaults and per-user (bring your own key) AI provider overrides."""

import asyncio

import pytest

from src import ai
from src.ai_provider_context import get_user_override, user_ai_overrides
from src.config import Config
from src.repositories.ai_provider_key_repository import AiProviderKeyRepository
from src.runtime_settings import encrypt_setting_value
from src.services.ai_provider_key_service import AiProviderKeyError, AiProviderKeyService

CLOUD_KEYS = (
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "OPENROUTER_API_KEY",
    "ASSEMBLY_AI_API_KEY", "LLM", "TRANSCRIPTION_PROVIDER",
)


@pytest.fixture(autouse=True)
def no_cloud_keys(monkeypatch):
    for name in CLOUD_KEYS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("APP_SETTINGS_ENCRYPTION_KEY", "test-encryption-secret-123456")


def test_no_keys_means_free_local_models():
    config = Config()
    assert config.llm == "ollama:qwen3:8b"
    assert config.transcription_provider == "whisper"


def test_assemblyai_key_selects_assemblyai(monkeypatch):
    monkeypatch.setenv("ASSEMBLY_AI_API_KEY", "aai-instance-key")
    assert Config().transcription_provider == "assemblyai"


def test_user_overrides_apply_only_inside_their_context(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-instance")
    with user_ai_overrides({"OPENAI_API_KEY": "sk-user", "LLM": "openai:gpt-5.2", "OLLAMA_BASE_URL": "http://evil"}):
        config = Config()
        assert config.openai_api_key == "sk-user"
        assert config.llm == "openai:gpt-5.2"
        # Users cannot redirect the server to other hosts.
        assert get_user_override("OLLAMA_BASE_URL") is None
        # Settings written to os.environ (shared by all jobs) stay instance-only.
        assert config.as_runtime_settings()["OPENAI_API_KEY"] == "sk-instance"
    assert Config().openai_api_key == "sk-instance"


def test_overrides_follow_jobs_into_worker_threads():
    async def run():
        with user_ai_overrides({"ANTHROPIC_API_KEY": "sk-ant-user"}):
            return await asyncio.to_thread(lambda: Config().anthropic_api_key)

    assert asyncio.run(run()) == "sk-ant-user"


def test_cloud_models_get_the_key_explicitly():
    with user_ai_overrides({"OPENAI_API_KEY": "sk-user-openai", "GOOGLE_API_KEY": "g-user"}):
        config = Config()
        openai_model = ai._build_transcript_model(config, "openai:gpt-5.2")
        google_model = ai._build_transcript_model(config, "google-gla:gemini-3-flash-preview")
    assert openai_model.client.api_key == "sk-user-openai"
    assert google_model.model_name == "gemini-3-flash-preview"


class FakeRepo:
    keys: dict = {}
    preferred: str | None = None


@pytest.fixture
def fake_repo(monkeypatch):
    FakeRepo.keys = {}
    FakeRepo.preferred = None

    async def list_keys(db, user_id):
        return FakeRepo.keys

    async def get_preferred_llm(db, user_id):
        return FakeRepo.preferred

    async def set_preferred_llm(db, user_id, llm):
        FakeRepo.preferred = llm

    async def upsert_key(db, user_id, provider, encrypted_key, key_hint):
        FakeRepo.keys[provider] = {"encrypted_key": encrypted_key, "key_hint": key_hint}

    for name, fn in {"list_keys": list_keys, "get_preferred_llm": get_preferred_llm,
                     "set_preferred_llm": set_preferred_llm, "upsert_key": upsert_key}.items():
        monkeypatch.setattr(AiProviderKeyRepository, name, staticmethod(fn))
    return FakeRepo


def test_service_round_trip(fake_repo, monkeypatch):
    monkeypatch.setenv("SELF_HOST", "true")
    service = AiProviderKeyService(db=None)

    async def run():
        saved = await service.set_key("u1", "anthropic", "sk-ant-api-key-9876")
        await service.set_key("u1", "assemblyai", "aai-user-key-0000")
        await service.set_preferred_llm("u1", "anthropic:claude-sonnet-5-5")
        settings = await service.get_settings("u1")
        return saved, settings, await service.load_overrides("u1")

    saved, settings, overrides = asyncio.run(run())
    assert saved["key_hint"] == "…9876"
    assert "sk-ant-api-key-9876" not in str(settings)
    assert overrides == {
        "ANTHROPIC_API_KEY": "sk-ant-api-key-9876",
        "ASSEMBLY_AI_API_KEY": "aai-user-key-0000",
        "TRANSCRIPTION_PROVIDER": "assemblyai",
        "LLM": "anthropic:claude-sonnet-5-5",
    }


def test_hosted_servers_refuse_user_ollama(fake_repo, monkeypatch):
    monkeypatch.setenv("SELF_HOST", "false")
    monkeypatch.delenv("ALLOW_USER_OLLAMA", raising=False)
    service = AiProviderKeyService(db=None)
    with pytest.raises(AiProviderKeyError):
        asyncio.run(service.set_preferred_llm("u1", "ollama:qwen3:8b"))
    with pytest.raises(AiProviderKeyError):
        asyncio.run(service.set_preferred_llm("u1", "not-a-model"))
    with pytest.raises(AiProviderKeyError):
        asyncio.run(service.set_key("u1", "anthropic", "short"))

    fake_repo.preferred = "ollama:qwen3:8b"  # saved earlier, before the server changed
    fake_repo.keys = {"openai": {"encrypted_key": encrypt_setting_value("sk-openai-user-1"), "key_hint": "…er-1"}}
    assert asyncio.run(service.load_overrides("u1")) == {"OPENAI_API_KEY": "sk-openai-user-1"}
