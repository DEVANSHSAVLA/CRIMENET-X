from fastapi import APIRouter
from app.core.database import data_store
from app.services.graph_service import graph_service
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/centrality")
def get_centrality():
    """Get centrality rankings for all entities."""
    rankings = graph_service.get_centrality_rankings()
    return {"rankings": rankings}


@router.get("/communities")
def get_communities():
    """Get detected network communities."""
    return {"communities": graph_service.get_communities()}


@router.get("/anomalies")
def get_anomalies():
    """Get all detected suspicious patterns."""
    graph_anomalies = graph_service.get_anomalies()
    location_anomalies = analytics_service.detect_location_anomalies(
        data_store.sightings, data_store.locations
    )
    transaction_anomalies = analytics_service.detect_transaction_patterns(
        data_store.transactions
    )
    all_anomalies = graph_anomalies + location_anomalies + transaction_anomalies
    return {
        "anomalies": all_anomalies,
        "total": len(all_anomalies),
        "by_type": {
            "bridge_actors": len([a for a in all_anomalies if "Bridge" in a.get("type", "")]),
            "communication_bursts": len([a for a in all_anomalies if "Burst" in a.get("type", "")]),
            "circular_flows": len([a for a in all_anomalies if "Circular" in a.get("type", "")]),
            "geographic": len([a for a in all_anomalies if "Geographic" in a.get("type", "")]),
            "financial": len([a for a in all_anomalies if "Value" in a.get("type", "")]),
        }
    }


@router.get("/stats")
def get_stats():
    """Get comprehensive dashboard statistics."""
    return analytics_service.get_stats(data_store)
