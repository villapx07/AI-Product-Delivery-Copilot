import os
import json
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI

# ── Provider options ──────────────────────────────────────────────
# Switch between 'openai', 'minimax' by setting LLM_PROVIDER env var.
# Or set individual vars directly and leave PROVIDER blank.

PROVIDER = os.getenv("LLM_PROVIDER", "openai")           # 'openai' | 'minimax'
API_KEY  = os.getenv("OPENAI_API_KEY", os.getenv("MINIMAX_API_KEY", ""))
MODEL    = os.getenv("LLM_MODEL", "gpt-4o")
BASE_URL = os.getenv("OPENAI_BASE_URL", "")

# ── MiniMax endpoint defaults ──────────────────────────────────────
_MINIMAX_BASE = "https://api.minimax.chat/v1"

def _resolve_base_url() -> str:
    if BASE_URL:
        return BASE_URL.rstrip("/")
    if PROVIDER == "minimax":
        return _MINIMAX_BASE
    return "https://api.openai.com/v1"


def _resolve_model() -> str:
    if PROVIDER == "minimax":
        # MiniMax uses a specific model name — allow override but default
        return MODEL or "MiniMax-Text-01"   # text model; use "MiniMax-Image-01" for vision
    return MODEL or "gpt-4o"


client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global client
    if client is None:
        client = AsyncOpenAI(api_key=API_KEY, base_url=_resolve_base_url())
    return client


def get_model_name() -> str:
    return _resolve_model()


async def stream_generate(
    system_prompt: str,
    user_prompt: str,
) -> AsyncGenerator[str, None]:
    """Yield streamed LLM response chunks."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    stream = await _get_client().chat.completions.create(
        model=get_model_name(),
        messages=messages,
        temperature=0.7,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def generate_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
) -> Optional[dict]:
    """Send a completion request and return parsed JSON."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    kwargs = dict(
        model=get_model_name(),
        messages=messages,
        temperature=temperature,
    )

    # MiniMax supports JSON mode on compatible models
    if PROVIDER in ("openai", "minimax"):
        kwargs["response_format"] = {"type": "json_object"}

    response = await _get_client().chat.completions.create(**kwargs)

    raw = response.choices[0].message.content
    if raw:
        return json.loads(raw)
    return None


async def generate_with_image(
    system_prompt: str,
    user_prompt: str,
    image_base64: str,
    temperature: float = 0.3,
) -> Optional[dict]:
    """
    Send a multimodal request (text + image) and return parsed JSON.
    Works with GPT-4o vision, MiniMax-Image-01, and other vision-capable models.
    image_base64 must be a data-URI:  data:image/jpeg;base64,<bytes>
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_prompt},
                {
                    "type": "image_url",
                    "image_url": {"url": image_base64},
                },
            ],
        },
    ]

    response = await _get_client().chat.completions.create(
        model=get_model_name(),
        messages=messages,
        temperature=temperature,
    )

    raw = response.choices[0].message.content
    if raw:
        return json.loads(raw)
    return None