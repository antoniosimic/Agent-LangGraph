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
| `VisualAnalysisAgent` | Analiza slike: oblici, boje, lica, OCR | Marin Grković |
| `SemanticInterpretationAgent` | Daje kontekst i značenje sirovoj analizi | Antonio Šimić |
| `SpeechInteractionAgent` | Text-to-Speech, audio povratna informacija | Barbara Bobeta |

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
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. Instalirati ovisnosti
pip install -r requirements.txt

# 4. Postaviti environment varijable
cp .env.example .env
# Otvoriti .env i upisati OPENAI_API_KEY i ANTHROPIC_API_KEY

# 5. Kreirati potrebne direktorije
mkdir -p temp/audio

# 6. Pokrenuti backend
uvicorn api.main:app --reload

# 7. Pokrenuti frontend (u novom terminalu)
cd frontend
npm install
npm run dev
```

Otvori **http://localhost:3000** u browseru.

## Pokretanje na mobitelu

Mobilni browser zahtijeva HTTPS za pristup kameri. Postoje dva načina:

### Opcija A — Android Chrome (ista WiFi mreža)

Mobitel i računalo moraju biti spojeni na **isti WiFi**.

1. Pronađi lokalnu IP adresu računala:
   ```bash
   ipconfig getifaddr en0
   # npr. 192.168.1.119
   ```

2. Pokreni backend i frontend da slušaju na svim sučeljima:
   ```bash
   # Terminal 1
   uvicorn api.main:app --reload --host 0.0.0.0

   # Terminal 2
   cd frontend
   npm run dev -- --hostname 0.0.0.0
   ```

3. Na Android mobitelu otvori Chrome i idi na:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```

4. U tekstualno polje upiši lokalnu adresu računala (s portom):
   ```
   http://192.168.1.119:3000
   ```

5. Postavi dropdown na **Enabled**, klikni **Relaunch**.

6. Otvori `http://192.168.1.119:3000` u Chromeu — kamera će raditi.

### Opcija B — HTTPS tunel (Android i iPhone)

Koristi [localtunnel](https://github.com/localtunnel/localtunnel) — ne zahtijeva account:

```bash
# Terminal 3 (frontend mora biti pokrenut)
npx localtunnel --port 3000
```

Otvori dobiveni `https://....loca.lt` URL na mobitelu. Ako zatraži lozinku, upiši lokalnu IP adresu računala.

> **Napomena:** Backend ostaje na lokalnoj mreži — Next.js proxy preusmjerava API pozive server-side pa nije potreban drugi tunel.

### Problemi s kamerom

- **Kamera se zamrzne ili prikazuje crni ekran** → Refreshaj stranicu (povuci prema dolje ili pritisni F5). Kamera se ponekad ne oslobodi ispravno između snimaka.
- **Nema zvuka** → Provjeri da stranica nije mutirana u browser postavkama i da je Sound gumb u appu uključen.
- **Ne može se prebaciti kamera** → Refreshaj stranicu i pokušaj ponovo.

## Tim — Blaind

| Uloga | Član |
|-------|------|
| AI/Backend Architect | Antonio Šimić |
| Team Lead / Frontend | Jakov Malić |
| Computer Vision | Marin Grković |
| Audio & API | Barbara Bobeta  |
| QA & Dokumentacija | Član 5 |
