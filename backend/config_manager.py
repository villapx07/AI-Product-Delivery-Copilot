import os
import json
from pathlib import Path

CONFIG_FILE = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "provider": "openai",
    "api_key": "",
    "base_url": "",
    "model": "gpt-4o",
}


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return {**DEFAULT_CONFIG, **json.loads(CONFIG_FILE.read_text())}
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def save_config(config: dict) -> dict:
    merged = {**DEFAULT_CONFIG, **config}
    CONFIG_FILE.write_text(json.dumps(merged, indent=2))
    return merged


def apply_config(config: dict) -> None:
    """Push config values into process environment so llm_client picks them up."""
    if config.get("provider"):
        os.environ["LLM_PROVIDER"] = config["provider"]
    if config.get("api_key"):
        os.environ["OPENAI_API_KEY"] = config["api_key"]
    if config.get("base_url"):
        os.environ["OPENAI_BASE_URL"] = config["base_url"]
    if config.get("model"):
        os.environ["LLM_MODEL"] = config["model"]