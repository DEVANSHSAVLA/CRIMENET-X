# CRIMENET-X (Team AETHERIUS — SIH26189)
### AI-Powered Criminal Network Analysis & Geospatial Intelligence Command Center

> **Problem Statement**: SIH26189  
> **Theme**: Blockchain & Cybersecurity  
> **Team**: AETHERIUS  
> **Canonical Dataset**: CBI-Interpol Red Notices (379 official records)

---

## 🌟 Overview
CRIMENET-X transforms fragmented records (Red Notices, surveillance logs, communications, financial flows, urban infrastructure) into an explainable, 3D geospatial + knowledge graph command center.

The platform enforces a strict human-in-the-loop investigative doctrine:
$$\text{Who? (Network Graph)} \longleftrightarrow \text{Where? (3D Geospatial)} \longleftrightarrow \text{When? (Temporal Timeline)}$$
$$\Downarrow$$
$$\text{City Intelligence [CCTV + Signals + Flow]} \longleftrightarrow \text{AI Investigator [Evidence-Backed Findings]} \longleftrightarrow \text{Integrity [SHA-256 Seal]}$$

---

## 🏛️ System Architecture

```
                    ┌─────────────────────────┐
                    │       CRIMENET-X        │
                    │  Intelligence Command   │
                    │         Center          │
                    └────────────┬────────────┘
                                 │
       ┌──────────────┬──────────┼──────────┬──────────────┐
       ▼              ▼          ▼          ▼              ▼
   CBI-INTERPOL    URBAN SENSOR  KNOWLEDGE   3D GEO-INTEL   MULTILINGUAL
   RED NOTICES     INTELLIGENCE    GRAPH                    VOICE ENGINE
   (379 Records)   (CCTV/Traffic) (528 Edges) (MapLibre)    (12 Languages)
       │              │          │          │              │
       ▼              ▼          ▼          ▼              ▼
     Warrants      8 Cameras    Persons    38 Hubs        English
   Biometrics     9 Signals    Notices    Hotspots       Hindi
     Charges       Flow Bands  Brokers    Trajectories   Hinglish
   SHA-256 Hash   Congestion   Clusters   Sensors (2km)  Regional Indic
       │
       └──────────────────────────────────────────────────┐
                                                          ▼
                                              UNIFIED CONTEXT DRAWER
                                            & OFFICIAL DOSSIER GENERATOR
```

---

## 🚀 Key Intelligence Layers

1. **3D Geospatial Command Center (`/command-center`)**:
   - Dark matter MapLibre 3D engine with pitch, bearing, and fly-to animations.
   - 38 jurisdictional hubs spanning India and international extradition nodes.
   - **Urban Intelligence Layer**: 8 surveillance cameras (with simulated CCTV HUD canvas) and 9 dynamic traffic signals with real-time countdown phases.
   - **2 km Proximity Illumination**: Selecting any suspect automatically illuminates surrounding urban sensors and intersection telemetry.

2. **Network Topology & Graph Intelligence (`/network`)**:
   - Canvas-rendered Cytoscape.js engine capable of handling 5,000+ elements at 60 FPS.
   - Multi-metric centrality analysis (Degree, Betweenness, Eigenvector, PageRank).
   - Distinguishes **`SOURCE RELATIONSHIP`** (co-accused on shared court warrants) from **`DERIVED RELATIONSHIP`** (spatial/NLP ties).
   - Identifies top bridge brokers connecting criminal syndicates.

3. **Multilingual Voice Control Engine (`/api/v1/voice/command`)**:
   - Dual-script & phonetic regex classifier supporting **12 Indian languages + Hinglish**:
     - English (`en-IN`), Hindi (`hi-IN`), Hinglish, Marathi (`mr-IN`), Gujarati (`gu-IN`), Bengali (`bn-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), Kannada (`kn-IN`), Malayalam (`ml-IN`), Punjabi (`pa-IN`), Odia (`od-IN`).
   - Grounded evidence-backed spoken findings with mandatory human verification safeguards (*"मानवीय सत्यापन अनिवार्य है"*).
   - 1-click test chips in the Voice Menu for demonstration without microphone permissions.

4. **Cryptographic Evidence Repository (`/evidence`)**:
   - Every piece of evidence is sealed with an itemized **SHA-256 cryptographic hash**.
   - Tamper-evident chain of custody aligned with the SIH Blockchain & Cybersecurity theme.

5. **Timeline Intelligence (`/timeline`)**:
   - Chronological warrant and sighting chronology across 379 verified records.
   - Event type badges, confidence ratings, and linked fugitive tags.

6. **Explainable AI Investigator Copilot (`/ai-investigator`)**:
   - Grounded AI explanations without hallucinations.
   - Structured rationale citing exact warrant categories and betweenness metrics.

7. **Official Investigation Dossier Export**:
   - One-click generation of court-ready, printable Investigation Reports with security seals and chain of custody metadata.

---

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, MapLibre GL, Cytoscape.js, Recharts, Framer Motion, Lucide Icons
- **Backend**: FastAPI, NetworkX, Uvicorn, Pydantic, Python 3.11+
- **Security & Provenance**: SHA-256 Cryptographic Hashing, RBAC, Provenance Audit Trails

---

## ⚡ Quick Start Guide

### Option 1: One-Click Startup (Recommended)

From PowerShell in the project root:
```powershell
.\start-crimenet.ps1
```
or double-click:
```cmd
start-crimenet.bat
```
*(Automatically resolves port conflicts, launches backend daemon on port 8001 and frontend on port 3000, and opens `http://localhost:3000/command-center`).*

To cleanly stop all background services:
```cmd
stop-crimenet.bat
```

### Option 2: Manual Startup

#### 1. Backend Service (Port 8001)
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Interactive Swagger Documentation: `http://localhost:8001/docs`

#### 2. Frontend Application (Port 3000)
```powershell
cd frontend
npm install
npm run dev -- -p 3000
```
Command Center Console: `http://localhost:3000/command-center`

---

## 🛡️ Responsible AI & Data Safeguards

- **Privacy Protection**: Exact residential coordinates are never fabricated. Where precise coordinates are unavailable, regional approximate centroids are labeled: `"SYNTHETIC / DEMONSTRATION LOCATION"`.
- **Transparency**: Simulated cameras and signals carry permanent disclaimers (`SIMULATED SENSOR FEED [DEMO]`, `URBAN SENSOR MODEL`).
- **Human-in-the-Loop**: AI outputs represent investigative leads requiring human investigator verification. The system never autonomously declares guilt or speaks verdicts.
