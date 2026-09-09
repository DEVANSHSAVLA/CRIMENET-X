from fastapi import APIRouter, Query
from typing import Optional
from app.core.database import data_store
from app.services.graph_service import graph_service

router = APIRouter()


@router.get("")
def list_entities(
    type: Optional[str] = None,
    risk_level: Optional[str] = None,
    cluster: Optional[str] = None,
    search: Optional[str] = None,
):
    entities = data_store.persons
    if type:
        entities = [e for e in entities if e.get("type", "").upper() == type.upper()]
    if risk_level:
        entities = [e for e in entities if e.get("risk_level", "").upper() == risk_level.upper()]
    if cluster:
        entities = [e for e in entities if e.get("cluster", "").upper() == cluster.upper()]
    if search:
        q = search.lower()
        entities = [e for e in entities if q in e.get("name", "").lower() or q in e.get("id", "").lower()]

    result = []
    for e in entities:
        cent = graph_service.get_entity_centrality(e["id"]) or {}
        result.append({
            **e,
            "centrality_score": cent.get("combined_score", 0),
            "connections_count": cent.get("degree", 0),
        })

    return {"entities": sorted(result, key=lambda x: x.get("centrality_score", 0), reverse=True)}


@router.get("/{entity_id}")
def get_entity(entity_id: str):
    person = next((p for p in data_store.persons if p["id"] == entity_id), None)
    if not person:
        return {"error": "Entity not found"}

    # Centrality
    cent = graph_service.get_entity_centrality(entity_id) or {}

    # Connections
    ego = graph_service.get_ego_network(entity_id, depth=1)

    # Events
    entity_events = [e for e in data_store.events if entity_id in e.get("entities", [])][:20]

    # Sightings / location history
    entity_sightings = sorted(
        [s for s in data_store.sightings if s.get("person_id") == entity_id],
        key=lambda x: x.get("timestamp", "")
    )

    # AI explanation
    explanation = graph_service.explain_entity(
        entity_id, data_store.persons, data_store.relationships,
        data_store.events, data_store.sightings
    )

    return {
        **person,
        "centrality": cent,
        "connections": ego,
        "events": entity_events,
        "location_history": entity_sightings,
        "explanation": explanation,
    }
