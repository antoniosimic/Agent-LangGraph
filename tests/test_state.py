# Testovi za BlaindState — provjeravaju zadane vrijednosti i nepromjenljivost originala

from graph.state import BlaindState


def test_zadane_vrijednosti():
    """State s minimalnim parametrima treba imati ispravne zadane vrijednosti."""
    state = BlaindState(user_id="test_user", session_id="abc")
    assert state.user_id == "test_user"
    assert state.error is None
    assert state.detected_objects == []
    assert state.confidence_score == 0.0
    assert state.audio_path is None


def test_kopiranje_state_a():
    """model_copy ne smije mijenjati originalni state."""
    state = BlaindState(user_id="u1")
    updated = state.model_copy(update={"current_step": "done", "confidence_score": 0.9})
    assert updated.current_step == "done"
    assert updated.confidence_score == 0.9
    assert state.current_step == "init"  # original ostaje nepromijenjen
