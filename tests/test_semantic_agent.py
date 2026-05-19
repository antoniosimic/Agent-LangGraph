from unittest.mock import MagicMock, patch

from graph.state import BlaindState
from agents.semantic_interpretation_agent import SemanticInterpretationAgent


def _make_state(**kwargs) -> BlaindState:
    defaults = {
        "user_id": "test",
        "detected_objects": ["car", "road", "traffic sign"],
        "foreground_objects": ["traffic sign"],
        "background_objects": ["car", "road"],
        "dominant_colors": ["red", "white", "grey"],
    }
    defaults.update(kwargs)
    return BlaindState(**defaults)


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_semantic_agent_success(mock_llm_class):
    mock_response = MagicMock()
    mock_response.content = "A red STOP sign is in the foreground, with a grey road behind it."
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = mock_response
    mock_llm_class.return_value = mock_llm

    agent = SemanticInterpretationAgent()
    state = _make_state()
    result = agent.run(state)

    assert result.semantic_description is not None
    assert result.current_step == "semantic_interpretation_done"
    assert result.confidence_score > 0


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_semantic_agent_tags_traffic(mock_llm_class):
    mock_response = MagicMock()
    mock_response.content = "A stop sign on the road."
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = mock_response
    mock_llm_class.return_value = mock_llm

    agent = SemanticInterpretationAgent()
    state = _make_state(detected_objects=["car", "road", "sign"])
    result = agent.run(state)

    assert "traffic" in result.context_tags


@patch("agents.semantic_interpretation_agent.ChatAnthropic")
def test_semantic_agent_error_handling(mock_llm_class):
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = Exception("API error")
    mock_llm_class.return_value = mock_llm

    agent = SemanticInterpretationAgent()
    result = agent.run(_make_state())

    assert result.error is not None
    assert "SemanticInterpretationAgent" in result.error
