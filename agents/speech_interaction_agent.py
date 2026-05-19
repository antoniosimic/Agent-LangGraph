# Speech & Interaction Agent — Član 4 (Audio Integration & API)
# Pretvara semantički opis u glasovni odgovor (Text-to-Speech) i sprema MP3 fajl.

import os
import uuid
from pathlib import Path

from gtts import gTTS

from graph.state import BlaindState


AUDIO_OUTPUT_DIR = Path(os.getenv("AUDIO_OUTPUT_DIR", "./temp/audio"))


class SpeechInteractionAgent:
    def __init__(self, language: str = None):
        # Jezik se može postaviti preko env varijable TTS_LANGUAGE (default: hrvatski)
        self.language = language or os.getenv("TTS_LANGUAGE", "hr")
        AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    def run(self, state: BlaindState) -> BlaindState:
        try:
            text = state.semantic_description
            if not text:
                return state.model_copy(update={
                    "error": "Nema teksta za pretvorbu u govor.",
                    "current_step": "speech_failed",
                })

            # Svaki audio fajl dobiva jedinstveno ime da ne dođe do kolizije
            audio_path = AUDIO_OUTPUT_DIR / f"{uuid.uuid4()}.mp3"
            gTTS(text=text, lang=self.language, slow=False).save(str(audio_path))

            return state.model_copy(update={
                "audio_path": str(audio_path),
                "current_step": "speech_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"SpeechInteractionAgent greška: {str(e)}",
                "current_step": "speech_failed",
            })
