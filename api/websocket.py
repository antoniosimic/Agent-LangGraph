# WebSocket endpoint — Član 4 (Audio Integration & API)
# Frontend se spaja na /ws/{user_id} i šalje slike kao base64.
# Server šalje JSON statusne poruke i finalni rezultat u realnom vremenu.

import json
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from graph.state import BlaindState
from graph.workflow import blaind_graph

router = APIRouter()


def _as_blaind_state(result: BlaindState | dict) -> BlaindState:
    if isinstance(result, BlaindState):
        return result
    return BlaindState.model_validate(result)


@router.websocket("/ws/{user_id}")
async def websocket_analyze(websocket: WebSocket, user_id: str):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            image_base64 = payload.get("image_base64")

            if not image_base64:
                await websocket.send_json({"error": "Nije proslijeđena slika."})
                continue

            await websocket.send_json({"status": "processing", "step": "visual_analysis"})

            result = _as_blaind_state(
                await blaind_graph.ainvoke(
                    BlaindState(image_base64=image_base64, user_id=user_id)
                )
            )

            audio_url = f"/audio/{Path(result.audio_path).name}" if result.audio_path else None

            await websocket.send_json({
                "status": "done",
                "description": result.semantic_description,
                "audio_url": audio_url,
                "context_tags": result.context_tags,
                "error": result.error,
            })

    except WebSocketDisconnect:
        pass
