import shutil
import tempfile
from pathlib import Path

import pytest

from graph.state import BlaindState


@pytest.fixture
def temp_memory_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))
    monkeypatch.setattr("memory.memory_store.FALLBACK_DIR", tmp_path / "fallback")
    (tmp_path / "fallback").mkdir()
    return tmp_path


def test_save_and_load_fallback(temp_memory_dir):
    from memory.memory_store import MemoryStore

    store = MemoryStore()
    store._chroma = None  # force fallback

    state = BlaindState(
        user_id="u1",
        detected_objects=["table", "lamp"],
        semantic_description="A wooden table with a lamp.",
        context_tags=["indoor"],
    )
    store.save_interaction("u1", state)
    context = store.get_user_context("u1")

    assert context is not None
    assert "table" in context or "lamp" in context


def test_no_memory_returns_none(temp_memory_dir):
    from memory.memory_store import MemoryStore

    store = MemoryStore()
    store._chroma = None

    result = store.get_user_context("nonexistent_user")
    assert result is None
