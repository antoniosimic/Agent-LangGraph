# Testovi za SemanticInterpretationAgent — koriste mock LLM kako bi testovi bili brzi
# i neovisni o API ključevima.

from unittest.mock import MagicMock, patch

from graph.state import BlaindState
from agents.semantic_interpretation_agent import SemanticInterpretationAgent


def _napravi_state(**kwargs) -> BlaindState:
    """Pomoćna funkcija — vraća BlaindState s razumnim zadanim vrijednostima."""
    defaults = {
        "user_id": "test",
        "detected_objects": ["car", "road", "traffic sign"],
        "foreground_objects": ["traffic sign"],
        "background_objects": ["car", "road"],
        "scene_layout": "The traffic sign is in the foreground with the road behind it.",
        "spatial_relationships": ["traffic sign is in front of the road"],
        "object_details": ["STOP text is printed on the traffic sign"],
        "dominant_colors": ["red", "white", "gray"],
    }
    defaults.update(kwargs)
    return BlaindState(**defaults)


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_uspjesan_opis(mock_llm_class):
    """Agent treba vratiti opis i current_step == done."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(
        content="A red STOP sign is in front of you, with a gray road behind it."
    )
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(_napravi_state())

    assert result.semantic_description is not None
    assert result.current_step == "semantic_interpretation_done"
    assert result.confidence_score > 0


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_tagovi_promet(mock_llm_class):
    """Traffic-related objects should generate the 'traffic' tag."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="A stop sign is on the road.")
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(
        _napravi_state(detected_objects=["car", "road", "sign"])
    )

    assert "traffic" in result.context_tags


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_greska_api_poziva(mock_llm_class):
    """Ako LLM baci iznimku, agent treba postaviti error u state."""
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = Exception("API error")
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(_napravi_state())

    assert result.error is not None
    assert "SemanticInterpretationAgent" in result.error


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_overload_vraca_fallback_opis(mock_llm_class):
    """Provider overload should return a useful fallback instead of a hard error."""
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = Exception("Error code: 529 - overloaded_error")
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(_napravi_state())

    assert result.error is None
    assert result.current_step == "semantic_interpretation_fallback"
    assert result.semantic_description is not None
    assert "traffic sign" in result.semantic_description


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_prompt_uses_spatial_fields(mock_llm_class):
    """Semantic agent should receive layout, relationships, and object details."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="A sign is in front of the road.")
    mock_llm_class.return_value = mock_llm

    SemanticInterpretationAgent().run(_napravi_state())

    messages = mock_llm.invoke.call_args.args[0]
    prompt = messages[1].content
    assert "Scene layout:" in prompt
    assert "Spatial relationships:" in prompt
    assert "Object details:" in prompt
    assert "STOP text is printed on the traffic sign" in prompt
