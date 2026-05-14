"""
Pydantic models for questionnaire API requests and responses.
"""

from pydantic import BaseModel, Field


class StartSessionRequest(BaseModel):
    user_id: str
    track: str = Field(pattern=r"^(hni|enterprise)$")


class StartSessionResponse(BaseModel):
    session_id: str
    first_question: "QuestionNode"
    radar_scores: dict[str, float]


class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str | list[str]


class SubmitAnswerResponse(BaseModel):
    next_question: "QuestionNode | None"
    radar_scores: dict[str, float]
    is_complete: bool
    ai_branched: bool = False
    ai_reasoning: str | None = None
    cpp_citations: list[str] = Field(default_factory=list)


class ResumeSessionRequest(BaseModel):
    session_id: str


class ResumeSessionResponse(BaseModel):
    session_id: str
    current_question: "QuestionNode"
    radar_scores: dict[str, float]
    questions_answered: int


class QuestionNode(BaseModel):
    id: str
    domain: str
    text: str
    question_type: str
    options: list[str] | None = None
    score_drop_trigger: bool = False


StartSessionResponse.model_rebuild()
SubmitAnswerResponse.model_rebuild()
ResumeSessionResponse.model_rebuild()
