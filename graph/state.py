from typing import Optional
from pydantic import BaseModel, Field


class BlaindState(BaseModel):
    """Zajednički state koji se prosljeđuje između svih agenata u LangGraph workflowu."""

    # --- Ulaz ---
    image_base64: Optional[str] = None   # slika kao base64 string (od frontenda)
    image_path: Optional[str] = None     # alternativno: lokalni put do slike
    user_id: str = "anonymous"
    session_id: str = ""

    # --- Izlaz VisualAnalysisAgent-a ---
    detected_objects: list[str] = Field(default_factory=list)    # svi prepoznati objekti
    foreground_objects: list[str] = Field(default_factory=list)  # objekti u prvom planu
    background_objects: list[str] = Field(default_factory=list)  # objekti u pozadini
    scene_layout: Optional[str] = None                            # neutral spatial layout of the scene
    spatial_relationships: list[str] = Field(default_factory=list) # relationships between objects
    object_details: list[str] = Field(default_factory=list)       # object-specific visual details
    detected_text: Optional[str] = None                          # OCR tekst iz slike
    detected_faces: int = 0                                       # broj lica
    dominant_colors: list[str] = Field(default_factory=list)     # dominantne boje

    # --- Izlaz SemanticInterpretationAgent-a ---
    semantic_description: Optional[str] = None  # opis scene za slijepu osobu
    context_tags: list[str] = Field(default_factory=list)  # kategorije scene (npr. "traffic")
    confidence_score: float = 0.0

    # --- Izlaz SpeechInteractionAgent-a ---
    audio_path: Optional[str] = None  # put do generiranog MP3 fajla

    # --- Memorija ---
    memory_context: Optional[str] = None  # kontekst iz prethodnih interakcija ovog korisnika

    # --- Praćenje grešaka ---
    error: Optional[str] = None
    current_step: str = "init"
