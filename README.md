# Blaind — Univerzalni vizualni interpretator za slijepe osobe

Višeagentski sustav koji korištenjem kamere mobitela analizira vizualne informacije iz okoline i pretvara ih u glasovni opis za slijepe osobe.

## Arhitektura

```
Kamera → Visual Analysis Agent → Semantic Interpretation Agent → Speech & Interaction Agent → Audio
                                          ↕
                                    Memory / MCP
```

### Agenti

| Agent | Odgovornost | Vlasnik |
|-------|-------------|---------|
| `VisualAnalysisAgent` | Analiza slike: oblici, boje, lica, OCR | Član 3 |
| `SemanticInterpretationAgent` | Daje kontekst i značenje sirovoj analizi | Antonio Šimić |
| `SpeechInteractionAgent` | Text-to-Speech, audio povratna informacija | Član 4 |

## Struktura projekta

```
blaind/
├── agents/                  # Definicije svih agenata
│   ├── visual_analysis_agent.py
│   ├── semantic_interpretation_agent.py
│   └── speech_interaction_agent.py
├── graph/                   # LangGraph workflow i state
│   ├── workflow.py
│   └── state.py
├── memory/                  # Memorija sustava (ChromaDB + Redis)
│   └── memory_store.py
├── mcp/                     # Model Context Protocol integracija
│   └── mcp_tools.py
├── api/                     # FastAPI backend
│   ├── main.py
│   └── routes/
│       ├── vision.py
│       └── audio.py
├── frontend/                # Next.js mobilno/web sučelje
│   └── src/
└── tests/                   # Unit i integracijski testovi
```

## Pokretanje

```bash
# 1. Klonirati repozitorij
git clone https://github.com/antoniosimic/Agent-LangGraph.git blaind
cd blaind

# 2. Postaviti virtualno okruženje
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Instalirati ovisnosti
pip install -r requirements.txt

# 4. Postaviti environment varijable
cp .env.example .env
# Urediti .env s API ključevima

# 5. Pokrenuti backend
uvicorn api.main:app --reload

# 6. Pokrenuti frontend (u novom terminalu)
cd frontend
npm install
npm run dev
```

## Tim — Blaind

| Uloga | Član |
|-------|------|
| AI/Backend Architect | Antonio Šimić |
| Team Lead / Frontend | Jakov Malić |
| Computer Vision | Član 3 |
| Audio & API | Član 4 |
| QA & Dokumentacija | Član 5 |
