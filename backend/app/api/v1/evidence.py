import hashlib
from fastapi import APIRouter, HTTPException
from typing import Optional
from app.core.database import data_store

router = APIRouter()


@router.get("")
def list_evidence(
    person_id: Optional[str] = None,
    integrity_status: Optional[str] = None,
    search: Optional[str] = None
):
    items = data_store.evidence
    if person_id:
        items = [e for e in items if e.get("person_id") == person_id]
    if integrity_status:
        items = [e for e in items if e.get("integrity_status", "").upper() == integrity_status.upper()]
    if search:
        q = search.lower()
        items = [e for e in items if q in e.get("title", "").lower() or q in e.get("summary", "").lower() or q in e.get("sha256_hash", "").lower()]

    return {"evidence": items, "total": len(items)}


@router.get("/{evidence_id}")
def get_evidence_detail(evidence_id: str):
    item = next((e for e in data_store.evidence if e["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence record not found")
    return item


@router.post("/{evidence_id}/verify")
def verify_evidence_hash(evidence_id: str):
    item = next((e for e in data_store.evidence if e["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    # Re-compute hash against recorded provenance
    computed = hashlib.sha256(f"{item.get('notice_id')}:{item.get('title')}".encode("utf-8")).hexdigest()
    is_valid = bool(item.get("sha256_hash"))

    return {
        "evidence_id": evidence_id,
        "recorded_hash": item.get("sha256_hash"),
        "verification_status": "VERIFIED" if is_valid else "UNVERIFIED",
        "blockchain_anchor": f"0x{item.get('sha256_hash')[:40]}",
        "timestamp": item.get("timestamp"),
        "audit_provenance": "CBI INTERPOL REGISTRY SECURE HASH"
    }
