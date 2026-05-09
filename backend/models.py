from pydantic import BaseModel
from typing import Optional, List


class GenerateRequest(BaseModel):
    feature_title: str
    business_objective: str
    problem_statement: Optional[str] = ""
    success_metrics: Optional[str] = ""
    constraints: Optional[str] = ""
    assumptions: Optional[str] = ""
    impacted_teams: List[str] = []
    uploaded_files: List[str] = []  # base64 encoded
    file_names: List[str] = []


class EpicData(BaseModel):
    title: str
    description: str
    teams: List[str]
    dependencies: str
    priority: str  # P0, P1, P2


class CriterionData(BaseModel):
    text: str
    type: str  # happy, negative, edge


class UserStoryData(BaseModel):
    epicId: str
    user: str
    goal: str
    benefit: str
    criteria: List[CriterionData]


class QAScenarioData(BaseModel):
    title: str
    type: str  # positive, negative, edge, validation
    preconditions: str
    steps: str
    expectedResult: str


class AnalyticsEventData(BaseModel):
    eventName: str
    trigger: str
    purpose: str
    funnelStage: str  # awareness, consideration, conversion, retention


class RiskData(BaseModel):
    text: str
    type: str  # technical, compliance, operational, stakeholder, assumption
    severity: str  # high, medium, low
    suggestedAction: Optional[str] = ""


class ReviewData(BaseModel):
    category: str  # missing, assumption, risk, stakeholder, completeness
    message: str


class GenerateResponse(BaseModel):
    epic_map: List[EpicData]
    user_stories: List[UserStoryData]
    qa_scenarios: List[QAScenarioData]
    analytics_events: List[AnalyticsEventData]
    risks: List[RiskData]
    reviewer_items: List[ReviewData]