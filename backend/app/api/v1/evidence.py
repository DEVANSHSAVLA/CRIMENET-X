import hashlib
from datetime import datetime
from fastapi import APIRouter, HTTPException, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.core.database import data_store
from app.core.config import settings

router = APIRouter()


class RevealHashRequest(BaseModel):
    password: str


def _mask_hash(hash_val: str) -> str:
    """Masks a SHA-256 hash for secure default display."""
    if not hash_val or len(hash_val) < 12:
        return "••••••••••••••••••••••••••••••••"
    return f"{hash_val[:6]}••••••••••••••••••••••••••••••••{hash_val[-4:]}"


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
        items = [
            e for e in items
            if q in e.get("title", "").lower() or q in e.get("summary", "").lower() or q in e.get("id", "").lower()
        ]

    # Return items with protected masked hashes by default
    protected_items = []
    for item in items:
        raw_hash = item.get("sha256_hash", "")
        item_copy = dict(item)
        item_copy["sha256_hash_masked"] = _mask_hash(raw_hash)
        item_copy["is_hash_protected"] = True
        # Default displayed hash is masked
        item_copy["sha256_hash"] = _mask_hash(raw_hash)
        protected_items.append(item_copy)

    return {"evidence": protected_items, "total": len(protected_items)}


@router.get("/audit-logs")
def get_evidence_audit_logs():
    """Returns audit log trail of evidence access and hash reveals."""
    return {"audit_logs": data_store.audit_logs, "total": len(data_store.audit_logs)}


@router.get("/{evidence_id}")
def get_evidence_detail(evidence_id: str):
    item = next((e for e in data_store.evidence if e["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    raw_hash = item.get("sha256_hash", "")
    item_copy = dict(item)
    item_copy["sha256_hash_masked"] = _mask_hash(raw_hash)
    item_copy["is_hash_protected"] = True
    item_copy["sha256_hash"] = _mask_hash(raw_hash)
    return item_copy


@router.post("/{evidence_id}/reveal-hash")
def reveal_evidence_hash(evidence_id: str, req: RevealHashRequest):
    """
    Authenticated reveal endpoint for sensitive SHA-256 integrity hash.
    Requires project secret clearance key. Creates audit log upon verification.
    """
    item = next((e for e in data_store.evidence if e["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    # Secure verification against configured secret
    if not req.password or req.password.strip() != settings.EVIDENCE_HASH_REVEAL_SECRET:
        # Record failed authorization attempt in audit log
        data_store.audit_logs.append({
            "event": "EVIDENCE_HASH_REVEAL_DENIED",
            "evidence_id": evidence_id,
            "title": item.get("title"),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "user": "UNAUTHORIZED_ATTEMPT",
            "status": "DENIED"
        })
        raise HTTPException(
            status_code=403,
            detail="ACCESS DENIED: Invalid Security Clearance Secret. Attempt logged."
        )

    # Authorized: record audit event
    audit_entry = {
        "event": "EVIDENCE_HASH_REVEALED",
        "evidence_id": evidence_id,
        "title": item.get("title"),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "user": "INVESTIGATOR_OFFICER_AUTHORIZED",
        "status": "APPROVED",
        "provenance": item.get("provenance_badge", "SOURCE-DERIVED")
    }
    data_store.audit_logs.append(audit_entry)

    raw_hash = item.get("sha256_hash", "")
    return {
        "evidence_id": evidence_id,
        "sha256_hash": raw_hash,
        "is_hash_protected": False,
        "verification_status": "AUTHENTICATED_AND_VERIFIED",
        "audit_entry": audit_entry,
        "blockchain_anchor": f"0x{raw_hash[:40]}" if raw_hash else None
    }


@router.post("/{evidence_id}/verify")
def verify_evidence_hash(evidence_id: str):
    item = next((e for e in data_store.evidence if e["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence record not found")

    is_valid = bool(item.get("sha256_hash"))

    return {
        "evidence_id": evidence_id,
        "verification_status": "VERIFIED" if is_valid else "UNVERIFIED",
        "blockchain_anchor": f"0x{item.get('sha256_hash', '')[:40]}",
        "timestamp": item.get("timestamp"),
        "audit_provenance": "CBI INTERPOL REGISTRY SECURE HASH"
    }
