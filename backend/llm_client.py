import os
import json
from typing import AsyncGenerator, Optional
from openai import AsyncOpenAI

API_KEY = os.getenv("OPENAI_API_KEY", "")
MODEL = os.getenv("LLM_MODEL", "gpt-4o")
BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)


async def stream_generate(
    system_prompt: str,
    user_prompt: str,
) -> AsyncGenerator[str, None]:
    """Send a chat completion request and yield response chunks via SSE."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    stream = await client.chat.completions.create(
        model=MODEL,
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
    """Send a chat completion request and return parsed JSON."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=temperature,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    if raw:
        return json.loads(raw)
    return None