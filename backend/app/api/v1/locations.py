from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from app.core.database import data_store
import math

router = APIRouter()


def _geo_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates approximate distance between two points on Earth in km."""
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371.0 * c


@router.get("")
def list_locations(
    city: Optional[str] = None,
    risk_level: Optional[str] = None,
    type: Optional[str] = None,
):
    locations = data_store.locations
    if city:
        locations = [l for l in locations if l.get("city", "").upper() == city.upper()]
    if risk_level:
        locations = [l for l in locations if l.get("risk_level", "").upper() == risk_level.upper()]
    if type:
        locations = [l for l in locations if l.get("type", "").upper() == type.upper()]

    return {"locations": locations, "total": len(locations)}


@router.get("/{location_id}")
def get_location_detail(location_id: str):
    """
    Returns rich investigative location profile linking:
    - Associated Cases
    - Associated Persons
    - Associated Events
    - Nearby Surveillance Cameras
    - Nearby Traffic Signals
    - Linked Evidence Records
    """
    loc = next((l for l in data_store.locations if l.get("id") == location_id), None)
    if not loc:
        raise HTTPException(status_code=404, detail="Location record not found")

    lat = loc.get("lat", 0.0)
    lng = loc.get("lng", 0.0)

    # 1. Associated Events
    events = [e for e in data_store.events if e.get("location_id") == location_id]
    if not events and loc.get("name"):
        # Match by name/city
        events = [e for e in data_store.events if e.get("location_name") == loc.get("name") or e.get("location_city") == loc.get("city")]

    # 2. Associated Persons (from events + persons with primary_location_id)
    linked_person_ids = set()
    for e in events:
        for pid in e.get("entities", []):
            linked_person_ids.add(pid)
    for p in data_store.persons:
        if p.get("primary_location_id") == location_id or p.get("primary_city") == loc.get("city"):
            linked_person_ids.add(p["id"])

    associated_persons = []
    for pid in list(linked_person_ids)[:25]:
        p = next((x for x in data_store.persons if x["id"] == pid), None)
        if p:
            associated_persons.append({
                "id": p["id"],
                "name": p.get("display_name", p.get("name")),
                "role": p.get("role", "Suspect"),
                "risk_level": p.get("risk_level", "HIGH"),
                "notice_id": p.get("notice_id"),
                "cluster": p.get("cluster_name", "Syndicate")
            })

    # 3. Associated Cases
    associated_cases = [
        {
            "id": "CNX-2026-041",
            "name": "Operation Shadow Network",
            "status": "ACTIVE",
            "relevance": "Primary Multi-City Syndicate Investigation"
        },
        {
            "id": "CBI-INTERPOL-RED-379",
            "name": "Interpol Red Notice Warrant Registry",
            "status": "ACTIVE",
            "relevance": f"{len(associated_persons)} Linked Fugitives"
        }
    ]

    # 4. Nearby Cameras (within 25km radius)
    nearby_cameras = []
    for cam in data_store.cameras:
        c_lat, c_lng = cam.get("lat", 0.0), cam.get("lng", 0.0)
        dist = _geo_distance_km(lat, lng, c_lat, c_lng)
        if dist <= 25.0 or cam.get("city", "").upper() == loc.get("city", "").upper():
            nearby_cameras.append({
                "id": cam.get("id"),
                "name": cam.get("name"),
                "status": cam.get("status", "ONLINE"),
                "stream_type": cam.get("stream_type", "SIMULATED FEED"),
                "distance_km": round(dist, 2)
            })

    # 5. Nearby Traffic Signals
    nearby_signals = []
    for sig in data_store.traffic_signals:
        s_lat, s_lng = sig.get("lat", 0.0), sig.get("lng", 0.0)
        dist = _geo_distance_km(lat, lng, s_lat, s_lng)
        if dist <= 25.0 or sig.get("city", "").upper() == loc.get("city", "").upper():
            nearby_signals.append({
                "id": sig.get("id"),
                "intersection": sig.get("intersection"),
                "phase": sig.get("phase", "GREEN"),
                "traffic_density": sig.get("traffic_density", "MEDIUM"),
                "distance_km": round(dist, 2)
            })

    # 6. Linked Evidence
    associated_evidence = [
        ev for ev in data_store.evidence
        if ev.get("person_id") in linked_person_ids
    ][:5]

    return {
        **loc,
        "associated_cases": associated_cases,
        "associated_persons": associated_persons,
        "associated_events": events[:20],
        "nearby_cameras": nearby_cameras[:10],
        "nearby_signals": nearby_signals[:10],
        "associated_evidence": associated_evidence,
        "provenance_type": loc.get("provenance_type", "SOURCE-DERIVED"),
        "total_associated_persons": len(associated_persons),
        "total_associated_events": len(events)
    }
