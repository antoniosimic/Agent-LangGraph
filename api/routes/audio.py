"""
Audio routes — Member 4 (Audio Integration & API Engineer)

GET /api/audio/{filename}  — serves generated audio files
"""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

AUDIO_DIR = Path("./temp/audio")


@router.get("/{filename}")
async def get_audio(filename: str):
    path = AUDIO_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(str(path), media_type="audio/mpeg")
