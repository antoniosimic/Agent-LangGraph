# Blaind — Arhitektura sustava

## Tok podataka

```
[Kamera / Slika]
       │
       ▼
[load_memory node]         ← ChromaDB / fallback JSON
       │
       ▼
[VisualAnalysisAgent]      ← GPT-4o Vision
  - detected_objects
  - foreground / background
  - detected_text (OCR)
  - dominant_colors
  - detected_faces
       │
       ▼
[SemanticInterpretationAgent]  ← Claude Opus
  - semantic_description
  - context_tags
  - confidence_score
       │
       ▼
[SpeechInteractionAgent]   ← gTTS
  - audio_path (.mp3)
       │
       ▼
[save_memory node]         → ChromaDB / fallback JSON
       │
       ▼
[API Response]
  - description (tekst)
  - audio_url  (MP3)
  - context_tags
```

## LangGraph čvorovi

| Čvor | Ulaz | Izlaz |
|------|------|-------|
| `load_memory` | `user_id` | `memory_context`, `is_returning_user` |
| `visual_analysis` | `image_base64` | `detected_objects`, `foreground_objects`, ... |
| `semantic_interpretation` | visual data + memory | `semantic_description`, `context_tags` |
| `speech` | `tts_text` | `audio_path` |
| `save_memory` | cijeli state | — |

## API endpointi

| Metoda | Ruta | Opis |
|--------|------|------|
| POST | `/api/vision/analyze` | Upload slike, pokretanje pipeline-a |
| GET | `/audio/{filename}` | Dohvat MP3 audio opisa |
| WS | `/ws/{user_id}` | Real-time analiza putem WebSocketa |
| GET | `/health` | Health check |

## Memorija

- **ChromaDB** (primarno): vektorska baza za semantičko pretraživanje prethodnih interakcija
- **JSON fallback** (`./data/memory_fallback/`): automatski se koristi ako ChromaDB nije dostupan
- Svaki korisnik dobiva vlastiti namespace po `user_id`
- Čuva se zadnjih 20 interakcija po korisniku

## MCP alati

| Alat | Opis |
|------|------|
| `get_user_memory` | Dohvaća kontekst prethodnih interakcija |
| `save_user_observation` | Sprema novu vizualnu observaciju |
