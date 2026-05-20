# Testovi za VisualAnalysisAgent - mockaju OpenAI poziv kako ne bi trosili API.

from unittest.mock import MagicMock, patch

from agents.visual_analysis_agent import VisualAnalysisAgent
from graph.state import BlaindState


def _state_sa_slikom(**kwargs) -> BlaindState:
    defaults = {
        "user_id": "test",
        "session_id": "session-1",
        "image_base64": "fake-base64-image-data",
    }
    defaults.update(kwargs)
    return BlaindState(**defaults)


@patch("agents.visual_analysis_agent.ChatOpenAI")
def test_uspjesna_vizualna_analiza(mock_llm_class):
    """Agent treba popuniti state kada model vrati ispravan JSON."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(
        content="""
        {
          "detected_objects": ["person", "door", "bag"],
          "foreground_objects": ["person", "bag"],
          "background_objects": ["door"],
          "detected_text": "EXIT",
          "detected_faces": 1,
          "dominant_colors": ["blue", "gray", "white"]
        }
        """
    )
    mock_llm_class.return_value = mock_llm

    result = VisualAnalysisAgent().run(_state_sa_slikom())

    assert result.current_step == "visual_analysis_done"
    assert result.error is None
    assert result.detected_objects == ["person", "door", "bag"]
    assert result.foreground_objects == ["person", "bag"]
    assert result.background_objects == ["door"]
    assert result.detected_text == "EXIT"
    assert result.detected_faces == 1
    assert result.dominant_colors == ["blue", "gray", "white"]


@patch("agents.visual_analysis_agent.ChatOpenAI")
def test_greska_kada_nema_slike(mock_llm_class):
    """Ako nema slike u state-u, agent treba vratiti error i ne zvati model."""
    mock_llm = MagicMock()
    mock_llm_class.return_value = mock_llm

    result = VisualAnalysisAgent().run(BlaindState(user_id="test"))

    assert result.current_step == "visual_analysis_failed"
    assert result.error is not None
    assert "slika" in result.error.lower()
    mock_llm.invoke.assert_not_called()


@patch("agents.visual_analysis_agent.ChatOpenAI")
def test_rubni_slucaj_markdown_json_i_normalizacija(mock_llm_class):
    """Agent treba izvuci JSON iz markdown bloka i normalizirati cudne tipove."""
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = MagicMock(
        content="""```json
        {
          "detected_objects": "traffic sign",
          "foreground_objects": [" traffic sign ", null],
          "background_objects": ["road", "building"],
          "detected_text": ["STOP", "A1"],
          "detected_faces": "2 faces",
          "dominant_colors": ["red", "gray", "green", "blue"]
        }
        ```"""
    )
    mock_llm_class.return_value = mock_llm

    result = VisualAnalysisAgent().run(_state_sa_slikom())

    assert result.current_step == "visual_analysis_done"
    assert result.detected_objects == ["traffic sign"]
    assert result.foreground_objects == ["traffic sign"]
    assert result.background_objects == ["road", "building"]
    assert result.detected_text == "STOP | A1"
    assert result.detected_faces == 2
    assert result.dominant_colors == ["red", "gray", "green"]
