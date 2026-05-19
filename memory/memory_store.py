# Memory Store — Antonio Šimić (AI/Backend Architect)
# Pamti prethodne interakcije korisnika kako bi SemanticInterpretationAgent
# mogao personalizirati opise za povratne korisnike.
#
# Primarni backend: ChromaDB (vektorska baza)
# Fallback: JSON fajl po korisniku (ako ChromaDB nije instaliran/dostupan)

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
        """Pokušava inicijalizirati ChromaDB; ako nije dostupan, vraća None."""
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(PERSIST_DIR))
            return client.get_or_create_collection("blaind_interactions")
        except Exception:
            return None

    # --- Javno sučelje ---

    def save_interaction(self, user_id: str, state: BlaindState) -> None:
        """Sprema rezultate jedne analize u memoriju."""
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

    def save_raw(self, user_id: str, objects: list[str], description: str) -> None:
        """Sprema sirove podatke bez BlaindState-a (koristi ga MCP tool)."""
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "objects": objects,
            "context_tags": [],
            "description": description,
            "detected_text": None,
        }
        if self._chroma:
            self._save_to_chroma(user_id, record)
        else:
            self._save_to_file(user_id, record)

    def get_user_context(self, user_id: str, n_results: int = 3) -> Optional[str]:
        """Dohvaća sažetak zadnjih n_results interakcija za korisnika."""
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
            return " | ".join(docs) if docs else None
        except Exception:
            return None

    # --- JSON fallback backend ---

    def _save_to_file(self, user_id: str, record: dict) -> None:
        path = FALLBACK_DIR / f"{user_id}.json"
        history = json.loads(path.read_text()) if path.exists() else []
        history.append(record)
        path.write_text(json.dumps(history[-20:], ensure_ascii=False, indent=2))

    def _load_from_file(self, user_id: str, n_results: int) -> Optional[str]:
        path = FALLBACK_DIR / f"{user_id}.json"
        if not path.exists():
            return None
        history = json.loads(path.read_text())
        snippets = [
            f"Objekti: {', '.join(r['objects'])}"
            for r in history[-n_results:]
            if r.get("objects")
        ]
        return " | ".join(snippets) if snippets else None
