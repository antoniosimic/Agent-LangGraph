# Visual Analysis Agent - Computer Vision
# Analyzes an image and returns structured visual facts for the semantic agent.

import base64
import json
import re
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from graph.state import BlaindState


# The visual agent observes only; it does not create the final user-facing description.
VISION_PROMPT = """
You are the Visual Analysis Agent in an accessibility system for blind users.
Your job is to observe the image and return structured visual facts for another
agent. Do not write a final user-facing description and do not explain the scene.

Return ONLY one valid JSON object with exactly these fields:
{
  "detected_objects": ["object names visible in the image"],
  "foreground_objects": ["objects closest to the camera or most visually prominent"],
  "background_objects": ["objects clearly farther away or behind the main subject"],
  "scene_layout": "one short neutral sentence describing the spatial layout",
  "spatial_relationships": ["relationships between objects and positions"],
  "object_details": ["object-specific details that preserve important visual context"],
  "detected_text": "clearly readable text copied exactly, or null if no text is confidently readable",
  "detected_faces": 0,
  "dominant_colors": ["top 3 dominant color names"]
}

Rules:
- Use short English object names, for example "person", "car", "door", "traffic sign".
- Include safety-relevant objects such as stairs, doors, vehicles, crossings, obstacles, signs, and people.
- Put immediate obstacles and nearby objects in foreground_objects.
- Put distant scene elements in background_objects.
- Use scene_layout to preserve left/right/center, near/far, in front/behind, and overall arrangement.
- Use spatial_relationships for facts such as "person on the right is standing next to person on the left", "chair is in front of the door", or "car is behind the sign".
- Use object_details for facts attached to specific objects, such as "white text is printed on the black shirt" or "red label is on the bottle".
- For OCR, copy visible text exactly only when you are highly confident.
- Do not infer likely text from context, logos, clothing, signs, or partial letters.
- If text is blurry, cropped, stylized, partly hidden, or uncertain, set detected_text to null.
- If multiple clearly readable texts appear, join them with " | ".
- Do not put guessed text in object_details. Only mention text in object_details when it is clearly readable and attached to a specific object.
- detected_faces must be an integer count of visible human faces.
- dominant_colors must contain at most 3 plain English color names.
- If you are uncertain about an object, omit it instead of guessing.
- Do not create a final description for the user. Return only visual facts.
- Respond with JSON only. Do not use markdown, code fences, comments, or extra text.
"""


JSON_CODE_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


class VisualAnalysisAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.llm = ChatOpenAI(model=model, max_tokens=1024)

    def _encode_image(self, image_path: str) -> str:
        """Reads a local image and converts it to a base64 string."""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _response_content_to_text(self, content: Any) -> str:
        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(str(part.get("text", "")))
                elif isinstance(part, str):
                    text_parts.append(part)
            return "\n".join(text_parts).strip()

        return str(content).strip()

    def _extract_json_text(self, text: str) -> str:
        text = text.strip()

        code_block_match = JSON_CODE_BLOCK_RE.search(text)
        if code_block_match:
            return code_block_match.group(1).strip()

        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and first_brace < last_brace:
            return text[first_brace:last_brace + 1]

        return text

    def _parse_response_json(self, content: Any) -> dict[str, Any]:
        text = self._response_content_to_text(content)
        json_text = self._extract_json_text(text)
        parsed = json.loads(json_text)

        if not isinstance(parsed, dict):
            raise ValueError("Vision model response must be a JSON object.")

        return parsed

    def _normalize_string_list(self, value: Any, max_items: int | None = None) -> list[str]:
        if value is None:
            return []

        if isinstance(value, str):
            items = [value]
        elif isinstance(value, list):
            items = value
        else:
            return []

        normalized = []
        for item in items:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                normalized.append(text)

        if max_items is not None:
            return normalized[:max_items]
        return normalized

    def _normalize_detected_text(self, value: Any) -> str | None:
        if value is None:
            return None

        if isinstance(value, list):
            text = " | ".join(str(item).strip() for item in value if str(item).strip())
        else:
            text = str(value).strip()

        uncertain_values = {
            "none",
            "null",
            "no text",
            "n/a",
            "unknown",
            "unclear",
            "unreadable",
            "illegible",
            "not readable",
            "text unclear",
        }
        if not text or text.lower() in uncertain_values:
            return None
        return text

    def _normalize_detected_faces(self, value: Any) -> int:
        if isinstance(value, bool):
            return int(value)

        if isinstance(value, int):
            return max(value, 0)

        if isinstance(value, float):
            return max(int(value), 0)

        if isinstance(value, str):
            digits = re.search(r"\d+", value)
            if digits:
                return int(digits.group(0))

        return 0

    def _normalize_optional_string(self, value: Any) -> str | None:
        if value is None:
            return None

        text = str(value).strip()
        if not text or text.lower() in {"none", "null", "n/a", "no layout"}:
            return None
        return text

    def _normalize_analysis(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "detected_objects": self._normalize_string_list(raw.get("detected_objects")),
            "foreground_objects": self._normalize_string_list(raw.get("foreground_objects")),
            "background_objects": self._normalize_string_list(raw.get("background_objects")),
            "scene_layout": self._normalize_optional_string(raw.get("scene_layout")),
            "spatial_relationships": self._normalize_string_list(raw.get("spatial_relationships")),
            "object_details": self._normalize_string_list(raw.get("object_details")),
            "detected_text": self._normalize_detected_text(raw.get("detected_text")),
            "detected_faces": self._normalize_detected_faces(raw.get("detected_faces")),
            "dominant_colors": self._normalize_string_list(raw.get("dominant_colors"), max_items=3),
        }

    def run(self, state: BlaindState) -> BlaindState:
        try:
            # Use base64 from the frontend, or encode a local image path for testing.
            if state.image_base64:
                image_data = state.image_base64
            elif state.image_path:
                image_data = self._encode_image(state.image_path)
            else:
                return state.model_copy(update={
                    "error": "No image was provided for visual analysis.",
                    "current_step": "visual_analysis_failed",
                })

            message = HumanMessage(content=[
                {"type": "text", "text": VISION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_data}"},
                },
            ])

            response = self.llm.invoke([message])
            raw = self._parse_response_json(response.content)
            analysis = self._normalize_analysis(raw)

            return state.model_copy(update={
                **analysis,
                "current_step": "visual_analysis_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"VisualAnalysisAgent error: {str(e)}",
                "current_step": "visual_analysis_failed",
            })
