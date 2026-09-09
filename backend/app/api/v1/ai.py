from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.ai_service import ai_service

router = APIRouter()


class AIQuery(BaseModel):
    question: str
    case_id: str = "CNX-2026-041"
    context_entity_id: Optional[str] = None


@router.post("/query")
def ai_query(query: AIQuery):
    """Process natural language investigation query."""
    result = ai_service.query(
        question=query.question,
        case_id=query.case_id,
        context_entity_id=query.context_entity_id
    )
    return result
