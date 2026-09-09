from typing import List, Dict, Any


class AnalyticsService:
    """Suspicious pattern detection for criminal intelligence."""

    def detect_location_anomalies(self, sightings: List[dict], locations: List[dict]) -> List[dict]:
        """Detect persons with sudden geographic transitions."""
        anomalies = []
        loc_lookup = {l["id"]: l for l in locations}

        # Group sightings by person
        person_sightings = {}
        for s in sightings:
            pid = s.get("person_id", "")
            if pid not in person_sightings:
                person_sightings[pid] = []
            person_sightings[pid].append(s)

        for pid, sights in person_sightings.items():
            sights.sort(key=lambda x: x.get("timestamp", ""))
            cities_visited = []
            for s in sights:
                loc = loc_lookup.get(s.get("location_id", ""), {})
                city = loc.get("city", "Unknown")
                if not cities_visited or cities_visited[-1] != city:
                    cities_visited.append(city)

            if len(set(cities_visited)) >= 3:
                anomalies.append({
                    "id": f"ANOM-GEO-{pid}",
                    "type": "Unusual Geographic Transition",
                    "description": f"{pid} moved across {len(set(cities_visited))} cities: {' → '.join(cities_visited)}",
                    "entities": [pid],
                    "confidence": 0.85,
                    "severity": "HIGH",
                    "evidence": [f"Cities: {', '.join(set(cities_visited))}", f"Transitions: {len(cities_visited)}"]
                })

        return anomalies

    def detect_transaction_patterns(self, transactions: List[dict]) -> List[dict]:
        """Detect circular or suspicious financial patterns."""
        anomalies = []

        # Look for circular flows: A->B, B->C, C->A
        transfers = {}
        for t in transactions:
            key = (t.get("sender_id", ""), t.get("receiver_id", ""))
            if key not in transfers:
                transfers[key] = []
            transfers[key].append(t)

        senders = set(k[0] for k in transfers.keys())
        for a in senders:
            for b in senders:
                if a == b:
                    continue
                if (a, b) in transfers and (b, a) in transfers:
                    anomalies.append({
                        "id": f"ANOM-CIRC-{a}-{b}",
                        "type": "Potential Circular Transaction Pattern",
                        "description": f"Bidirectional money flow between {a} and {b}",
                        "entities": [a, b],
                        "confidence": 0.82,
                        "severity": "HIGH",
                        "evidence": [
                            f"{a} → {b}: {len(transfers[(a, b)])} transactions",
                            f"{b} → {a}: {len(transfers[(b, a)])} transactions"
                        ]
                    })

        # Flagged high-value transactions
        for t in transactions:
            if t.get("amount", 0) > 1000000 and t.get("flagged"):
                anomalies.append({
                    "id": f"ANOM-HVAL-{t['id']}",
                    "type": "High-Value Flagged Transaction",
                    "description": f"₹{t['amount']:,.2f} transfer from {t['sender_id']} to {t['receiver_id']}",
                    "entities": [t["sender_id"], t["receiver_id"]],
                    "confidence": 0.88,
                    "severity": "HIGH",
                    "evidence": [f"Amount: ₹{t['amount']:,.2f}", f"Type: {t.get('type', 'UNKNOWN')}"]
                })

        return anomalies

    def get_stats(self, data_store) -> dict:
        """Generate comprehensive stats for the analytics dashboard."""
        persons = data_store.persons
        high_risk = sum(1 for p in persons if p.get("risk_level") in ("HIGH", "CRITICAL"))
        risk_pct = round(high_risk / max(len(persons), 1) * 100)

        # Location distribution
        loc_counts = {}
        for loc in data_store.locations:
            city = loc.get("city", "Unknown")
            loc_counts[city] = loc_counts.get(city, 0) + 1

        # Event type distribution
        event_types = {}
        for ev in data_store.events:
            et = ev.get("type", "UNKNOWN")
            event_types[et] = event_types.get(et, 0) + 1

        # Monthly event counts for the area chart
        monthly_events = {}
        for ev in data_store.events:
            ts = ev.get("timestamp", "")[:7]  # YYYY-MM
            monthly_events[ts] = monthly_events.get(ts, 0) + 1

        return {
            "persons": len(persons),
            "locations": len(data_store.locations),
            "events": len(data_store.events),
            "relationships": len(data_store.relationships),
            "high_risk_entities": high_risk,
            "network_risk_pct": risk_pct,
            "phones": len(data_store.phones),
            "vehicles": len(data_store.vehicles),
            "accounts": len(data_store.accounts),
            "firs": len(data_store.firs),
            "location_distribution": loc_counts,
            "event_type_distribution": event_types,
            "monthly_events": dict(sorted(monthly_events.items())),
            "clusters": {
                "A": sum(1 for p in persons if p.get("cluster") == "A"),
                "B": sum(1 for p in persons if p.get("cluster") == "B"),
                "C": sum(1 for p in persons if p.get("cluster") == "C"),
                "BRIDGE": sum(1 for p in persons if "BRIDGE" in p.get("cluster", "")),
                "PERIPHERAL": sum(1 for p in persons if p.get("cluster") == "PERIPHERAL"),
            }
        }


analytics_service = AnalyticsService()
