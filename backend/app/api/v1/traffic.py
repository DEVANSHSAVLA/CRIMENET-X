from fastapi import APIRouter, HTTPException
from typing import Optional
from app.core.database import data_store

router = APIRouter()


@router.get("/signals")
def list_traffic_signals(city: Optional[str] = None, phase: Optional[str] = None):
    signals = data_store.traffic_signals
    if city:
        signals = [s for s in signals if s.get("city", "").lower() == city.lower()]
    if phase:
        signals = [s for s in signals if s.get("phase", "").upper() == phase.upper()]
    return {"signals": signals, "total": len(signals)}


@router.get("/signals/{signal_id}")
def get_traffic_signal(signal_id: str):
    sig = next((s for s in data_store.traffic_signals if s["id"] == signal_id), None)
    if not sig:
        raise HTTPException(status_code=404, detail="Traffic signal not found")

    linked_entities = [p for p in data_store.persons if p["id"] in sig.get("nearby_entities", [])]
    linked_cameras = [c for c in data_store.cameras if c["id"] in sig.get("nearby_cameras", [])]

    return {
        **sig,
        "entity_details": linked_entities,
        "camera_details": linked_cameras
    }


@router.get("/flow")
def get_traffic_flow():
    return {"corridors": data_store.traffic_flow, "total": len(data_store.traffic_flow)}
