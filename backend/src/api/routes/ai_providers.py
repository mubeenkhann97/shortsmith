"""
Bring-your-own-key routes: a user's own cloud AI keys and model choice.

Authenticated with the frontend's signed session headers only (never an API
key), like /api-keys, so a leaked API key cannot replace a user's AI keys.
Plaintext keys are accepted but never returned.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...auth_headers import get_authenticated_user_id
from ...config import get_config
from ...database import get_db
from ...services.ai_provider_key_service import AiProviderKeyError, AiProviderKeyService

router = APIRouter(prefix="/ai-providers", tags=["ai-providers"])


class KeyBody(BaseModel):
    api_key: str = Field(min_length=1, max_length=500)


class ModelBody(BaseModel):
    llm: str | None = Field(default=None, max_length=255)


def _user_id(request: Request) -> str:
    return get_authenticated_user_id(request, get_config())


@router.get("/")
async def get_ai_providers(request: Request, db: AsyncSession = Depends(get_db)):
    return await AiProviderKeyService(db).get_settings(_user_id(request))


@router.put("/keys/{provider}")
async def put_ai_provider_key(
    provider: str, body: KeyBody, request: Request, db: AsyncSession = Depends(get_db)
):
    try:
        return await AiProviderKeyService(db).set_key(_user_id(request), provider, body.api_key)
    except AiProviderKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/keys/{provider}")
async def delete_ai_provider_key(provider: str, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        removed = await AiProviderKeyService(db).delete_key(_user_id(request), provider)
    except AiProviderKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"removed": removed}


@router.put("/model")
async def put_ai_model(body: ModelBody, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        llm = await AiProviderKeyService(db).set_preferred_llm(_user_id(request), body.llm)
    except AiProviderKeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"preferred_llm": llm}
