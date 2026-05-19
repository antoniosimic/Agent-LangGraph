"""
Memory Store — Antonio Šimić (AI/Backend Architect)

Implements persistent memory using ChromaDB (vector search) for semantic recall
and a simple JSON file as fallback when ChromaDB is unavailable.

Each user gets their own interaction history which is retrieved as context
for the SemanticInterpretationAgent.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from graph.state import BlaindState

PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))
FALLBACK_DIR = Path("./data/memory_fallback")


class MemoryStore:
    def __init__(self):
        PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
        self._chroma = self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(PERSIST_DIR))
            return client.get_or_create_collection("blaind_interactions")
        except Exception:
            return None

    def save_interaction(self, user_id: str, state: BlaindState) -> None:
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "objects": state.detected_objects,
            "context_tags": state.context_tags,
            "description": state.semantic_description,
            "detected_text": state.detected_text,
        }

        if self._chroma:
            self._save_to_chroma(user_id, record)
        else:
            self._save_to_file(user_id, record)

    def get_user_context(self, user_id: str, n_results: int = 3) -> Optional[str]:
        if self._chroma:
            return self._query_chroma(user_id, n_results)
        return self._load_from_file(user_id, n_results)

    # --- ChromaDB backend ---

    def _save_to_chroma(self, user_id: str, record: dict) -> None:
        doc_text = (
            f"Objects: {', '.join(record['objects'])}. "
            f"Tags: {', '.join(record['context_tags'])}. "
            f"Description: {record['description']}"
        )
        self._chroma.add(
            documents=[doc_text],
            metadatas=[{"user_id": user_id, "timestamp": record["timestamp"]}],
            ids=[f"{user_id}_{record['timestamp']}"],
        )

    def _query_chroma(self, user_id: str, n_results: int) -> Optional[str]:
        try:
            results = self._chroma.query(
                query_texts=["recent visual context"],
                n_results=n_results,
                where={"user_id": user_id},
            )
            docs = results.get("documents", [[]])[0]
            if not docs:
                return None
            return " | ".join(docs)
        except Exception:
            return None

    # --- File fallback backend ---

    def _save_to_file(self, user_id: str, record: dict) -> None:
        path = FALLBACK_DIR / f"{user_id}.json"
        history = []
        if path.exists():
            with open(path) as f:
                history = json.load(f)
        history.append(record)
        history = history[-20:]  # keep last 20 interactions
        with open(path, "w") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def _load_from_file(self, user_id: str, n_results: int) -> Optional[str]:
        path = FALLBACK_DIR / f"{user_id}.json"
        if not path.exists():
            return None
        with open(path) as f:
            history = json.load(f)
        recent = history[-n_results:]
        if not recent:
            return None
        snippets = [f"Objects: {', '.join(r['objects'])}" for r in recent if r.get("objects")]
        return " | ".join(snippets) if snippets else None
