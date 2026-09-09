from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import data_store

router = APIRouter()


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

    return {"locations": locations}
