from fastapi import APIRouter, HTTPException
from typing import Optional
from app.core.database import data_store

router = APIRouter()


@router.get("")
def list_cameras(
    city: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None
):
    cameras = data_store.cameras
    if city:
        cameras = [c for c in cameras if c.get("city", "").lower() == city.lower()]
    if type:
        cameras = [c for c in cameras if c.get("type", "").lower() == type.lower()]
    if status:
        cameras = [c for c in cameras if c.get("status", "").lower() == status.lower()]
    return {"cameras": cameras, "total": len(cameras)}


@router.get("/{camera_id}")
def get_camera(camera_id: str):
    camera = next((c for c in data_store.cameras if c["id"] == camera_id), None)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    # Enrich with linked entity records and signals
    linked_entities = [p for p in data_store.persons if p["id"] in camera.get("nearby_entities", [])]
    linked_signals = [s for s in data_store.traffic_signals if s["id"] in camera.get("nearby_signals", [])]
    linked_events = [e for e in data_store.events if e["id"] in camera.get("nearby_events", [])]

    return {
        **camera,
        "entity_details": linked_entities,
        "signal_details": linked_signals,
        "event_details": linked_events,
    }
