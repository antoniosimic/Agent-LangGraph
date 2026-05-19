# Testovi za MemoryStore — testiraju JSON fallback backend (bez ChromaDB)

import pytest

from graph.state import BlaindState


@pytest.fixture
def memory_store(monkeypatch, tmp_path):
    """Vraća MemoryStore s privremenim direktorijima koji se brišu nakon testa."""
    monkeypatch.setenv("CHROMA_PERSIST_DIR", str(tmp_path / "chroma"))
    monkeypatch.setattr("memory.memory_store.FALLBACK_DIR", tmp_path / "fallback")
    (tmp_path / "fallback").mkdir()

    from memory.memory_store import MemoryStore
    store = MemoryStore()
    store._chroma = None  # forsiramo JSON fallback
    return store


def test_spremi_i_ucitaj(memory_store):
    """Zapisana interakcija treba biti vidljiva pri dohvatu konteksta."""
    state = BlaindState(
        user_id="u1",
        detected_objects=["stol", "lampa"],
        semantic_description="Drveni stol s lampom.",
        context_tags=["unutarnji prostor"],
    )
    memory_store.save_interaction("u1", state)
    context = memory_store.get_user_context("u1")

    assert context is not None
    assert "stol" in context or "lampa" in context


def test_nepostojeci_korisnik_vraca_none(memory_store):
    """Korisnik bez prethodnih interakcija treba dobiti None."""
    assert memory_store.get_user_context("nepostojeci") is None


def test_save_raw(memory_store):
    """save_raw treba raditi isto kao save_interaction bez BlaindState-a."""
    memory_store.save_raw("u2", ["bicikl", "ulica"], "Bicikl na ulici.")
    context = memory_store.get_user_context("u2")

    assert context is not None
    assert "bicikl" in context or "ulica" in context
