# LangGraph workflow — Antonio Šimić (AI/Backend Architect)
# Definira redoslijed agenata i uvjetno grananje u slučaju greške.

from langgraph.graph import StateGraph, END

from graph.state import BlaindState
from agents.visual_analysis_agent import VisualAnalysisAgent
from agents.semantic_interpretation_agent import SemanticInterpretationAgent
from agents.speech_interaction_agent import SpeechInteractionAgent
from memory.memory_store import MemoryStore


def build_graph() -> StateGraph:
    visual_agent = VisualAnalysisAgent()
    semantic_agent = SemanticInterpretationAgent()
    speech_agent = SpeechInteractionAgent()
    memory_store = MemoryStore()

    # Svaki čvor prima BlaindState i vraća ažurirani BlaindState

    def load_memory(state: BlaindState) -> BlaindState:
        """Učitava kontekst prethodnih interakcija ovog korisnika."""
        context = memory_store.get_user_context(state.user_id)
        return state.model_copy(update={
            "memory_context": context,
            "current_step": "memory_loaded",
        })

    def run_visual_analysis(state: BlaindState) -> BlaindState:
        return visual_agent.run(state)

    def run_semantic_interpretation(state: BlaindState) -> BlaindState:
        return semantic_agent.run(state)

    def run_speech(state: BlaindState) -> BlaindState:
        return speech_agent.run(state)

    def save_memory(state: BlaindState) -> BlaindState:
        """Sprema rezultate analize u memoriju za buduće interakcije."""
        memory_store.save_interaction(state.user_id, state)
        return state.model_copy(update={"current_step": "done"})

    def should_continue(state: BlaindState) -> str:
        """Ako je agent vratio grešku, prekidamo workflow."""
        return "error" if state.error else "continue"

    graph = StateGraph(BlaindState)

    graph.add_node("load_memory", load_memory)
    graph.add_node("visual_analysis", run_visual_analysis)
    graph.add_node("semantic_interpretation", run_semantic_interpretation)
    graph.add_node("speech", run_speech)
    graph.add_node("save_memory", save_memory)

    graph.set_entry_point("load_memory")
    graph.add_edge("load_memory", "visual_analysis")

    graph.add_conditional_edges(
        "visual_analysis",
        should_continue,
        {"continue": "semantic_interpretation", "error": END},
    )
    graph.add_conditional_edges(
        "semantic_interpretation",
        should_continue,
        {"continue": "speech", "error": END},
    )
    graph.add_edge("speech", "save_memory")
    graph.add_edge("save_memory", END)

    return graph.compile()


# Singleton instanca — uvoziti u API-ju
blaind_graph = build_graph()
