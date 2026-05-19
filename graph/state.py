from typing import Optional
from pydantic import BaseModel, Field


class BlaindState(BaseModel):
    """Shared state passed between all agents in the LangGraph workflow."""

    # Input
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    user_id: str = "anonymous"
    session_id: str = ""

    # Visual Analysis Agent output
    raw_visual_data: Optional[dict] = None
    detected_objects: list[str] = Field(default_factory=list)
    detected_text: Optional[str] = None
    detected_faces: int = 0
    dominant_colors: list[str] = Field(default_factory=list)
    foreground_objects: list[str] = Field(default_factory=list)
    background_objects: list[str] = Field(default_factory=list)

    # Semantic Interpretation Agent output
    semantic_description: Optional[str] = None
    context_tags: list[str] = Field(default_factory=list)
    confidence_score: float = 0.0

    # Speech & Interaction Agent output
    audio_path: Optional[str] = None
    tts_text: Optional[str] = None

    # Memory
    memory_context: Optional[str] = None
    is_returning_user: bool = False

    # Error handling
    error: Optional[str] = None
    current_step: str = "init"
