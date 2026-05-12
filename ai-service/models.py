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


class RadarScores(BaseModel):
    """CPP domain scores for the radar chart (0-100 per domain)."""

    scores: dict[str, float] = Field(
        default_factory=lambda: {
            "CPP-01": 100.0,
            "CPP-02": 100.0,
            "CPP-03": 100.0,
            "CPP-04": 100.0,
            "CPP-05": 100.0,
            "CPP-06": 100.0,
            "CPP-07": 100.0,
        }
    )

    def apply_penalty(self, domain: str, amount: float) -> None:
        if domain in self.scores:
            self.scores[domain] = max(0.0, self.scores[domain] - amount)

    def apply_minor_penalty(self, domain: str) -> None:
        self.apply_penalty(domain, 5.0)

    def apply_major_penalty(self, domain: str) -> None:
        self.apply_penalty(domain, 15.0)


StartSessionResponse.model_rebuild()
SubmitAnswerResponse.model_rebuild()
ResumeSessionResponse.model_rebuild()
