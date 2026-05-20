# LangGraph workflow - orchestrates Blaind agents.

import json
import os
import time
from typing import Callable

from langgraph.graph import END, StateGraph

from agents.semantic_interpretation_agent import SemanticInterpretationAgent
from agents.speech_interaction_agent import SpeechInteractionAgent
from agents.visual_analysis_agent import VisualAnalysisAgent
from graph.state import BlaindState
from memory.memory_store import MemoryStore


def _workflow_logging_enabled() -> bool:
    return os.getenv("WORKFLOW_LOGGING", "true").lower() in {"1", "true", "yes", "on"}


def _state_for_log(state: BlaindState) -> dict:
    return {
        "current_step": state.current_step,
        "user_id": state.user_id,
        "session_id": state.session_id,
        "has_image_base64": bool(state.image_base64),
        "image_base64_length": len(state.image_base64 or ""),
        "has_image_path": bool(state.image_path),
        "memory_context_present": bool(state.memory_context),
        "detected_objects": state.detected_objects,
        "foreground_objects": state.foreground_objects,
        "background_objects": state.background_objects,
        "scene_layout": state.scene_layout,
        "spatial_relationships": state.spatial_relationships,
        "object_details": state.object_details,
        "detected_text": state.detected_text,
        "detected_faces": state.detected_faces,
        "dominant_colors": state.dominant_colors,
        "semantic_description": state.semantic_description,
        "context_tags": state.context_tags,
        "confidence_score": state.confidence_score,
        "audio_path_present": bool(state.audio_path),
        "error": state.error,
    }


def _log_agent_boundary(label: str, state: BlaindState, duration_ms: int | None = None) -> None:
    if not _workflow_logging_enabled():
        return

    payload = _state_for_log(state)
    if duration_ms is not None:
        payload["duration_ms"] = duration_ms
    print(f"\n[workflow] {label}")
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def _run_logged(
    label: str,
    state: BlaindState,
    fn: Callable[[BlaindState], BlaindState],
) -> BlaindState:
    _log_agent_boundary(f"{label}:input", state)
    started_at = time.perf_counter()
    updated = fn(state)
    duration_ms = round((time.perf_counter() - started_at) * 1000)
    _log_agent_boundary(f"{label}:output", updated, duration_ms)
    return updated


def build_graph() -> StateGraph:
    visual_agent = VisualAnalysisAgent()
    semantic_agent = SemanticInterpretationAgent()
    backend_tts_enabled = os.getenv("ENABLE_BACKEND_TTS", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    speech_agent = SpeechInteractionAgent() if backend_tts_enabled else None
    memory_store = MemoryStore()

    def load_memory(state: BlaindState) -> BlaindState:
        def _load(state_to_update: BlaindState) -> BlaindState:
            context = memory_store.get_user_context(state_to_update.user_id)
            return state_to_update.model_copy(update={
                "memory_context": context,
                "current_step": "memory_loaded",
            })

        return _run_logged("load_memory", state, _load)

    def run_visual_analysis(state: BlaindState) -> BlaindState:
        return _run_logged("visual_analysis", state, visual_agent.run)

    def run_semantic_interpretation(state: BlaindState) -> BlaindState:
        return _run_logged("semantic_interpretation", state, semantic_agent.run)

    def run_speech(state: BlaindState) -> BlaindState:
        def _speech(state_to_update: BlaindState) -> BlaindState:
            if speech_agent is None:
                return state_to_update.model_copy(update={"current_step": "speech_skipped"})
            return speech_agent.run(state_to_update)

        return _run_logged("speech", state, _speech)

    def save_memory(state: BlaindState) -> BlaindState:
        def _save(state_to_update: BlaindState) -> BlaindState:
            memory_store.save_interaction(state_to_update.user_id, state_to_update)
            return state_to_update.model_copy(update={"current_step": "done"})

        return _run_logged("save_memory", state, _save)

    def should_continue(state: BlaindState) -> str:
        return "error" if state.error else "continue"

    graph = StateGraph(BlaindState)

    graph.add_node("load_memory", load_memory)
    graph.add_node("visual_analysis", run_visual_analysis)
    graph.add_node("semantic_interpretation", run_semantic_interpretation)
    if backend_tts_enabled:
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
        {"continue": "speech" if backend_tts_enabled else "save_memory", "error": END},
    )
    if backend_tts_enabled:
        graph.add_edge("speech", "save_memory")
    graph.add_edge("save_memory", END)

    return graph.compile()


blaind_graph = build_graph()
