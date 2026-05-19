# Vision rute — Član 4 (Audio Integration & API)
# POST /api/vision/analyze — prima sliku, pokreće pipeline, vraća opis i audio URL

import base64
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from graph.state import BlaindState
from graph.workflow import blaind_graph

router = APIRouter()


class AnalysisResponse(BaseModel):
    session_id: str
    description: str
    audio_url: str | None
    context_tags: list[str]
    confidence_score: float
    error: str | None = None


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    image: UploadFile = File(...),
    user_id: str = Form(default="anonymous"),
):
    session_id = str(uuid.uuid4())

    image_bytes = await image.read()
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    initial_state = BlaindState(
        image_base64=image_base64,
        user_id=user_id,
        session_id=session_id,
    )

    try:
        result: BlaindState = await blaind_graph.ainvoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Iz apsolutnog puta audio fajla izvlačimo samo naziv fajla
    audio_url = f"/audio/{Path(result.audio_path).name}" if result.audio_path else None

    return AnalysisResponse(
        session_id=session_id,
        description=result.semantic_description or "",
        audio_url=audio_url,
        context_tags=result.context_tags,
        confidence_score=result.confidence_score,
        error=result.error,
    )
