# MCP Tools — Antonio Šimić (AI/Backend Architect)
# Izlaže memoriju sustava kao MCP-kompatibilne alate koje agenti mogu
# pozivati nativno kao dio svog tool-calling loopa.

from langchain_core.tools import tool
from memory.memory_store import MemoryStore

_store = MemoryStore()


@tool
def get_user_memory(user_id: str) -> str:
    """Dohvaća sažetak prethodnih vizualnih interakcija korisnika."""
    context = _store.get_user_context(user_id)
    if context:
        return f"Prethodne interakcije korisnika '{user_id}': {context}"
    return f"Nema prethodnih interakcija za korisnika '{user_id}'."


@tool
def save_user_observation(user_id: str, objects: str, description: str) -> str:
    """
    Sprema novu vizualnu observaciju u memoriju korisnika.

    Argumenti:
        user_id: identifikator korisnika
        objects: objekti odvojeni zarezom (npr. "stol, stolica, ekran")
        description: semantički opis scene
    """
    _store.save_raw(
        user_id=user_id,
        objects=[o.strip() for o in objects.split(",")],
        description=description,
    )
    return f"Observacija uspješno spremljena za korisnika '{user_id}'."


MCP_TOOLS = [get_user_memory, save_user_observation]
