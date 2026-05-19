"""
MCP Tools — Antonio Šimić (AI/Backend Architect)

Exposes Blaind's memory and visual history as MCP-compatible tools
so agents can query them natively as part of their tool-calling loop.
"""

from langchain_core.tools import tool
from memory.memory_store import MemoryStore

_store = MemoryStore()


@tool
def get_user_memory(user_id: str) -> str:
    """
    Retrieve recent visual interaction history for a specific user.
    Returns a text summary of what the user has previously seen.
    """
    context = _store.get_user_context(user_id)
    if context:
        return f"Previous interactions for user '{user_id}': {context}"
    return f"No previous interactions found for user '{user_id}'."


@tool
def save_user_observation(user_id: str, objects: str, description: str) -> str:
    """
    Save a new visual observation to the user's memory.
    Args:
        user_id: unique user identifier
        objects: comma-separated list of detected objects
        description: the semantic description that was generated
    """
    from graph.state import BlaindState
    mock_state = BlaindState(
        user_id=user_id,
        detected_objects=objects.split(","),
        semantic_description=description,
    )
    _store.save_interaction(user_id, mock_state)
    return f"Saved observation for user '{user_id}'."


MCP_TOOLS = [get_user_memory, save_user_observation]
