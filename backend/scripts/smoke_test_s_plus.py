import sys
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

def run_tests():
    with TestClient(app) as client:
        print("=== STARTING CRIMENET-X S++ AUTOMATED SMOKE TESTS ===")
        
        # 1. Health & Case info
        res = client.get("/")
        assert res.status_code == 200, f"Root failed: {res.text}"
        print("[PASS] Root health check")

        # 2. Location Intelligence: GET /api/v1/locations/L-001
        res = client.get("/api/v1/locations/L-001")
        assert res.status_code == 200, f"Location L-001 failed: {res.text}"
        loc_data = res.json()
        assert "associated_cases" in loc_data
        assert "associated_persons" in loc_data
        assert "associated_events" in loc_data
        assert "nearby_cameras" in loc_data
        assert "nearby_signals" in loc_data
        print(f"[PASS] Location L-001 Intelligence: {len(loc_data['associated_cases'])} cases, {len(loc_data['associated_persons'])} persons, {len(loc_data['nearby_cameras'])} nearby cameras")

        # 3. Evidence Hashes & Authenticated Reveal
        # Get evidence list
        res = client.get("/api/v1/evidence")
        assert res.status_code == 200, f"Evidence list failed: {res.text}"
        evidence_list = res.json().get("evidence", [])
        assert len(evidence_list) > 0, "No evidence items found"
        first_ev = evidence_list[0]
        ev_id = first_ev["id"]
        
        # Check default masking
        assert "•" in first_ev["sha256_hash"], f"Hash not masked by default: {first_ev['sha256_hash']}"
        assert len(first_ev["sha256_hash"]) != 64, "Masked hash length equals raw SHA-256"
        print(f"[PASS] Evidence {ev_id} hash is masked by default: {first_ev['sha256_hash']}")

        # Try invalid password
        bad_res = client.post(f"/api/v1/evidence/{ev_id}/reveal-hash", json={"password": "wrong_password"})
        assert bad_res.status_code == 403, f"Expected 403 for wrong password, got {bad_res.status_code}"
        print("[PASS] Invalid clearance password correctly rejected with 403 Forbidden")

        # Try valid password
        good_res = client.post(f"/api/v1/evidence/{ev_id}/reveal-hash", json={"password": settings.EVIDENCE_HASH_REVEAL_SECRET})
        assert good_res.status_code == 200, f"Failed with valid secret: {good_res.text}"
        revealed_data = good_res.json()
        assert not revealed_data["sha256_hash"].startswith("•"), "Hash still masked after authorized reveal"
        assert len(revealed_data["sha256_hash"]) == 64, "SHA-256 hash length not 64 chars"
        print(f"[PASS] Authorized hash reveal succeeded: {revealed_data['sha256_hash']}")

        # Check Audit Logs
        audit_res = client.get("/api/v1/evidence/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.json().get("audit_logs", [])
        assert len(logs) >= 2, "Audit logs did not record events"
        print(f"[PASS] Audit trail recorded {len(logs)} access/reveal events")

        # 4. Multi-turn AI Investigator Chat
        # Turn 1: Who connects the clusters?
        chat_res1 = client.post("/api/v1/ai/chat", json={
            "messages": [
                {"role": "user", "content": "Who connects the clusters in this investigation?"}
            ]
        })
        assert chat_res1.status_code == 200, f"Turn 1 failed: {chat_res1.text}"
        c1_json = chat_res1.json()
        assert len(c1_json.get("entities", [])) > 0
        print(f"[PASS] AI Chat Turn 1: {c1_json['answer'][:80]}...")

        # Turn 2 with pronoun / entity context: "Where was this entity observed?"
        chat_res2 = client.post("/api/v1/ai/chat", json={
            "messages": [
                {"role": "user", "content": "Who connects the clusters in this investigation?"},
                {"role": "assistant", "content": c1_json["answer"]},
                {"role": "user", "content": "Where was this entity observed?"}
            ],
            "context_entity_id": "P-017"
        })
        assert chat_res2.status_code == 200, f"Turn 2 failed: {chat_res2.text}"
        c2_json = chat_res2.json()
        assert "Mumbai" in c2_json["answer"] or "Pune" in c2_json["answer"] or "Delhi" in c2_json["answer"] or "location" in c2_json["answer"].lower()
        print(f"[PASS] AI Chat Turn 2 (Pronoun resolution): {c2_json['answer'][:80]}...")

        # 5. Multilingual Voice Command (Hindi & Hinglish)
        voice_res = client.post("/api/v1/voice/command", json={
            "transcript": "ye person important kyu hai?",
            "language": "hi-IN",
            "context_entity_id": "P-017"
        })
        assert voice_res.status_code == 200, f"Voice failed: {voice_res.text}"
        v_json = voice_res.json()
        assert "action" in v_json
        assert len(v_json["spoken_response"]) > 0
        print(f"[PASS] Multilingual Voice Hindi action: {v_json['action']}, Spoken length: {len(v_json['spoken_response'])} chars")

        print("=== ALL 5 AUTOMATED SMOKE SUITES PASSED WITH 100% SUCCESS ===")

if __name__ == "__main__":
    run_tests()
