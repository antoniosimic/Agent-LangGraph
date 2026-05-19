# Visual Analysis Agent — Član 3 (Computer Vision)
# Zadužen za analizu slike: prepoznavanje objekata, boja, lica i čitanje teksta (OCR).

import base64
import json

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from graph.state import BlaindState


# Prompt koji šaljemo modelu — tražimo strukturirani JSON bez ikakve interpretacije
VISION_PROMPT = """
Analyze this image in detail. Return a structured JSON with the following fields:
- detected_objects: list of all objects you can identify
- foreground_objects: objects in the foreground / closest to the camera
- background_objects: objects in the background
- detected_text: any readable text found in the image (OCR)
- detected_faces: number of human faces detected (integer)
- dominant_colors: top 3 dominant colors as plain English names

Be precise. Do not infer meaning — just report what you visually observe.
Respond ONLY with valid JSON, no markdown.
"""


class VisualAnalysisAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.llm = ChatOpenAI(model=model, max_tokens=1024)

    def _encode_image(self, image_path: str) -> str:
        """Čita lokalnu sliku i pretvara je u base64 string."""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def run(self, state: BlaindState) -> BlaindState:
        try:
            # Uzimamo base64 sliku — ili direktno ili kodiramo lokalni fajl
            if state.image_base64:
                image_data = state.image_base64
            elif state.image_path:
                image_data = self._encode_image(state.image_path)
            else:
                return state.model_copy(update={
                    "error": "Nije proslijeđena slika za analizu.",
                    "current_step": "visual_analysis_failed",
                })

            # Šaljemo sliku i prompt vision modelu
            message = HumanMessage(content=[
                {"type": "text", "text": VISION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                },
            ])

            response = self.llm.invoke([message])
            raw = json.loads(response.content)

            return state.model_copy(update={
                "detected_objects": raw.get("detected_objects", []),
                "foreground_objects": raw.get("foreground_objects", []),
                "background_objects": raw.get("background_objects", []),
                "detected_text": raw.get("detected_text"),
                "detected_faces": raw.get("detected_faces", 0),
                "dominant_colors": raw.get("dominant_colors", []),
                "current_step": "visual_analysis_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"VisualAnalysisAgent greška: {str(e)}",
                "current_step": "visual_analysis_failed",
            })
