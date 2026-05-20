# Semantic Interpretation Agent - turns visual facts into an accessible scene description.

import time

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from graph.state import BlaindState


SYSTEM_PROMPT = """
You convert raw visual observations into clear, useful spoken descriptions for blind
and low-vision users.

Rules:
- Be concise: 2-4 short sentences.
- Put safety-relevant information first: obstacles, vehicles, stairs, crossings, doors, and nearby people.
- Preserve spatial relationships from the visual analysis: left/right, near/far, in front/behind, and what text belongs to which object.
- Do not invent objects, text, relationships, identities, emotions, or intent that are not present in the visual analysis.
- If a relationship or object is uncertain, use cautious wording such as "appears to" or omit it.
- Mention visible text only when detected_text or object_details explicitly provide clear text.
- Never guess or complete text from context. If the visual analysis does not confidently provide text, do not mention text.
- If object_details says text belongs to an object, preserve that attachment exactly, for example text on a shirt or sign.
- Use memory context only when it is directly relevant to the current visual observations. Do not over-reference past context.
- Avoid technical jargon and avoid mentioning internal agent names.
"""


TAG_KEYWORDS: dict[str, list[str]] = {
    "traffic": ["car", "bus", "road", "street", "sign", "crosswalk"],
    "indoor": ["desk", "chair", "table", "shelf", "screen", "door"],
    "people": ["face", "person", "people", "human"],
    "nature": ["tree", "grass", "sky", "flower", "water"],
    "text": ["text", "sign", "label", "poster", "screen", "shirt"],
}


class SemanticInterpretationAgent:
    def __init__(self, model: str = "claude-opus-4-7"):
        self.llm = ChatAnthropic(model=model, max_tokens=512)
        self.max_retries = 2
        self.retry_delay_seconds = 1.0

    def _build_prompt(self, state: BlaindState) -> str:
        lines = ["Based on this visual analysis, create a description for a blind person:"]
        lines.append(f"\nObjects detected: {', '.join(state.detected_objects)}")
        lines.append(f"In foreground: {', '.join(state.foreground_objects)}")
        lines.append(f"In background: {', '.join(state.background_objects)}")
        if state.scene_layout:
            lines.append(f"Scene layout: {state.scene_layout}")
        if state.spatial_relationships:
            lines.append(f"Spatial relationships: {' | '.join(state.spatial_relationships)}")
        if state.object_details:
            lines.append(f"Object details: {' | '.join(state.object_details)}")
        lines.append(f"Dominant colors: {', '.join(state.dominant_colors)}")

        if state.detected_text:
            lines.append(f"Text visible: {state.detected_text}")
        else:
            lines.append("Text visible: none confidently detected")
        if state.detected_faces > 0:
            lines.append(f"Number of faces: {state.detected_faces}")

        if state.memory_context:
            lines.append(f"\nUser memory context: {state.memory_context}")
            lines.append(
                "Use memory only if it directly matches the current visual observations. "
                "Do not force references to prior context."
            )

        return "\n".join(lines)

    def run(self, state: BlaindState) -> BlaindState:
        try:
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=self._build_prompt(state)),
            ]
            response = self._invoke_with_retries(messages)
            description = response.content.strip()

            return state.model_copy(update={
                "semantic_description": description,
                "context_tags": self._extract_tags(state),
                "confidence_score": self._estimate_confidence(state),
                "current_step": "semantic_interpretation_done",
            })

        except Exception as e:
            if self._is_transient_provider_error(e):
                description = self._fallback_description(state)
                return state.model_copy(update={
                    "semantic_description": description,
                    "context_tags": self._extract_tags(state),
                    "confidence_score": min(self._estimate_confidence(state), 0.65),
                    "current_step": "semantic_interpretation_fallback",
                })

            return state.model_copy(update={
                "error": f"SemanticInterpretationAgent error: {str(e)}",
                "current_step": "semantic_interpretation_failed",
            })

    def _invoke_with_retries(self, messages):
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                return self.llm.invoke(messages)
            except Exception as e:
                last_error = e
                if not self._is_transient_provider_error(e) or attempt >= self.max_retries:
                    raise
                delay = self.retry_delay_seconds * (attempt + 1)
                print(
                    f"[semantic_agent] Provider overloaded or temporarily unavailable. "
                    f"Retrying in {delay:.1f}s..."
                )
                time.sleep(delay)
        raise last_error

    def _is_transient_provider_error(self, error: Exception) -> bool:
        text = str(error).lower()
        return any(
            marker in text
            for marker in [
                "529",
                "overloaded",
                "rate limit",
                "temporarily unavailable",
                "timeout",
                "service unavailable",
            ]
        )

    def _fallback_description(self, state: BlaindState) -> str:
        parts = []
        if state.foreground_objects:
            parts.append(f"Closest visible items: {', '.join(state.foreground_objects)}.")
        elif state.detected_objects:
            parts.append(f"Visible items: {', '.join(state.detected_objects[:5])}.")

        if state.scene_layout:
            parts.append(state.scene_layout)
        if state.spatial_relationships:
            parts.append(" ".join(state.spatial_relationships[:2]))
        if state.object_details:
            parts.append(" ".join(state.object_details[:2]))
        if state.detected_text:
            parts.append(f"Clearly readable text: {state.detected_text}.")

        if not parts:
            return "I can see the image, but the description service is temporarily overloaded."

        return " ".join(parts)

    def _extract_tags(self, state: BlaindState) -> list[str]:
        all_objects_str = " ".join(
            item.lower()
            for item in (
                state.detected_objects
                + state.foreground_objects
                + state.background_objects
                + state.spatial_relationships
                + state.object_details
            )
        )
        tags = {
            tag
            for tag, triggers in TAG_KEYWORDS.items()
            if any(trigger in all_objects_str for trigger in triggers)
        }
        if state.detected_text:
            tags.add("text")
        return list(tags)

    def _estimate_confidence(self, state: BlaindState) -> float:
        score = 0.5
        if state.detected_objects:
            score += 0.2
        if state.foreground_objects:
            score += 0.1
        if state.scene_layout or state.spatial_relationships or state.object_details:
            score += 0.1
        if state.dominant_colors:
            score += 0.1
        if state.detected_text:
            score += 0.1
        return min(score, 1.0)
