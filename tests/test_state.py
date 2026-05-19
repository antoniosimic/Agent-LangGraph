from graph.state import BlaindState


def test_default_state():
    state = BlaindState(user_id="test_user", session_id="abc")
    assert state.user_id == "test_user"
    assert state.error is None
    assert state.detected_objects == []
    assert state.confidence_score == 0.0


def test_state_copy_update():
    state = BlaindState(user_id="u1")
    updated = state.model_copy(update={"current_step": "done", "confidence_score": 0.9})
    assert updated.current_step == "done"
    assert updated.confidence_score == 0.9
    assert state.current_step == "init"  # original unchanged
