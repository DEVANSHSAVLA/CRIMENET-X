from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import data_store

router = APIRouter()


@router.get("/{case_id}")
def get_timeline(
    case_id: str,
    entity_id: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    events = data_store.events

    if entity_id:
        events = [e for e in events if entity_id in e.get("entities", [])]
    if event_type:
        events = [e for e in events if e.get("type", "").upper() == event_type.upper()]
    if start_date:
        events = [e for e in events if e.get("timestamp", "") >= start_date]
    if end_date:
        events = [e for e in events if e.get("timestamp", "") <= end_date]

    # Enrich with location names
    loc_lookup = {l["id"]: l for l in data_store.locations}
    enriched = []
    for e in sorted(events, key=lambda x: x.get("timestamp", "")):
        loc = loc_lookup.get(e.get("location_id", ""), {})
        enriched.append({
            **e,
            "location_name": loc.get("name", "Unknown"),
            "location_city": loc.get("city", "Unknown"),
        })

    return {"events": enriched, "total": len(enriched)}
