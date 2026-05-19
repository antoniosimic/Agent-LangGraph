# Semantic Interpretation Agent — Antonio Šimić (AI/Backend Architect)
# Prima sirove vizualne podatke i pretvara ih u smisleni, kontekstualni opis za slijepu osobu.

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from graph.state import BlaindState


SYSTEM_PROMPT = """
You are an expert at turning raw visual observations into clear, meaningful descriptions
for blind people. Your descriptions must be:
- Concise (2-4 sentences max)
- Human and natural sounding
- Contextually intelligent (e.g. "a red STOP sign" not "a red octagon with white text")
- Prioritized: describe foreground elements first, then background
- Accessible: avoid jargon, explain any text found in the image

If user memory context is provided, personalize the description accordingly
(e.g. reference familiar locations or objects the user has encountered before).
"""

# Ključne riječi za automatsku kategorizaciju scene
TAG_KEYWORDS: dict[str, list[str]] = {
    "promet": ["car", "bus", "road", "street", "sign", "crosswalk"],
    "unutarnji prostor": ["desk", "chair", "table", "shelf", "screen"],
    "osoba": ["face", "person", "people", "human"],
    "priroda": ["tree", "grass", "sky", "flower", "water"],
    "tekst": ["text", "sign", "label", "poster", "screen"],
}


class SemanticInterpretationAgent:
    def __init__(self, model: str = "claude-opus-4-7"):
        self.llm = ChatAnthropic(model=model, max_tokens=512)

    def _build_prompt(self, state: BlaindState) -> str:
        """Gradi prompt od vizualnih podataka u state-u."""
        lines = ["Based on this visual analysis, create a description for a blind person:"]
        lines.append(f"\nObjects detected: {', '.join(state.detected_objects)}")
        lines.append(f"In foreground: {', '.join(state.foreground_objects)}")
        lines.append(f"In background: {', '.join(state.background_objects)}")
        lines.append(f"Dominant colors: {', '.join(state.dominant_colors)}")

        if state.detected_text:
            lines.append(f"Text visible: {state.detected_text}")
        if state.detected_faces > 0:
            lines.append(f"Number of faces: {state.detected_faces}")

        # Ako postoji memorija korisnika, dodajemo je kao kontekst
        if state.memory_context:
            lines.append(f"\nUser memory context: {state.memory_context}")
            lines.append("Use this context to make the description more relevant to this user.")

        return "\n".join(lines)

    def run(self, state: BlaindState) -> BlaindState:
        try:
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=self._build_prompt(state)),
            ]
            response = self.llm.invoke(messages)
            description = response.content.strip()

            return state.model_copy(update={
                "semantic_description": description,
                "context_tags": self._extract_tags(state),
                "confidence_score": self._estimate_confidence(state),
                "current_step": "semantic_interpretation_done",
            })

        except Exception as e:
            return state.model_copy(update={
                "error": f"SemanticInterpretationAgent greška: {str(e)}",
                "current_step": "semantic_interpretation_failed",
            })

    def _extract_tags(self, state: BlaindState) -> list[str]:
        """Prepoznaje kategoriju scene prema prepoznatim objektima."""
        all_objects_str = " ".join(
            o.lower() for o in state.detected_objects + state.foreground_objects
        )
        # Koristimo set odmah kako bismo izbjegli duplikate
        tags = {
            tag
            for tag, triggers in TAG_KEYWORDS.items()
            if any(t in all_objects_str for t in triggers)
        }
        if state.detected_text:
            tags.add("tekst")
        return list(tags)

    def _estimate_confidence(self, state: BlaindState) -> float:
        """Gruba procjena kvalitete vizualne analize (0.0 – 1.0)."""
        score = 0.5
        if state.detected_objects:
            score += 0.2
        if state.foreground_objects:
            score += 0.1
        if state.dominant_colors:
            score += 0.1
        if state.detected_text:
            score += 0.1
        return min(score, 1.0)
