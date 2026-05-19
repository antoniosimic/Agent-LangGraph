"""
Speech & Interaction Agent — Member 4 (Audio Integration & API Engineer)

Responsibilities:
- Convert semantic description to speech (TTS)
- Save audio file and return path
- Support Croatian and English output
"""

import os
import uuid
from pathlib import Path

from gtts import gTTS

from graph.state import BlaindState

AUDIO_OUTPUT_DIR = Path(os.getenv("AUDIO_OUTPUT_DIR", "./temp/audio"))


class SpeechInteractionAgent:
    def __init__(self, language: str = None):
        self.language = language or os.getenv("TTS_LANGUAGE", "hr")
        AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    def run(self, state: BlaindState) -> BlaindState:
        try:
            text = state.semantic_description
            if not text:
                return state.model_copy(update={
                    "error": "No text available for TTS",
                    "current_step": "speech_failed",
                })

            audio_filename = f"{uuid.uuid4()}.mp3"
            audio_path = AUDIO_OUTPUT_DIR / audio_filename

            tts = gTTS(text=text, lang=self.language, slow=False)
            tts.save(str(audio_path))

            return state.model_copy(update={
                "audio_path": str(audio_path),
                "current_step": "speech_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"SpeechInteractionAgent error: {str(e)}",
                "current_step": "speech_failed",
            })
