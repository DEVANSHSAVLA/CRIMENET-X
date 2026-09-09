from fastapi import APIRouter
from app.core.database import data_store
from app.services.graph_service import graph_service

router = APIRouter()


@router.get("/{case_id}")
def get_case(case_id: str):
    case = data_store.cases
    if isinstance(case, list):
        case = next((c for c in case if c.get("id") == case_id), case[0] if case else {})
    elif isinstance(case, dict) and case.get("id") != case_id:
        pass

    # Enrich with live stats
    communities = graph_service.get_communities()
    anomalies = graph_service.get_anomalies()

    return {
        "id": case.get("id", case_id),
        "name": case.get("name", "Unknown Case"),
        "status": case.get("status", "ACTIVE"),
        "description": case.get("description", ""),
        "created_at": case.get("created_at", ""),
        "risk_level": case.get("risk_level", "HIGH"),
        "stats": {
            "persons": len(data_store.persons),
            "notices": len(data_store.notices),
            "locations": len(data_store.locations),
            "events": len(data_store.events),
            "relationships": len(data_store.relationships),
            "evidence": len(data_store.evidence),
            "cameras": len(data_store.cameras),
            "traffic_signals": len(data_store.traffic_signals),
            "communities": len(communities),
            "anomalies": len(anomalies),
            "phones": len(data_store.phones),
            "vehicles": len(data_store.vehicles),
        }
    }
