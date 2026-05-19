# Testovi za SemanticInterpretationAgent — koriste mock LLM kako bi testovi bili brzi
# i neovisni o API ključevima.

from unittest.mock import MagicMock, patch

from graph.state import BlaindState
from agents.semantic_interpretation_agent import SemanticInterpretationAgent


def _napravi_state(**kwargs) -> BlaindState:
    """Pomoćna funkcija — vraća BlaindState s razumnim zadanim vrijednostima."""
    defaults = {
        "user_id": "test",
        "detected_objects": ["auto", "cesta", "prometni znak"],
        "foreground_objects": ["prometni znak"],
        "background_objects": ["auto", "cesta"],
        "dominant_colors": ["crvena", "bijela", "siva"],
    }
    defaults.update(kwargs)
    return BlaindState(**defaults)


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_uspjesan_opis(mock_llm_class):
    """Agent treba vratiti opis i current_step == done."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(
        content="Ispred vas je crveni znak STOP, a iza njega je siva cesta."
    )
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(_napravi_state())

    assert result.semantic_description is not None
    assert result.current_step == "semantic_interpretation_done"
    assert result.confidence_score > 0


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_tagovi_promet(mock_llm_class):
    """Objekti vezani uz promet trebaju generirati tag 'promet'."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(content="Prometni znak stop na cesti.")
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(
        _napravi_state(detected_objects=["auto", "cesta", "znak"])
    )

    assert "promet" in result.context_tags


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_greska_api_poziva(mock_llm_class):
    """Ako LLM baci iznimku, agent treba postaviti error u state."""
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = Exception("API error")
    mock_llm_class.return_value = mock_llm

    result = SemanticInterpretationAgent().run(_napravi_state())

    assert result.error is not None
    assert "SemanticInterpretationAgent" in result.error
