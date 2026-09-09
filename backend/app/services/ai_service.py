from typing import Dict, Any, List, Optional


class AIService:
    """Rule-based AI Investigator Copilot for MVP (no external LLM required)."""

    def __init__(self):
        self.graph_service = None
        self.data_store = None

    def initialize(self, graph_service, data_store):
        self.graph_service = graph_service
        self.data_store = data_store

    def query(self, question: str, case_id: str, context_entity_id: Optional[str] = None) -> dict:
        """Process natural language investigation query."""
        q = question.lower().strip()

        # Pattern: Who connects the clusters?
        if any(kw in q for kw in ["connect", "bridge", "link between", "between cluster"]):
            return self._answer_bridge_query()

        # Pattern: Why is X important/flagged?
        if any(kw in q for kw in ["why", "important", "flagged", "ranked", "risk"]):
            entity_id = self._extract_entity_id(q) or context_entity_id
            if entity_id:
                return self._answer_why_entity(entity_id)

        # Pattern: Suspicious patterns
        if any(kw in q for kw in ["suspicious", "anomal", "pattern", "unusual"]):
            return self._answer_patterns()

        # Pattern: What happened at location X?
        if any(kw in q for kw in ["happened", "location", "at ", "events at"]):
            return self._answer_location_query(q)

        # Pattern: Highest centrality / who is most
        if any(kw in q for kw in ["highest", "most", "top", "central", "ranking"]):
            return self._answer_top_entities()

        # Pattern: Tell me about entity
        if any(kw in q for kw in ["tell me", "about", "who is", "describe", "info"]):
            entity_id = self._extract_entity_id(q) or context_entity_id
            if entity_id:
                return self._answer_entity_info(entity_id)

        # Default
        return {
            "answer": "I can help with investigation queries. Try asking:\n\n• Who connects the clusters?\n• Why is P-017 important?\n• Show suspicious patterns\n• What happened at Andheri West?\n• Who has the highest centrality?\n• Tell me about P-003",
            "evidence": [],
            "entities": [],
            "confidence": 0.5,
            "actions": [{"type": "VIEW_NETWORK", "label": "View Full Network", "target": "/network"}]
        }

    def _extract_entity_id(self, q: str) -> Optional[str]:
        """Extract entity ID (P-XXX format) from query string."""
        import re
        match = re.search(r'P-\d{3}', q.upper())
        if match:
            return match.group()
        # Try name matching
        if self.data_store:
            for p in self.data_store.persons:
                if p.get("name", "").lower() in q:
                    return p["id"]
        return None

    def _answer_bridge_query(self) -> dict:
        if not self.graph_service:
            return {"answer": "Graph service not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        rankings = self.graph_service.get_centrality_rankings()
        # Bridge actors have high betweenness
        bridges = sorted(rankings, key=lambda x: x.get("betweenness", 0), reverse=True)[:5]

        answer_lines = ["**Bridge Actor Analysis**\n"]
        evidence = []
        entities = []

        for i, b in enumerate(bridges[:3]):
            eid = b["entity_id"]
            entities.append(eid)
            explanation = self.graph_service.explain_entity(
                eid, self.data_store.persons, self.data_store.relationships,
                self.data_store.events, self.data_store.sightings
            )
            answer_lines.append(f"**{i+1}. {b['name']}** ({eid})")
            answer_lines.append(f"   Betweenness: {b['betweenness']:.4f} | Connections: {explanation.get('connections_count', 0)} | Clusters: {explanation.get('clusters_connected', 0)}")
            evidence.append(f"{b['name']} — Betweenness centrality {b['betweenness']:.4f}, connects {explanation.get('clusters_connected', 0)} clusters")

        answer_lines.append(f"\n**{bridges[0]['name']}** is the strongest bridge node connecting otherwise separate criminal clusters.")

        return {
            "answer": "\n".join(answer_lines),
            "evidence": evidence,
            "entities": entities,
            "confidence": 0.92,
            "actions": [
                {"type": "VIEW_NETWORK", "label": "View Network", "target": "/network"},
                {"type": "VIEW_ENTITY", "label": f"Focus {bridges[0]['entity_id']}", "target": bridges[0]["entity_id"]},
            ]
        }

    def _answer_why_entity(self, entity_id: str) -> dict:
        if not self.graph_service:
            return {"answer": "Graph service not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        explanation = self.graph_service.explain_entity(
            entity_id, self.data_store.persons, self.data_store.relationships,
            self.data_store.events, self.data_store.sightings
        )

        if not explanation.get("factors"):
            return {
                "answer": f"Entity {entity_id} has limited data for risk assessment.",
                "evidence": [], "entities": [entity_id], "confidence": 0.3,
                "actions": [{"type": "VIEW_ENTITY", "label": f"View {entity_id}", "target": entity_id}]
            }

        lines = [f"**Investigative Finding & Evidence Summary for {explanation['name']}** ({entity_id})\n"]
        lines.append(f"Warrant Priority: **{explanation['risk_level']}**\n")
        lines.append(f"Evidence-backed factors identified from public CBI-Interpol records:\n")

        evidence = []
        for f in explanation["factors"]:
            lines.append(f"✓ {f['factor']} (confidence: {f['confidence']:.0%})")
            evidence.append(f['factor'])

        cent = explanation.get("centrality", {})
        if cent:
            lines.append(f"\n**Network Centrality Score**: {cent.get('combined_score', 0)}")
            lines.append(f"**Model Confidence**: {explanation['combined_confidence']:.0%}")
        
        lines.append("\n*Note: AI-generated investigative finding — requires human verification by investigating officers.*")

        return {
            "answer": "\n".join(lines),
            "evidence": evidence,
            "entities": [entity_id],
            "confidence": explanation["combined_confidence"],
            "actions": [
                {"type": "VIEW_ENTITY", "label": f"View {entity_id}", "target": entity_id},
                {"type": "VIEW_NETWORK", "label": "View Network", "target": "/network"},
                {"type": "VIEW_TIMELINE", "label": "View Timeline", "target": "/timeline"}
            ]
        }

    def _answer_patterns(self) -> dict:
        if not self.graph_service:
            return {"answer": "Graph service not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        anomalies = self.graph_service.get_anomalies()
        lines = [f"**Suspicious Pattern Analysis**\n"]
        lines.append(f"**{len(anomalies)}** suspicious patterns detected:\n")

        evidence = []
        entities = []
        for a in anomalies[:8]:
            severity_icon = "🔴" if a.get("severity") == "CRITICAL" else "🟠" if a.get("severity") == "HIGH" else "🟡"
            lines.append(f"{severity_icon} **{a['type']}**")
            lines.append(f"   {a['description']}")
            lines.append(f"   Confidence: {a.get('confidence', 0):.0%}")
            lines.append("")
            evidence.append(a["description"])
            entities.extend(a.get("entities", []))

        return {
            "answer": "\n".join(lines),
            "evidence": evidence,
            "entities": list(set(entities)),
            "confidence": 0.87,
            "actions": [{"type": "VIEW_NETWORK", "label": "View Network", "target": "/network"}]
        }

    def _answer_location_query(self, q: str) -> dict:
        if not self.data_store:
            return {"answer": "Data not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        # Find location by name match
        target_loc = None
        for loc in self.data_store.locations:
            if loc.get("name", "").lower() in q or loc.get("area", loc.get("city", "")).lower() in q:
                target_loc = loc
                break

        if not target_loc:
            return {
                "answer": f"Location not found. Available locations include: {', '.join(l.get('name', l['id']) for l in self.data_store.locations[:10])}",
                "evidence": [], "entities": [], "confidence": 0.3,
                "actions": [{"type": "VIEW_MAP", "label": "View Map", "target": "/command-center"}]
            }

        loc_id = target_loc["id"]
        loc_events = [e for e in self.data_store.events if e.get("location_id") == loc_id]
        loc_sightings = [s for s in self.data_store.sightings if s.get("location_id") == loc_id]
        persons_seen = set()
        for s in loc_sightings:
            persons_seen.add(s.get("person_id", ""))
        for e in loc_events:
            for eid in e.get("entities", []):
                persons_seen.add(eid)

        lines = [f"**Location Intelligence: {target_loc['name']}**\n"]
        lines.append(f"City: {target_loc.get('city', 'Unknown')}")
        lines.append(f"Type: {target_loc.get('type', 'Unknown')}")
        lines.append(f"Risk: **{target_loc.get('risk_level', 'Unknown')}**")
        lines.append(f"Events: {len(loc_events)}")
        lines.append(f"Sightings: {len(loc_sightings)}")
        lines.append(f"Persons linked: {len(persons_seen)}")

        if loc_events:
            lines.append("\n**Recent Events:**")
            for ev in sorted(loc_events, key=lambda x: x.get("timestamp", ""), reverse=True)[:5]:
                lines.append(f"  • {ev.get('timestamp', '')[:16]} — {ev.get('description', '')}")

        return {
            "answer": "\n".join(lines),
            "evidence": [f"{len(loc_events)} events at {target_loc['name']}", f"{len(persons_seen)} persons linked"],
            "entities": list(persons_seen)[:10],
            "confidence": 0.85,
            "actions": [{"type": "VIEW_MAP", "label": "Fly to Location", "target": loc_id}]
        }

    def _answer_top_entities(self) -> dict:
        if not self.graph_service:
            return {"answer": "Graph service not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        rankings = self.graph_service.get_centrality_rankings()[:10]
        lines = ["**AI Network Ranking — Top Entities by Combined Centrality**\n"]

        evidence = []
        entities = []
        for i, r in enumerate(rankings):
            bar_len = int(r["combined_score"] / 5)
            bar = "█" * bar_len
            lines.append(f"{i+1:02d}  {r['entity_id']}  {r['name']:<20s}  {bar}  {r['combined_score']}")
            entities.append(r["entity_id"])
            evidence.append(f"{r['name']}: score {r['combined_score']}")

        return {
            "answer": "\n".join(lines),
            "evidence": evidence,
            "entities": entities,
            "confidence": 0.95,
            "actions": [{"type": "VIEW_NETWORK", "label": "View Network", "target": "/network"}]
        }

    def _answer_entity_info(self, entity_id: str) -> dict:
        if not self.data_store:
            return {"answer": "Data not available.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        person = next((p for p in self.data_store.persons if p["id"] == entity_id), None)
        if not person:
            return {"answer": f"Entity {entity_id} not found.", "evidence": [], "entities": [], "confidence": 0, "actions": []}

        explanation = self.graph_service.explain_entity(
            entity_id, self.data_store.persons, self.data_store.relationships,
            self.data_store.events, self.data_store.sightings
        ) if self.graph_service else {}

        lines = [f"**Entity Profile: {person['name']}** ({entity_id})\n"]
        lines.append(f"Aliases: {', '.join(person.get('aliases', ['None']))}")
        lines.append(f"Role: {person.get('role', 'Unknown')}")
        lines.append(f"Cluster: {person.get('cluster_name', person.get('cluster', 'Unknown'))}")
        lines.append(f"Risk Level: **{person.get('risk_level', 'Unknown')}**")

        if explanation:
            lines.append(f"\nConnections: {explanation.get('connections_count', 0)}")
            lines.append(f"Events: {explanation.get('events_count', 0)}")
            lines.append(f"Locations: {explanation.get('locations_count', 0)}")
            cent = explanation.get('centrality', {})
            if cent:
                lines.append(f"Centrality Score: {cent.get('combined_score', 0)}")

        return {
            "answer": "\n".join(lines),
            "evidence": [f"Role: {person.get('role')}", f"Cluster: {person.get('cluster_name')}"],
            "entities": [entity_id],
            "confidence": 0.9,
            "actions": [
                {"type": "VIEW_ENTITY", "label": f"View in Network", "target": entity_id},
                {"type": "VIEW_TIMELINE", "label": "View Timeline", "target": "/timeline"}
            ]
        }


ai_service = AIService()
