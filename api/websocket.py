"""
WebSocket endpoint — Member 4 (Audio Integration & API Engineer)

Allows real-time streaming of analysis progress to the frontend.
Client connects to /ws/{user_id} and receives JSON status updates.
"""

import base64
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from graph.state import BlaindState
from graph.workflow import blaind_graph

router = APIRouter()


@router.websocket("/ws/{user_id}")
async def websocket_analyze(websocket: WebSocket, user_id: str):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            image_base64 = payload.get("image_base64")

            if not image_base64:
                await websocket.send_json({"error": "No image provided"})
                continue

            await websocket.send_json({"status": "processing", "step": "visual_analysis"})

            initial_state = BlaindState(
                image_base64=image_base64,
                user_id=user_id,
            )

            result: BlaindState = await blaind_graph.ainvoke(initial_state)

            audio_url = None
            if result.audio_path:
                filename = result.audio_path.split("/")[-1].split("\\")[-1]
                audio_url = f"/audio/{filename}"

            await websocket.send_json({
                "status": "done",
                "description": result.semantic_description,
                "audio_url": audio_url,
                "context_tags": result.context_tags,
                "error": result.error,
            })

    except WebSocketDisconnect:
        pass
