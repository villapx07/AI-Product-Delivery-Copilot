"""
Generation module: per-module LLM generation pipeline.

Usage:
    from generation import generate_single_module

    async for event in generate_single_module(workbench_id, "epic_map", discovery, upstream):
        print(event)
"""
from .base import (
    MODULE_DEPENDENCIES,
    MODULE_DISPLAY_NAMES,
    get_module,
    generate_single_module,
    EpicMapPipeline,
    UserStoriesPipeline,
    QAScenariosPipeline,
    AnalyticsPipeline,
    RisksPipeline,
    ReviewerPipeline,
)

__all__ = [
    "MODULE_DEPENDENCIES",
    "MODULE_DISPLAY_NAMES",
    "get_module",
    "generate_single_module",
    "EpicMapPipeline",
    "UserStoriesPipeline",
    "QAScenariosPipeline",
    "AnalyticsPipeline",
    "RisksPipeline",
    "ReviewerPipeline",
]