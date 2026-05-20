# Speech & Interaction Agent - optional backend Text-to-Speech support.

import os
import uuid
from pathlib import Path

from gtts import gTTS

from graph.state import BlaindState


SPEECH_SYSTEM_PROMPT = """
Spoken output for Blaind must be short, direct, and useful for blind and low-vision users.
Lead with safety-relevant information, then describe the closest important objects and
spatial relationships. Avoid technical jargon, decorative language, uncertainty presented
as fact, and unnecessary filler. Use clear everyday words and keep the pace suitable for
quick mobile use.
"""

AUDIO_OUTPUT_DIR = Path(os.getenv("AUDIO_OUTPUT_DIR", "./temp/audio"))


class SpeechInteractionAgent:
    def __init__(self, language: str = None):
        self.language = language or os.getenv("TTS_LANGUAGE", "en")
        AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    def run(self, state: BlaindState) -> BlaindState:
        try:
            text = state.semantic_description
            if not text:
                return state.model_copy(update={
                    "error": "No text is available for speech output.",
                    "current_step": "speech_failed",
                })

            audio_path = AUDIO_OUTPUT_DIR / f"{uuid.uuid4()}.mp3"
            gTTS(text=text, lang=self.language, slow=False).save(str(audio_path))

            return state.model_copy(update={
                "audio_path": str(audio_path),
                "current_step": "speech_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"SpeechInteractionAgent error: {str(e)}",
                "current_step": "speech_failed",
            })
