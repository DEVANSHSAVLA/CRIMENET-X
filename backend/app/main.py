from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import data_store
from app.services.graph_service import graph_service
from app.services.analytics_service import analytics_service
from app.services.ai_service import ai_service

from app.api.v1.cases import router as cases_router
from app.api.v1.entities import router as entities_router
from app.api.v1.network import router as network_router
from app.api.v1.locations import router as locations_router
from app.api.v1.sightings import router as sightings_router
from app.api.v1.timeline import router as timeline_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.ai import router as ai_router
from app.api.v1.auth import router as auth_router
from app.api.v1.cameras import router as cameras_router
from app.api.v1.traffic import router as traffic_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.voice import router as voice_router
from app.api.v1.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 60)
    print("  CRIMENET-X (Team AETHERIUS) Intelligence API - Starting Up")
    print("=" * 60)

    # 1. Load data
    print("\n[1/3] Loading Red Notice intelligence dataset...")
    data_store.load_data()

    # 2. Build graph and compute analytics
    print("[2/3] Building knowledge graph & computing analytics...")
    graph_service.build_graph(data_store.persons, data_store.relationships)

    # 3. Initialize AI service
    print("[3/3] Initializing AI Investigator...")
    ai_service.initialize(graph_service, data_store)

    print("\n" + "=" * 60)
    print("  CRIMENET-X Intelligence API - OPERATIONAL")
    print(f"  Persons: {len(data_store.persons)} | Notices: {len(data_store.notices)} | Locations: {len(data_store.locations)} | Events: {len(data_store.events)} | Cameras: {len(data_store.cameras)} | Signals: {len(data_store.traffic_signals)}")
    print("=" * 60 + "\n")

    yield

    print("CRIMENET-X Intelligence API - Shutting down")


app = FastAPI(
    title="CRIMENET-X Intelligence API",
    description="Team AETHERIUS (SIH26189) - AI-Powered Criminal Network & Geospatial Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router, prefix="/api/v1/cases", tags=["Cases"])
app.include_router(entities_router, prefix="/api/v1/entities", tags=["Entities"])
app.include_router(network_router, prefix="/api/v1/network", tags=["Network"])
app.include_router(locations_router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(sightings_router, prefix="/api/v1/sightings", tags=["Sightings"])
app.include_router(timeline_router, prefix="/api/v1/timeline", tags=["Timeline"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI Investigator"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(cameras_router, prefix="/api/v1/cameras", tags=["Urban Cameras"])
app.include_router(traffic_router, prefix="/api/v1/traffic", tags=["Urban Traffic Signals & Flow"])
app.include_router(evidence_router, prefix="/api/v1/evidence", tags=["Evidence Integrity"])
app.include_router(voice_router, prefix="/api/v1/voice", tags=["Voice Commands"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Investigation Reports"])


@app.get("/")
def root():
    return {
        "status": "operational",
        "name": "CRIMENET-X Intelligence API",
        "team": "AETHERIUS",
        "problem_statement": "SIH26189",
        "version": "2.0.0",
        "case": "CBI-INTERPOL-RED-379",
        "endpoints": {
            "docs": "/docs",
            "cases": "/api/v1/cases/CBI-INTERPOL-RED-379",
            "entities": "/api/v1/entities",
            "network": "/api/v1/network/CBI-INTERPOL-RED-379",
            "cameras": "/api/v1/cameras",
            "traffic_signals": "/api/v1/traffic/signals",
            "traffic_flow": "/api/v1/traffic/flow",
            "evidence": "/api/v1/evidence",
            "analytics": "/api/v1/analytics/stats",
        }
    }
