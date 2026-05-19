"""
FastAPI Backend — Member 4 (Audio Integration & API Engineer)

Entry point for the Blaind backend API.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import vision, audio
from api.websocket import router as ws_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("./temp/audio", exist_ok=True)
    yield


app = FastAPI(
    title="Blaind API",
    description="Universal Visual Interpreter for blind people",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vision.router, prefix="/api/vision", tags=["vision"])
app.include_router(audio.router, prefix="/api/audio", tags=["audio"])
app.include_router(ws_router, tags=["websocket"])

app.mount("/audio", StaticFiles(directory="./temp/audio"), name="audio")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "blaind"}
