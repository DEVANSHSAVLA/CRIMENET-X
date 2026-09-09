from fastapi import APIRouter, Query
from typing import Optional
from app.services.graph_service import graph_service

router = APIRouter()


@router.get("/{case_id}")
def get_network(case_id: str):
    """Get full network graph in Cytoscape.js format."""
    network = graph_service.get_full_network()
    communities = graph_service.get_communities()
    return {
        **network,
        "communities": communities
    }


@router.get("/{entity_id}/neighbors")
def get_neighbors(entity_id: str, depth: int = Query(default=2, ge=1, le=4)):
    """Get ego network for a specific entity."""
    return graph_service.get_ego_network(entity_id, depth=depth)
