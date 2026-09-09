from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
import re
from app.services.ai_service import ai_service
from app.services.graph_service import graph_service
from app.core.database import data_store

router = APIRouter()


class VoiceRequest(BaseModel):
    transcript: str
    context_entity_id: Optional[str] = None
    language: Optional[str] = "auto"


# ── Language Detection & Normalization Helper ────────────────────────────
def detect_language(text: str, user_lang: Optional[str] = None) -> str:
    if user_lang and user_lang != "auto":
        return user_lang
    
    # Unicode script heuristics for Indian languages
    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:  # Devanagari (Hindi / Marathi)
            if any(w in text.lower() for w in ["आहे", "दाखवा", "सांगा", "कॅमेरा"]):
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
    hinglish_keywords = ["dikhao", "karo", "kyu", "kyun", "karan", "batao", "shuru", "juda", "hai", "aas", "paas"]
    if any(k in text.lower() for k in hinglish_keywords):
        return "hi-IN"
        
    return "en-IN"


@router.post("/command")
def process_voice_command(req: VoiceRequest):
    raw_text = req.transcript.strip()
    t = raw_text.lower()
    lang = detect_language(raw_text, req.language)
    is_indic = lang in ["hi-IN", "mr-IN", "gu-IN", "bn-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN", "pa-IN", "od-IN"]

    # ── 1. SHOW_NETWORK ───────────────────────────────────────────────────
    network_keywords = [
        # English
        "network", "connections", "graph", "topology", "associates", "connected", "links",
        # Hinglish
        "network dikhao", "connections dikhao", "graph dikhao", "kisse juda", "kaun juda", "connections batao",
        # Hindi / Devanagari
        "नेटवर्क", "संबंध", "कनेक्शन", "नेटवर्क दिखाओ", "संबंध दिखाओ", "ग्राफ दिखाओ", "जुड़ाव",
        # Marathi
        "नेटवर्क दाखवा", "संबंध दाखवा", "network dakhva",
        # Gujarati
        "નેટવર્ક", "સંબંધો", "નેટવર્ક બતાવો", "network batavo",
        # Bengali
        "নেটওয়ার্ক", "যোগাযোগ", "নেটওয়ার্ক দেখাও", "network dekhao",
        # Tamil
        "வலைப்பின்னல்", "தொடர்புகள்", "network kaatu",
        # Telugu
        "నెట్‌వర్క్", "సంబంధాలు", "network choopinchu",
        # Kannada
        "ನೆಟ್‌ವರ್ಕ್", "ಸಂಪರ್ಕಗಳು", "network thorisi",
        # Malayalam
        "നെറ്റ്‌വർക്ക്", "network kaanikkuka",
        # Punjabi
        "ਨੈੱਟਵਰਕ", "ਸੰਬੰਧ", "network dikhao"
    ]
    if any(k in t for k in network_keywords):
        target_id = req.context_entity_id or "P-001"
        spoken = (
            f"संदिग्ध {target_id} का नेटवर्क संबंध प्रदर्शित किया जा रहा है। मानवीय सत्यापन अनिवार्य है।"
            if is_indic else
            f"Focusing on the network topology for suspect {target_id}. Human verification required."
        )
        return {
            "action": "FOCUS_NETWORK",
            "target": target_id,
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.96,
            "data": {"entity_id": target_id}
        }

    # ── 2. SHOW_CAMERAS ───────────────────────────────────────────────────
    camera_keywords = [
        # English
        "camera", "cameras", "cctv", "surveillance", "video feeds", "nearby cameras",
        # Hinglish
        "camera dikhao", "cameras dikhao", "cctv dikhao", "aas paas ke camera", "surveillance dikhao",
        # Hindi / Devanagari
        "कैमरा", "कैमरे", "सीसीटीवी", "कैमरे दिखाओ", "सीसीटीवी दिखाओ", "निगरानी कैमरे",
        # Marathi / Gujarati / Regional
        "कॅमेरा", "कॅमेरा दाखवा", "કૅમેરા", "કેમેરા બતાવો", "ক্যামেরা", "ক্যামেরা দেখাও",
        "கேமரா", "கேமராக்கள் காட்டு", "కెమెరా", "కెమెరాలు చూపించు", "ಕ್ಯಾಮೆರಾ", "ಕ್ಯಾಮೆರಾ ತೋರಿಸಿ",
        "ക്യാമറ", "ക്യാമറകൾ കാണിക്കുക", "ਕੈਮਰਾ", "ਕੈਮਰੇ ਦਿਖਾਓ"
    ]
    if any(k in t for k in camera_keywords):
        spoken = (
            "सक्रिय निगरानी और शहरी सीसीटीवी कैमरे मानचित्र पर प्रदर्शित किए गए हैं।"
            if is_indic else
            "Illuminating active urban surveillance and traffic camera feeds in the operational zone."
        )
        return {
            "action": "TOGGLE_CAMERAS",
            "target": "CAMERAS_LAYER",
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.95,
            "data": {"cameras_count": len(data_store.cameras)}
        }

    # ── 3. SHOW_SIGNALS ───────────────────────────────────────────────────
    signal_keywords = [
        # English
        "signal", "signals", "traffic signal", "traffic lights", "intersections", "junctions",
        # Hinglish
        "signal dikhao", "traffic signal dikhao", "signals dikhao", "batti dikhao", "traffic lights dikhao",
        # Hindi / Devanagari
        "सिग्नल", "ट्रैफिक सिग्नल", "सिग्नल दिखाओ", "ट्रैफिक लाइट", "चौराहे", "यातायात सिग्नल",
        # Regional
        "ट्रॅफिक सिग्नल", "સિગ્નલ", "ટ્રાફિક સિગ્નલ બતાવો", "ট্র্যাফিক সিগন্যাল", "সிக்னல்",
        "சிக்னல்கள் காட்டு", "సిగ్నల్స్", "సిగ్నల్స్ చూపించు", "ಟ್ರಾಫಿಕ್ ಸಿಗ್ನಲ್", "ಟ್ರಾಫಿಕ್ ಸಿಗ್ನಲ್ ತೋರಿಸಿ"
    ]
    if any(k in t for k in signal_keywords):
        spoken = (
            "यातायात सिग्नल और चौराहे का लाइव प्रवाह सक्रिय किया गया है।"
            if is_indic else
            "Activating urban traffic signals and intersection phase monitors across the corridor."
        )
        return {
            "action": "TOGGLE_SIGNALS",
            "target": "SIGNALS_LAYER",
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.94,
            "data": {"signals_count": len(data_store.traffic_signals)}
        }

    # ── 4. SHOW_TIMELINE ──────────────────────────────────────────────────
    timeline_keywords = [
        # English
        "timeline", "events", "chronology", "temporal", "time sequence", "history",
        # Hinglish
        "timeline dikhao", "events dikhao", "ghatnaye dikhao", "kab kya hua", "time sequence dikhao",
        # Hindi / Devanagari
        "घटनाक्रम", "टाइमलाइन", "घटनाएं", "घटनाक्रम दिखाओ", "समय रेखा", "इतिहास दिखाओ",
        # Regional
        "घटनाक्रम दाखवा", "સમયરેખા", "ঘটনাপঞ্জী", "সময়রেখা", "காலவரிசை",
        "நிகழ்வுகள் காட்டு", "కాలక్రమం", "ఈవెంట్స్ చూపించు", "ಕಾಲಾನುಕ್ರಮ", "ಘಟನೆಗಳನ್ನು ತೋರಿಸಿ"
    ]
    if any(k in t for k in timeline_keywords):
        spoken = (
            "सत्यापित साक्ष्य और आधिकारिक रेड नोटिस घटनाक्रम प्रदर्शित किया जा रहा है।"
            if is_indic else
            "Displaying chronological investigation timeline across verified warrant records."
        )
        return {
            "action": "NAVIGATE_TIMELINE",
            "target": "/timeline",
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.96,
            "data": {"total_events": len(data_store.events)}
        }

    # ── 5. QUERY_AI / EXPLANATION ─────────────────────────────────────────
    query_ai_keywords = [
        # English
        "why", "important", "flagged", "significance", "explain", "findings", "reason",
        # Hinglish
        "kyu important hai", "kyun flagged hai", "karan batao", "kyun jaruri hai", "kyun shak hai", "samjhao",
        # Hindi / Devanagari
        "महत्वपूर्ण क्यों", "कारण बताओ", "क्यों संदिग्ध", "महत्व समझाओ", "जांच निष्कर्ष", "स्पष्ट करो",
        # Regional
        "का महत्त्वाचा", "कारण सांगा", "શા માટે મહત્વપૂર્ણ", "કારણ જણાવો", "কেন গুরুত্বপূর্ণ",
        "ஏன் முக்கியமானது", "காரணம் கூறு", "ఎందుకు ముఖ్యమైనది", "కారణం వివరించు", "ಏಕೆ ಮುಖ್ಯ"
    ]
    if any(k in t for k in query_ai_keywords):
        target_id = req.context_entity_id or "P-001"
        ai_res = ai_service.query(f"Why is {target_id} important?", case_id="CBI-INTERPOL-RED-379", context_entity_id=target_id)
        person = next((p for p in data_store.persons if p["id"] == target_id), None)
        name = person.get("display_name", target_id) if person else target_id
        offense_count = len(person.get('offense_categories', [])) if person else 0
        
        spoken = (
            f"{name} के लिए साक्ष्य-आधारित निष्कर्ष: नेटवर्क टोपोलॉजी में महत्वपूर्ण स्थिति और सीबीआई-इंटरपोल रेड नोटिस के तहत {offense_count} अपराध श्रेणियां। मानवीय सत्यापन अनिवार्य है।"
            if is_indic else
            f"Evidence-backed finding for {name}: structurally significant in network topology with verified CBI-Interpol Red Notice warrants across {offense_count} offense categories. Requires human verification."
        )
        return {
            "action": "OPEN_EXPLANATION",
            "target": target_id,
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.97,
            "data": ai_res
        }

    # ── 6. GEOSPATIAL REGION FOCUS ────────────────────────────────────────
    city_map = {
        "mumbai": "Mumbai", "मुंबई": "Mumbai",
        "delhi": "Delhi", "दिल्ली": "Delhi",
        "pune": "Pune", "पुणे": "Pune",
        "manipur": "Manipur", "मणिपुर": "Manipur",
        "punjab": "Punjab", "पंजाब": "Punjab",
        "gujarat": "Gujarat", "गुजरात": "Gujarat",
        "kerala": "Kerala", "केरल": "Kerala",
        "bengaluru": "Bengaluru", "bangalore": "Bengaluru",
        "kolkata": "Kolkata", "कोलकाता": "Kolkata",
        "hyderabad": "Hyderabad", "हैदराबाद": "Hyderabad",
        "chennai": "Chennai", "चेन्नई": "Chennai"
    }
    for city_key, city_name in city_map.items():
        if city_key in t:
            spoken = (
                f"3D भू-स्थानिक कैमरा {city_name} इंटेलिजेंस कॉरिडोर पर पुनर्निर्देशित किया जा रहा है।"
                if is_indic else
                f"Redirecting 3D geospatial camera to {city_name} intelligence corridor."
            )
            return {
                "action": "FLY_TO_CITY",
                "target": city_name,
                "spoken_response": spoken,
                "language": lang,
                "confidence": 0.95,
                "data": {"city": city_name}
            }

    # ── 7. RESET VIEW ─────────────────────────────────────────────────────
    reset_keywords = ["reset", "clear", "home", "overview", "रीसेट", "शुरू से", "reset karo", "sab clear karo"]
    if any(k in t for k in reset_keywords):
        spoken = (
            "कमांड सेंटर दृश्य राष्ट्रीय अवलोकन पर रीसेट कर दिया गया है।"
            if is_indic else
            "Resetting command view to full national intelligence overview."
        )
        return {
            "action": "RESET_VIEW",
            "target": "ALL",
            "spoken_response": spoken,
            "language": lang,
            "confidence": 0.98,
            "data": {}
        }

    # ── Fallback to AI Copilot ────────────────────────────────────────────
    ai_res = ai_service.query(raw_text, case_id="CBI-INTERPOL-RED-379", context_entity_id=req.context_entity_id)
    return {
        "action": "AI_COPILOT_RESPONSE",
        "target": "DRAWER",
        "spoken_response": ai_res.get("answer", "")[:180],
        "language": lang,
        "confidence": 0.85,
        "data": ai_res
    }

