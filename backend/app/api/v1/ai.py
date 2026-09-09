from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.ai_service import ai_service

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class AIChatRequest(BaseModel):
    messages: List[ChatMessage]
    case_id: str = "CNX-2026-041"
    context_entity_id: Optional[str] = None


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


@router.post("/chat")
def ai_chat(req: AIChatRequest):
    """
    Multi-turn conversational investigation copilot endpoint.
    Maintains memory across turns, resolves entity references, and grounds findings.
    """
    msg_dicts = [{"role": m.role, "content": m.content} for m in req.messages]
    result = ai_service.chat(
        messages=msg_dicts,
        case_id=req.case_id,
        context_entity_id=req.context_entity_id
    )
    return result


@router.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    case_id: str = Form("CNX-2026-041")
):
    """
    Ingests and parses investigative documents (PDF, DOCX, TXT, CSV, JSON),
    extracts entities, and links them to the active criminal network.
    """
    try:
        content_bytes = await file.read()
        res = ai_service.analyze_document(
            filename=file.filename or "uploaded_document",
            content_bytes=content_bytes,
            mime_type=file.content_type or "text/plain"
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    case_id: str = Form("CNX-2026-041")
):
    """
    Ingests and analyzes investigative images (JPG, PNG, WEBP),
    extracts optical features, and correlates with surveillance cameras.
    """
    try:
        content_bytes = await file.read()
        res = ai_service.analyze_image(
            filename=file.filename or "uploaded_image.jpg",
            content_bytes=content_bytes,
            mime_type=file.content_type or "image/jpeg"
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")
