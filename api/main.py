# FastAPI Backend — Član 4 (Audio Integration & API)
# Ulazna točka backend servera. Pokreće se s: uvicorn api.main:app --reload

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

load_dotenv()

from api.routes import vision
from api.websocket import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Osiguravamo da direktorij za audio fajlove postoji pri pokretanju
    os.makedirs("./temp/audio", exist_ok=True)
    yield


app = FastAPI(
    title="Blaind API",
    description="Univerzalni vizualni interpretator za slijepe osobe",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — dozvoljava sve origine (za razvoj; u produkciji sužiti na domenu frontenda)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision.router, prefix="/api/vision", tags=["vision"])
app.include_router(ws_router, tags=["websocket"])

# Audio fajlovi se serviraju statički s /audio/{filename}
app.mount("/audio", StaticFiles(directory="./temp/audio"), name="audio")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "blaind"}
