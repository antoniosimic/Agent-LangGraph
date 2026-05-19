# Blaind API — Dokumentacija

## POST /api/vision/analyze

Analizira sliku i vraća tekstualni opis i audio URL.

**Request** (multipart/form-data):
| Polje | Tip | Opis |
|-------|-----|------|
| `image` | file | JPEG/PNG slika |
| `user_id` | string | Identifikator korisnika (opcionalno, default: "anonymous") |

**Response** (JSON):
```json
{
  "session_id": "uuid",
  "description": "Ispred vas se nalazi...",
  "audio_url": "/audio/abc123.mp3",
  "context_tags": ["traffic", "text"],
  "confidence_score": 0.9,
  "error": null
}
```

---

## WS /ws/{user_id}

WebSocket za real-time analizu.

**Slanje** (JSON):
```json
{ "image_base64": "base64_encoded_image..." }
```

**Primanje** — status update:
```json
{ "status": "processing", "step": "visual_analysis" }
```

**Primanje** — završetak:
```json
{
  "status": "done",
  "description": "...",
  "audio_url": "/audio/abc123.mp3",
  "context_tags": ["indoor"],
  "error": null
}
```

---

## GET /audio/{filename}

Vraća MP3 audio datoteku. Koristite URL iz `audio_url` polja odgovora.

---

## GET /health

```json
{ "status": "ok", "service": "blaind" }
```
