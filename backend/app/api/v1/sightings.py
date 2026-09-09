from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import data_store

router = APIRouter()


@router.get("")
def list_sightings(
    entity_id: Optional[str] = None,
    location_id: Optional[str] = None,
):
    sightings = data_store.sightings
    if entity_id:
        sightings = [s for s in sightings if s.get("person_id") == entity_id]
    if location_id:
        sightings = [s for s in sightings if s.get("location_id") == location_id]

    return {"sightings": sorted(sightings, key=lambda x: x.get("timestamp", ""), reverse=True)}
