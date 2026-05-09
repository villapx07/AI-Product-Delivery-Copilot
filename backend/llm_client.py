import os
import json
import re
from typing import AsyncGenerator, Optional
import httpx
from openai import AsyncOpenAI

# ── MiniMax endpoint defaults ──────────────────────────────────────
_MINIMAX_BASE = "https://api.minimax.io/v1"


def _get_provider() -> str:
    return os.getenv("LLM_PROVIDER", "openai")


def _get_api_key() -> str:
    """Read API key lazily from env, supporting both OpenAI and MiniMax env var names."""
    return os.getenv("OPENAI_API_KEY") or os.getenv("MINIMAX_API_KEY") or ""


def _get_base_url() -> str:
    base = os.getenv("OPENAI_BASE_URL", "")
    if base:
        return base.rstrip("/")
    if _get_provider() == "minimax":
        return _MINIMAX_BASE
    return "https://api.openai.com/v1"


def _get_model() -> str:
    provider = _get_provider()
    model = os.getenv("LLM_MODEL", "")
    if model:
        return model
    if provider == "minimax":
        return "MiniMax-Text-01"
    return "gpt-4o"


# ── Lazy client singleton ────────────────────────────────────────────
_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(180.0, connect=15.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )
        _client = AsyncOpenAI(
            api_key=_get_api_key(),
            base_url=_get_base_url(),
            http_client=_http_client,
        )
    return _client


def _reset_client() -> None:
    """Force recreate the client on next call. Call after config changes."""
    global _client
    _client = None


def get_model_name() -> str:
    return _get_model()


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

    # JSON mode: OpenAI supports json_object; MiniMax's Claude-compatible endpoint
    # accepts it but for array outputs we rely on system-prompt instruction instead
    provider = _get_provider()
    if provider == "openai":
        kwargs["response_format"] = {"type": "json_object"}

    response = await _get_client().chat.completions.create(**kwargs)

    raw = response.choices[0].message.content
    if raw:
        # Strip Claude-style <thinking> blocks
        cleaned = re.sub(r"<think>.*?", "", raw, flags=re.DOTALL).strip()

        # Strip markdown code fences (```json ... ```)
        fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", cleaned, flags=re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try extracting the first JSON array or object
            for match in re.finditer(r"(\[[^\[\]]*\]|\{[^{}]*\})", cleaned, re.DOTALL):
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue
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