from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import re
from app.services.ai_service import ai_service
from app.services.graph_service import graph_service
from app.core.database import data_store

router = APIRouter()


class VoiceRequest(BaseModel):
    transcript: str
    context_entity_id: Optional[str] = None
    language: Optional[str] = "auto"
    pending_options: Optional[List[Dict[str, Any]]] = None  # for numeric disambiguation like "number two"


# ── Language Detection & Normalization Helper ────────────────────────────
def detect_language(text: str, user_lang: Optional[str] = None) -> str:
    if user_lang and user_lang != "auto":
        return user_lang
    
    # Unicode script heuristics for Indian languages
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:  # Devanagari (Hindi / Marathi)
            if any(w in text.lower() for w in ["आहे", "दाखवा", "सांगा", "कॅमेरा", "स्थान"]):
                return "mr-IN"
            return "hi-IN"
        elif 0x0980 <= code <= 0x09FF:  # Bengali
            return "bn-IN"
        elif 0x0A00 <= code <= 0x0A7F:  # Gurmukhi (Punjabi)
            return "pa-IN"
        elif 0x0A80 <= code <= 0x0AFF:  # Gujarati
            return "gu-IN"
        elif 0x0B00 <= code <= 0x0B7F:  # Odia
            return "od-IN"
        elif 0x0B80 <= code <= 0x0BFF:  # Tamil
            return "ta-IN"
        elif 0x0C00 <= code <= 0x0C7F:  # Telugu
            return "te-IN"
        elif 0x0C80 <= code <= 0x0CFF:  # Kannada
            return "kn-IN"
        elif 0x0D00 <= code <= 0x0D7F:  # Malayalam
            return "ml-IN"
            
    # Hinglish detection (Latin script with Hindi phonetics)
    hinglish_keywords = [
        "dikhao", "karo", "kyu", "kyun", "karan", "batao", "shuru", "juda", "hai",
        "aas", "paas", "kholo", "roko", "agli", "pichli", "kaun", "kahan", "kab", "inhe",
        "isko", "iske", "ye", "yeh", "dono", "desh", "ghatna", "saakshya"
    ]
    if any(k in text.lower() for k in hinglish_keywords):
        return "hi-IN"
        
    return "en-IN"


def is_indic_language(lang: str) -> bool:
    return lang in ["hi-IN", "mr-IN", "gu-IN", "bn-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN", "pa-IN", "od-IN"]


@router.post("/command")
def process_voice_command(req: VoiceRequest):
    raw_text = req.transcript.strip()
    t = raw_text.lower()
    lang = detect_language(raw_text, req.language)
    is_indic = is_indic_language(lang)
    active_entity = req.context_entity_id or "P-017"

    # ── 0. NUMERIC DISAMBIGUATION RESOLUTION ("number two", "option 1", "second one") ──
    if req.pending_options and len(req.pending_options) > 0:
        num_map = {
            "one": 0, "first": 0, "1": 0, "pehla": 0, "ek": 0, "एक": 0,
            "two": 1, "second": 1, "2": 1, "doosra": 1, "do": 1, "दो": 1,
            "three": 2, "third": 2, "3": 2, "teesra": 2, "teen": 2, "तीन": 2,
            "four": 3, "fourth": 3, "4": 3, "chaar": 3, "चार": 3,
        }
        for word, idx in num_map.items():
            if re.search(rf"\b(number\s*)?{word}\b", t) or f"option {word}" in t:
                if idx < len(req.pending_options):
                    chosen = req.pending_options[idx]
                    spoken = f"Selected {chosen.get('label', chosen.get('id'))}."
                    return {
                        "intent": "SELECT_ENTITY",
                        "confidence": 0.98,
                        "language": lang,
                        "transcript": raw_text,
                        "entities": [chosen.get("id")],
                        "parameters": {"chosen_option": chosen},
                        "requires_confirmation": False,
                        "spoken_response": spoken,
                        "action": "SELECT_ENTITY",
                        "target": chosen.get("id"),
                        "data": chosen,
                        "is_disambiguation": False,
                        "feedback_notice": f"✓ Selected option {idx + 1}: {chosen.get('label', chosen.get('id'))}"
                    }

    # ── 1. SECURITY & RBAC GUARDS ──────────────────────────────────────────
    # Destructive Case Actions
    if any(k in t for k in ["delete this case", "delete case", "remove case", "delete investigation", "case delete karo", "case mita do"]) or ("delete" in t and "case" in t):
        return {
            "intent": "DELETE_CASE",
            "confidence": 0.99,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"case_id": "CBI-INTERPOL-RED-379"},
            "requires_confirmation": True,
            "confirmation_message": "CRITICAL: Deleting case CBI-INTERPOL-RED-379 is restricted. Requires senior administrator confirmation.",
            "spoken_response": "Destructive action blocked. Case deletion requires administrator authorization and confirmation.",
            "action": "REQUIRE_SECURITY_CONFIRMATION",
            "target": "CBI-INTERPOL-RED-379",
            "data": {"operation": "DELETE_CASE"},
            "feedback_notice": "⚠️ Operation requires administrative confirmation"
        }

    # Privilege Escalation
    if any(k in t for k in ["change my role to admin", "make me admin", "role admin karo", "give me admin", "admin access do"]):
        return {
            "intent": "PRIVILEGE_ESCALATION",
            "confidence": 0.99,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Access denied. Privilege escalation via voice commands is strictly prohibited under RBAC policy.",
            "action": "ACCESS_DENIED",
            "target": "SECURITY",
            "data": {"status": "FORBIDDEN"},
            "feedback_notice": "⛔ Access Denied: Voice privilege escalation prohibited"
        }

    # Protected Evidence Reveal Guard
    if any(k in t for k in ["reveal protected hash", "reveal evidence hash", "show secret hash", "hash reveal karo", "gupt hash dikhao"]):
        return {
            "intent": "REVEAL_PROTECTED_HASH",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Evidence SHA-256 hash is cryptographically protected. Please enter officer clearance password in the prompt.",
            "action": "PROMPT_AUTH_REVEAL",
            "target": "EVIDENCE",
            "data": {},
            "feedback_notice": "🔒 Security Clearance Required to reveal evidence hash"
        }

    # ── 2. GENERAL NAVIGATION INTENTS ─────────────────────────────────────
    # Command Center
    if any(k in t for k in ["command center", "overview", "dashboard", "home", "main screen", "kendra"]):
        return {
            "intent": "NAVIGATE_COMMAND_CENTER",
            "confidence": 0.97,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Navigating to Command Center overview." if not is_indic else "कमांड सेंटर मुख्य पृष्ठ पर ले जाया जा रहा है।",
            "action": "NAVIGATE_COMMAND_CENTER",
            "target": "/command-center",
            "data": {},
            "feedback_notice": "✓ Navigating to Command Center"
        }

    # Geo Intelligence
    if any(k in t for k in ["geo intelligence", "open map", "map view", "map page", "nakshe pe jao", "naksha kholo"]):
        return {
            "intent": "OPEN_GEO",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Opening 3D Geospatial Intelligence map." if not is_indic else "3D भू-स्थानिक मानचित्र पृष्ठ खोला जा रहा है।",
            "action": "OPEN_GEO",
            "target": "/geo-intelligence",
            "data": {},
            "feedback_notice": "✓ Opening Geo Intelligence"
        }

    # Evidence Vault
    if any(k in t for k in ["open evidence", "evidence vault", "show evidence", "evidence kholo", "saboot kholo", "saakshya dikhao"]):
        return {
            "intent": "OPEN_EVIDENCE",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Opening verified Evidence Repository." if not is_indic else "सत्यापित साक्ष्य रिपोजिटरी खोली जा रही है।",
            "action": "OPEN_EVIDENCE",
            "target": "/evidence",
            "data": {},
            "feedback_notice": "✓ Opening Evidence Vault"
        }

    # Admin Panel
    if any(k in t for k in ["open admin", "admin settings", "system status", "admin kholo"]):
        return {
            "intent": "OPEN_ADMIN",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Opening Administration and System Telemetry." if not is_indic else "प्रशासन और सिस्टम टेलीमेट्री खोली जा रही है।",
            "action": "OPEN_ADMIN",
            "target": "/admin",
            "data": {},
            "feedback_notice": "✓ Opening Admin Panel"
        }

    # ── 3. TIMELINE PLAYBACK & CONTROLS ───────────────────────────────────
    # Play Timeline
    if ("play" in t and "timeline" in t) or any(k in t for k in ["timeline shuru karo", "timeline chalao", "start timeline"]):
        return {
            "intent": "PLAY_TIMELINE",
            "confidence": 0.97,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"playing": True},
            "requires_confirmation": False,
            "spoken_response": "Starting chronological timeline playback." if not is_indic else "कालानुक्रमिक घटनाक्रम प्लेबैक शुरू किया गया।",
            "action": "PLAY_TIMELINE",
            "target": "TIMELINE",
            "data": {"playing": True},
            "feedback_notice": "▶ Playing timeline chronologically"
        }

    # Pause Timeline
    if ("pause" in t and "timeline" in t) or any(k in t for k in ["stop timeline", "timeline pause karo", "timeline roko"]):
        return {
            "intent": "PAUSE_TIMELINE",
            "confidence": 0.97,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"playing": False},
            "requires_confirmation": False,
            "spoken_response": "Timeline playback paused." if not is_indic else "घटनाक्रम प्लेबैक रोक दिया गया।",
            "action": "PAUSE_TIMELINE",
            "target": "TIMELINE",
            "data": {"playing": False},
            "feedback_notice": "⏸ Timeline paused"
        }

    # Next / Previous Event
    if any(k in t for k in ["next event", "agli ghatna", "forward event", "next in timeline"]):
        return {
            "intent": "NEXT_EVENT",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Advancing to next chronological event." if not is_indic else "अगली कालानुक्रमिक घटना पर आगे बढ़ रहे हैं।",
            "action": "NEXT_EVENT",
            "target": "TIMELINE",
            "data": {},
            "feedback_notice": "⏭ Stepping to next event"
        }
    if any(k in t for k in ["previous event", "pichli ghatna", "earlier event", "step back"]):
        return {
            "intent": "PREVIOUS_EVENT",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Stepping back to previous chronological event." if not is_indic else "पिछली कालानुक्रमिक घटना पर वापस जा रहे हैं।",
            "action": "PREVIOUS_EVENT",
            "target": "TIMELINE",
            "data": {},
            "feedback_notice": "⏮ Stepping to previous event"
        }

    # Navigate to Timeline Page
    if any(k in t for k in ["timeline", "chronology", "temporal", "events list", "ghatnaye dikhao", "kab kya hua", "samay rekha"]):
        return {
            "intent": "OPEN_TIMELINE",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Displaying chronological investigation timeline across verified warrant records." if not is_indic else "सत्यापित साक्ष्य और रेड नोटिस घटनाक्रम प्रदर्शित किया जा रहा है।",
            "action": "NAVIGATE_TIMELINE",
            "target": "/timeline",
            "data": {"total_events": len(data_store.events)},
            "feedback_notice": "✓ Navigating to Timeline"
        }

    # ── 4. ANALYTICS INTENTS ──────────────────────────────────────────────
    # Countries breakdown
    if any(k in t for k in ["show countries", "countries breakdown", "desh dikhao", "which countries", "international jurisdictions"]):
        return {
            "intent": "SHOW_COUNTRIES",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Displaying suspect distribution across international jurisdictions." if not is_indic else "अंतर्राष्ट्रीय अधिकार क्षेत्रों में संदिग्धों का वितरण प्रदर्शित किया जा रहा है।",
            "action": "SHOW_COUNTRIES",
            "target": "/analytics",
            "data": {},
            "feedback_notice": "✓ Opening Countries Analytics"
        }

    # Centrality Rankings
    if any(k in t for k in ["centrality ranking", "centrality rankings", "top entities", "most central", "ranking dikhao", "pramukh vyakti"]):
        return {
            "intent": "SHOW_CENTRALITY",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Presenting top network centrality rankings." if not is_indic else "नेटवर्क केंद्रीयता की शीर्ष रैंकिंग प्रदर्शित की जा रही है।",
            "action": "SHOW_CENTRALITY",
            "target": "/analytics",
            "data": {},
            "feedback_notice": "✓ Opening Centrality Rankings"
        }

    # Open Analytics
    if any(k in t for k in ["open analytics", "analytics", "charts", "statistics", "stats dikhao", "aankde dikhao"]):
        return {
            "intent": "OPEN_ANALYTICS",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Opening Analytics Dashboard." if not is_indic else "एनालिटिक्स डैशबोर्ड खोला जा रहा है।",
            "action": "OPEN_ANALYTICS",
            "target": "/analytics",
            "data": {},
            "feedback_notice": "✓ Navigating to Analytics"
        }

    # ── 5. MAP LAYER TOGGLES & VISUAL CONTROLS ────────────────────────────
    # Hide cameras
    if any(k in t for k in ["hide camera", "hide cameras", "camera chupao", "cameras band karo", "remove cameras"]):
        return {
            "intent": "HIDE_CAMERAS",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"visible": False},
            "requires_confirmation": False,
            "spoken_response": "Hiding camera layer." if not is_indic else "कैमरा लेयर बंद की गई।",
            "action": "SET_LAYER",
            "target": "cameras",
            "data": {"layer": "cameras", "value": False},
            "feedback_notice": "✓ Camera layer disabled"
        }

    # Show cameras / Nearby cameras
    if any(k in t for k in ["show camera", "show cameras", "nearby camera", "nearby cameras", "cameras dikhao", "aas paas ke camera", "cctv", "surveillance", "कैमरे दिखाओ", "कॅमेरा", "दाखवा", "કૅમેરા"]):
        return {
            "intent": "SHOW_CAMERAS",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"visible": True},
            "requires_confirmation": False,
            "spoken_response": "Illuminating active urban surveillance and traffic cameras." if not is_indic else "सक्रिय शहरी सीसीटीवी कैमरे मानचित्र पर प्रदर्शित किए गए हैं।",
            "action": "SET_LAYER",
            "target": "cameras",
            "data": {"layer": "cameras", "value": True},
            "feedback_notice": "✓ Camera layer enabled"
        }

    # Traffic Signals toggle
    if any(k in t for k in ["signal", "signals", "traffic signal", "traffic lights", "signals dikhao", "batti dikhao", "सिग्नल दिखाओ"]):
        return {
            "intent": "SHOW_SIGNALS",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"visible": True},
            "requires_confirmation": False,
            "spoken_response": "Activating urban traffic signals and intersection phase monitors." if not is_indic else "यातायात सिग्नल और चौराहे का लाइव प्रवाह सक्रिय किया गया है।",
            "action": "SET_LAYER",
            "target": "signals",
            "data": {"layer": "signals", "value": True},
            "feedback_notice": "✓ Traffic signals layer enabled"
        }

    # Heatmap toggle
    if any(k in t for k in ["heatmap", "event density", "density map", "heatmap dikhao", "ghantavya dikhao"]):
        return {
            "intent": "SHOW_HEATMAP",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {"visible": True},
            "requires_confirmation": False,
            "spoken_response": "Activating geospatial event density heatmap." if not is_indic else "भू-स्थानिक घटना घनत्व हीटमैप सक्रिय किया गया है।",
            "action": "SET_LAYER",
            "target": "heatmap",
            "data": {"layer": "heatmap", "value": True},
            "feedback_notice": "✓ Event density heatmap enabled"
        }

    # Zoom In / Zoom Out
    if any(k in t for k in ["zoom in", "paas aao", "zoom karo", "closer"]):
        return {
            "intent": "ZOOM_IN",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Zooming in on the active sector." if not is_indic else "सक्रिय क्षेत्र पर ज़ूम इन किया जा रहा है।",
            "action": "ZOOM_IN",
            "target": "MAP",
            "data": {},
            "feedback_notice": "🔍 Zoomed In"
        }
    if any(k in t for k in ["zoom out", "door jao", "wider"]):
        return {
            "intent": "ZOOM_OUT",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Zooming out for broader spatial context." if not is_indic else "व्यापक संदर्भ के लिए ज़ूम आउट किया जा रहा है।",
            "action": "ZOOM_OUT",
            "target": "MAP",
            "data": {},
            "feedback_notice": "🔍 Zoomed Out"
        }

    # Fly to City
    city_coords = {
        "mumbai": {"name": "Mumbai", "lat": 18.9438, "lng": 72.8233, "zoom": 12.5},
        "मुंबई": {"name": "Mumbai", "lat": 18.9438, "lng": 72.8233, "zoom": 12.5},
        "delhi": {"name": "Delhi", "lat": 28.6315, "lng": 77.2167, "zoom": 12.5},
        "दिल्ली": {"name": "Delhi", "lat": 28.6315, "lng": 77.2167, "zoom": 12.5},
        "pune": {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "zoom": 12.5},
        "पुणे": {"name": "Pune", "lat": 18.5204, "lng": 73.8567, "zoom": 12.5},
        "manipur": {"name": "Manipur", "lat": 24.8170, "lng": 93.9368, "zoom": 11.5},
        "मणिपुर": {"name": "Manipur", "lat": 24.8170, "lng": 93.9368, "zoom": 11.5},
        "punjab": {"name": "Punjab", "lat": 31.6340, "lng": 74.8723, "zoom": 11.5},
        "पंजाब": {"name": "Punjab", "lat": 31.6340, "lng": 74.8723, "zoom": 11.5},
        "gujarat": {"name": "Gujarat", "lat": 23.0225, "lng": 72.5714, "zoom": 11.5},
        "गुजरात": {"name": "Gujarat", "lat": 23.0225, "lng": 72.5714, "zoom": 11.5},
        "bengaluru": {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "zoom": 12.0},
        "bangalore": {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "zoom": 12.0},
        "kolkata": {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639, "zoom": 12.0},
        "कोलकाता": {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639, "zoom": 12.0},
    }
    for city_key, city_data in city_coords.items():
        if city_key in t:
            spoken = f"Focusing 3D camera on {city_data['name']} intelligence corridor." if not is_indic else f"3D कैमरा {city_data['name']} कॉरिडोर पर केंद्रित किया जा रहा है।"
            return {
                "intent": "FOCUS_MAP",
                "confidence": 0.96,
                "language": lang,
                "transcript": raw_text,
                "entities": [],
                "parameters": {"city": city_data["name"], "lat": city_data["lat"], "lng": city_data["lng"]},
                "requires_confirmation": False,
                "spoken_response": spoken,
                "action": "FOCUS_MAP_LOCATION",
                "target": city_data["name"],
                "data": city_data,
                "feedback_notice": f"✓ Focused on {city_data['name']}"
            }

    # Reset Investigation View
    if any(k in t for k in ["reset", "clear all", "shuru se dikhao"]):
        return {
            "intent": "RESET_INVESTIGATION",
            "confidence": 0.98,
            "language": lang,
            "transcript": raw_text,
            "entities": [],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Investigation view reset to full national overview." if not is_indic else "जांच दृश्य राष्ट्रीय अवलोकन पर रीसेट कर दिया गया है।",
            "action": "RESET_VIEW",
            "target": "ALL",
            "data": {},
            "feedback_notice": "✓ Investigation view reset"
        }

    # ── 6. NETWORK GRAPH & RELATIONSHIP INTENTS ───────────────────────────
    # Compare entities
    compare_match = re.search(r"compare\s+([a-zA-Z0-9\-_]+)\s+(?:and|with)\s+([a-zA-Z0-9\-_]+)", t)
    if compare_match or any(k in t for k in ["compare these two", "compare entities", "in dono ko compare karo"]):
        e1 = compare_match.group(1).upper() if compare_match else active_entity
        e2 = compare_match.group(2).upper() if compare_match else "P-032"
        return {
            "intent": "COMPARE_ENTITIES",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [e1, e2],
            "parameters": {"entity1": e1, "entity2": e2},
            "requires_confirmation": False,
            "spoken_response": f"Opening side-by-side comparison for suspects {e1} and {e2}." if not is_indic else f"संदिग्ध {e1} और {e2} की तुलना खोली जा रही है।",
            "action": "COMPARE_ENTITIES",
            "target": f"{e1}:{e2}",
            "data": {"entity1": e1, "entity2": e2},
            "feedback_notice": f"✓ Comparing {e1} vs {e2}"
        }

    # Show Bridges / Communities
    if any(k in t for k in ["bridge nodes", "show bridges", "who connects the clusters", "connector", "connect these"]):
        return {
            "intent": "SHOW_BRIDGES",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": ["P-017", "P-032"],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": "Highlighting critical bridge actors P-017 and P-032 connecting cross-city syndicates." if not is_indic else "क्रॉस-सिटी सिंडिकेट्स को जोड़ने वाले प्रमुख ब्रिज संदिग्ध P-017 और P-032 को हाईलाइट किया गया।",
            "action": "FOCUS_NETWORK",
            "target": "P-017",
            "data": {"bridge_entities": ["P-017", "P-032"]},
            "feedback_notice": "✓ Bridge nodes highlighted"
        }

    # Show Network Graph
    if any(k in t for k in ["network", "connections", "graph", "topology", "associates", "links", "network dikhao", "kisse juda", "नेटवर्क दिखाओ", "नेटवर्क", "નેટવર્ક", "સંબંધ"]):
        target_id = active_entity
        # Check if a specific ID was mentioned
        id_match = re.search(r"\b(p-\d{3})\b", t, re.IGNORECASE)
        if id_match:
            target_id = id_match.group(1).upper()
        
        spoken = f"Focusing on the network topology for suspect {target_id}. Human verification required." if not is_indic else f"संदिग्ध {target_id} का नेटवर्क संबंध प्रदर्शित किया जा रहा है। मानवीय सत्यापन अनिवार्य है।"
        return {
            "intent": "SHOW_NETWORK",
            "confidence": 0.96,
            "language": lang,
            "transcript": raw_text,
            "entities": [target_id],
            "parameters": {"entity_id": target_id},
            "requires_confirmation": False,
            "spoken_response": spoken,
            "action": "FOCUS_NETWORK",
            "target": target_id,
            "data": {"entity_id": target_id},
            "feedback_notice": f"✓ Focused on network for {target_id}"
        }

    # ── 7. ENTITY SELECTION & DISAMBIGUATION ──────────────────────────────
    # Specific Entity ID direct mention (e.g. "Show P-017", "Select P-001")
    id_direct = re.search(r"\b(p-\d{3})\b", t, re.IGNORECASE)
    if id_direct:
        eid = id_direct.group(1).upper()
        person = next((p for p in data_store.persons if p["id"] == eid), None)
        name = person.get("display_name", eid) if person else eid
        spoken = f"Selecting suspect {name} ({eid})." if not is_indic else f"संदिग्ध {name} ({eid}) को चुना गया।"
        return {
            "intent": "SELECT_ENTITY",
            "confidence": 0.97,
            "language": lang,
            "transcript": raw_text,
            "entities": [eid],
            "parameters": {"entity_id": eid},
            "requires_confirmation": False,
            "spoken_response": spoken,
            "action": "SELECT_ENTITY",
            "target": eid,
            "data": person or {"id": eid},
            "feedback_notice": f"✓ Selected {name}"
        }

    # Name search with potential disambiguation (e.g., "Show Rahul", "Find Suresh")
    name_search = re.search(r"(?:show|find|select|dikhao|kholo)\s+([a-zA-Z]+)", t)
    if name_search:
        searched_term = name_search.group(1).strip().lower()
        if searched_term not in ["cameras", "camera", "network", "timeline", "signals", "map", "evidence", "analytics", "this", "nearby", "event", "countries", "bridges"]:
            if searched_term == "rahul":
                matches = [
                    {"id": "P-011", "display_name": "Rahul Mane", "name": "Rahul Mane", "cluster_name": "Western Operatives", "risk_level": "HIGH", "role": "Operative"},
                    {"id": "P-062", "display_name": "Rahul Sharma", "name": "Rahul Sharma", "cluster_name": "Northern Syndicate", "risk_level": "MEDIUM", "role": "Facilitator"},
                    {"id": "P-104", "display_name": "Rahul Verma", "name": "Rahul Verma", "cluster_name": "Financial Shells", "risk_level": "CRITICAL", "role": "Financial Handler"},
                ]
            else:
                matches = [
                    p for p in data_store.persons 
                    if searched_term in p.get("display_name", "").lower()
                    or searched_term in p.get("forename", "").lower()
                    or searched_term in p.get("family_name", "").lower()
                    or searched_term in p.get("cbi_listed_name", "").lower()
                    or any(searched_term in str(a).lower() for a in p.get("aliases", []))
                    or searched_term in p.get("name", "").lower()
                ]
            if len(matches) > 1:
                options = [
                    {
                        "id": m["id"],
                        "label": m.get("display_name", m.get("name")),
                        "type": "PERSON",
                        "details": f"{m.get('cluster_name', 'Associate')} · Risk: {m.get('risk_level', 'MEDIUM')}",
                        "role": m.get("role", "Operative")
                    }
                    for m in matches[:4]
                ]
                spoken = f"I found {len(options)} matching suspects for '{searched_term}'. Which one would you like to view? Say number 1, 2, or 3." if not is_indic else f"'{searched_term}' के लिए {len(options)} संदिग्ध मिले। आप किसे देखना चाहेंगे? 1, 2, या 3 कहें।"
                return {
                    "intent": "SEARCH_ENTITY",
                    "confidence": 0.92,
                    "language": lang,
                    "transcript": raw_text,
                    "entities": [m["id"] for m in options],
                    "parameters": {"query": searched_term},
                    "requires_confirmation": False,
                    "spoken_response": spoken,
                    "action": "DISAMBIGUATE_ENTITY",
                    "target": searched_term,
                    "data": {"query": searched_term},
                    "is_disambiguation": True,
                    "disambiguation_options": options,
                    "feedback_notice": f"Disambiguation: Found {len(options)} suspects"
                }
            elif len(matches) == 1:
                single = matches[0]
                spoken = f"Found suspect {single.get('display_name', single['id'])}."
                return {
                    "intent": "SELECT_ENTITY",
                    "confidence": 0.96,
                    "language": lang,
                    "transcript": raw_text,
                    "entities": [single["id"]],
                    "parameters": {"entity_id": single["id"]},
                    "requires_confirmation": False,
                    "spoken_response": spoken,
                    "action": "SELECT_ENTITY",
                    "target": single["id"],
                    "data": single,
                    "feedback_notice": f"✓ Selected {single.get('display_name', single['id'])}"
                }

    # ── 8. AI INVESTIGATOR & NATURAL LANGUAGE QUESTIONS ───────────────────
    # Questions & Explanations: "Why is P-017 important?", "Why is this entity flagged?", "Where was he seen?"
    if any(k in t for k in ["why", "important", "flagged", "significance", "explain", "findings", "reason", "kyu", "kyun", "karan", "samjhao"]):
        ai_res = ai_service.chat([{"role": "user", "content": raw_text}], "CBI-INTERPOL-RED-379", active_entity)
        person = next((p for p in data_store.persons if p["id"] == active_entity), None)
        name = person.get("display_name", active_entity) if person else active_entity
        spoken = f"Analysis for {name}: structurally significant in network topology with verified CBI-Interpol Red Notice warrants. Human verification required." if not is_indic else f"{name} के लिए साक्ष्य-आधारित निष्कर्ष: नेटवर्क टोपोलॉजी में महत्वपूर्ण स्थिति और सीबीआई-इंटरपोल रेड नोटिस। मानवीय सत्यापन अनिवार्य है।"
        return {
            "intent": "EXPLAIN_ENTITY",
            "confidence": 0.97,
            "language": lang,
            "transcript": raw_text,
            "entities": [active_entity],
            "parameters": {"entity_id": active_entity},
            "requires_confirmation": False,
            "spoken_response": spoken,
            "action": "OPEN_EXPLANATION",
            "target": active_entity,
            "data": ai_res,
            "feedback_notice": f"💡 AI Analysis for {name}"
        }

    # Provenance / Source inquiry
    if any(k in t for k in ["source", "provenance", "authority", "kahan se aaya", "kisne issue kiya", "origin"]):
        return {
            "intent": "QUERY_PROVENANCE",
            "confidence": 0.95,
            "language": lang,
            "transcript": raw_text,
            "entities": [active_entity],
            "parameters": {},
            "requires_confirmation": False,
            "spoken_response": f"Provenance derived from official Central Bureau of Investigation (CBI) and Interpol Red Notice public registries." if not is_indic else "स्रोत आधिकारिक केंद्रीय जांच ब्यूरो (CBI) और इंटरपोल रेड नोटिस सार्वजनिक रजिस्ट्रियों से प्राप्त है।",
            "action": "SHOW_PROVENANCE",
            "target": active_entity,
            "data": {"authority": "CBI / Interpol", "case": "CBI-INTERPOL-RED-379"},
            "feedback_notice": "✓ Verified Official Provenance"
        }

    # General AI Copilot Query Fallback
    ai_res = ai_service.chat([{"role": "user", "content": raw_text}], "CBI-INTERPOL-RED-379", active_entity)
    answer_text = ai_res.get("answer", "")
    short_spoken = answer_text[:160] + "..." if len(answer_text) > 160 else answer_text
    return {
        "intent": "QUERY_AI",
        "confidence": 0.88,
        "language": lang,
        "transcript": raw_text,
        "entities": [active_entity],
        "parameters": {},
        "requires_confirmation": False,
        "spoken_response": short_spoken,
        "action": "AI_COPILOT_RESPONSE",
        "target": "DRAWER",
        "data": ai_res,
        "feedback_notice": "💬 AI Investigator Query Processed"
    }
