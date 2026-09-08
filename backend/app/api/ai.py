from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import LLMError
from app.ai.service import (
    ask_lifegpt,
    generate_analysis,
    generate_forecast_commentary,
    generate_roast,
)
from app.core.auth import require_auth
from app.database.db import get_db
from app.models.ai_report import AIReport
from app.schemas.ai_report import (
    AIReportRead,
    ChatRequest,
    ChatResponse,
    CommentaryResponse,
    RoastRequest,
)

router = APIRouter(prefix="/api/ai", tags=["ai"], dependencies=[Depends(require_auth)])


@router.post("/analysis", response_model=AIReportRead)
def create_analysis(db: Session = Depends(get_db)):
    try:
        return generate_analysis(db)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/roast", response_model=AIReportRead)
def create_roast(payload: RoastRequest, db: Session = Depends(get_db)):
    try:
        return generate_roast(db, payload.intensity)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/forecast-commentary", response_model=CommentaryResponse)
def forecast_commentary(db: Session = Depends(get_db)):
    try:
        return CommentaryResponse(commentary=generate_forecast_commentary(db))
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    try:
        reply = ask_lifegpt(
            db,
            payload.message,
            [t.model_dump() for t in payload.history],
        )
        return ChatResponse(reply=reply)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/reports", response_model=list[AIReportRead])
def list_reports(
    kind: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(AIReport).order_by(AIReport.created_at.desc()).limit(limit)
    if kind:
        stmt = stmt.where(AIReport.kind == kind)
    return db.scalars(stmt).all()
