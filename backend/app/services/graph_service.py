import networkx as nx
from typing import Dict, List, Any, Optional, Set, Tuple


class GraphService:
    """NetworkX-based graph analytics engine for criminal network intelligence."""

    def __init__(self):
        self.G: Optional[nx.Graph] = None
        self._centralities: Dict[str, Dict[str, float]] = {}
        self._communities: List[Dict[str, Any]] = []
        self._anomalies: List[Dict[str, Any]] = []

    def build_graph(self, persons: List[dict], relationships: List[dict]):
        """Build NetworkX graph from persons and relationships."""
        self.G = nx.Graph()

        person_ids = {p["id"] for p in persons}
        for p in persons:
            self.G.add_node(p["id"], **{
                "label": p.get("name", p["id"]),
                "type": "PERSON",
                "cluster": p.get("cluster", "UNKNOWN"),
                "cluster_name": p.get("cluster_name", ""),
                "risk_level": p.get("risk_level", "LOW"),
                "role": p.get("role", "Unknown")
            })

        for r in relationships:
            src, tgt = r["source"], r["target"]
            # Only add edges between nodes that exist and are persons (skip vehicle/location/account ownership for graph metrics)
            if src in person_ids and tgt in person_ids:
                if self.G.has_edge(src, tgt):
                    self.G[src][tgt]["weight"] += r.get("weight", 1)
                else:
                    self.G.add_edge(src, tgt,
                                   weight=r.get("weight", 1),
                                   rel_type=r.get("type", "UNKNOWN"),
                                   confidence=r.get("confidence", 0.5))

        print(f"Graph built: {self.G.number_of_nodes()} nodes, {self.G.number_of_edges()} edges")
        self._compute_all()

    def _compute_all(self):
        """Compute all analytics at startup."""
        self._compute_centralities()
        self._detect_communities()
        self._detect_anomalies()

    def _compute_centralities(self):
        if not self.G or self.G.number_of_nodes() == 0:
            return

        degree = nx.degree_centrality(self.G)
        betweenness = nx.betweenness_centrality(self.G, weight="weight")
        try:
            eigenvector = nx.eigenvector_centrality_numpy(self.G, weight="weight")
        except Exception:
            eigenvector = {n: 0.0 for n in self.G.nodes()}
        pagerank = nx.pagerank(self.G, weight="weight")

        self._centralities = {}
        for node in self.G.nodes():
            d = round(degree.get(node, 0), 4)
            b = round(betweenness.get(node, 0), 4)
            e = round(eigenvector.get(node, 0), 4)
            p = round(pagerank.get(node, 0), 6)
            combined = round((d * 25 + b * 35 + e * 25 + p * 15 * 100) * 100 / 100, 1)
            self._centralities[node] = {
                "entity_id": node,
                "name": self.G.nodes[node].get("label", node),
                "degree": d,
                "betweenness": b,
                "eigenvector": e,
                "pagerank": p,
                "combined_score": min(combined, 99.9)
            }

        print(f"Centralities computed for {len(self._centralities)} nodes")

    def _detect_communities(self):
        if not self.G or self.G.number_of_nodes() == 0:
            return

        try:
            from networkx.algorithms.community import louvain_communities
            communities_sets = louvain_communities(self.G, seed=42)
        except Exception:
            communities_sets = [set(self.G.nodes())]

        cluster_names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"]
        cluster_colors = ["#00D4FF", "#FF1744", "#FFB300", "#4CAF50", "#9C27B0", "#FF9800"]

        self._communities = []
        for i, members in enumerate(communities_sets):
            member_list = sorted(members)
            risk_levels = [self.G.nodes[m].get("risk_level", "LOW") for m in member_list]
            has_critical = "CRITICAL" in risk_levels
            has_high = "HIGH" in risk_levels
            community_risk = "CRITICAL" if has_critical else "HIGH" if has_high else "MEDIUM"

            self._communities.append({
                "id": f"COM-{i+1:02d}",
                "name": f"Community {cluster_names[i % len(cluster_names)]}",
                "color": cluster_colors[i % len(cluster_colors)],
                "members": member_list,
                "member_count": len(member_list),
                "risk_level": community_risk,
            })

        print(f"Communities detected: {len(self._communities)}")

    def _detect_anomalies(self):
        if not self.G or self.G.number_of_nodes() == 0:
            return

        self._anomalies = []

        # 1. Bridge actors (high betweenness, connects different clusters)
        betweenness = nx.betweenness_centrality(self.G)
        threshold = sorted(betweenness.values(), reverse=True)[min(3, len(betweenness)-1)] if betweenness else 0
        for node, bc in betweenness.items():
            if bc >= threshold and bc > 0.05:
                neighbors = list(self.G.neighbors(node))
                neighbor_clusters = set(self.G.nodes[n].get("cluster", "?") for n in neighbors)
                if len(neighbor_clusters) >= 2:
                    self._anomalies.append({
                        "id": f"ANOM-BRIDGE-{node}",
                        "type": "Hidden Bridge Actor",
                        "description": f"{self.G.nodes[node].get('label', node)} connects {len(neighbor_clusters)} otherwise separate network clusters. Betweenness centrality: {bc:.3f}",
                        "entities": [node],
                        "confidence": round(min(bc * 2 + 0.5, 0.99), 2),
                        "severity": "CRITICAL" if bc > 0.2 else "HIGH",
                        "evidence": [
                            f"Betweenness centrality: {bc:.4f}",
                            f"Connected clusters: {', '.join(sorted(neighbor_clusters))}",
                            f"Direct connections: {len(neighbors)}",
                        ]
                    })

        # 2. Communication bursts (high-weight edges)
        for u, v, data in self.G.edges(data=True):
            w = data.get("weight", 1)
            if w >= 12:
                self._anomalies.append({
                    "id": f"ANOM-BURST-{u}-{v}",
                    "type": "Communication Burst",
                    "description": f"Unusually high communication frequency ({w} interactions) between {self.G.nodes[u].get('label', u)} and {self.G.nodes[v].get('label', v)}",
                    "entities": [u, v],
                    "confidence": round(min(w / 25 + 0.5, 0.98), 2),
                    "severity": "HIGH" if w >= 15 else "MEDIUM",
                    "evidence": [f"Interaction weight: {w}", f"Relationship type: {data.get('rel_type', 'UNKNOWN')}"]
                })

        # 3. Circular financial flows
        try:
            DG = nx.DiGraph()
            # We don't have directed info in undirected graph, so look for triangles
            triangles = [clique for clique in nx.enumerate_all_cliques(self.G) if len(clique) == 3]
            if len(triangles) > 0:
                top_triangles = triangles[:5]
                for tri in top_triangles:
                    self._anomalies.append({
                        "id": f"ANOM-CYCLE-{'-'.join(tri)}",
                        "type": "Potential Circular Transaction Pattern",
                        "description": f"Closed loop detected between {', '.join(self.G.nodes[n].get('label', n) for n in tri)}",
                        "entities": list(tri),
                        "confidence": 0.78,
                        "severity": "MEDIUM",
                        "evidence": [f"Triangle subgraph involving {len(tri)} entities"]
                    })
        except Exception:
            pass

        print(f"Anomalies detected: {len(self._anomalies)}")

    def get_centrality_rankings(self) -> List[dict]:
        rankings = sorted(self._centralities.values(), key=lambda x: x["combined_score"], reverse=True)
        return rankings

    def get_entity_centrality(self, entity_id: str) -> Optional[dict]:
        return self._centralities.get(entity_id)

    def get_communities(self) -> List[dict]:
        return self._communities

    def get_anomalies(self) -> List[dict]:
        return self._anomalies

    def get_ego_network(self, entity_id: str, depth: int = 2) -> Dict[str, List]:
        if not self.G or entity_id not in self.G:
            return {"nodes": [], "edges": []}

        ego = nx.ego_graph(self.G, entity_id, radius=depth)
        nodes = []
        for n in ego.nodes():
            node_data = dict(self.G.nodes[n])
            cent = self._centralities.get(n, {})
            nodes.append({
                "data": {
                    "id": n,
                    "label": node_data.get("label", n),
                    "type": node_data.get("type", "PERSON"),
                    "cluster": node_data.get("cluster", "UNKNOWN"),
                    "risk_level": node_data.get("risk_level", "LOW"),
                    "centrality": cent.get("combined_score", 0),
                }
            })

        edges = []
        for u, v, data in ego.edges(data=True):
            edges.append({
                "data": {
                    "source": u, "target": v,
                    "type": data.get("rel_type", "UNKNOWN"),
                    "weight": data.get("weight", 1),
                    "confidence": data.get("confidence", 0.5),
                }
            })

        return {"nodes": nodes, "edges": edges}

    def get_full_network(self) -> Dict[str, List]:
        if not self.G:
            return {"nodes": [], "edges": []}
        return self.get_ego_network_full()

    def get_ego_network_full(self) -> Dict[str, List]:
        if not self.G:
            return {"nodes": [], "edges": []}

        nodes = []
        for n in self.G.nodes():
            node_data = dict(self.G.nodes[n])
            cent = self._centralities.get(n, {})
            nodes.append({
                "data": {
                    "id": n,
                    "label": node_data.get("label", n),
                    "type": node_data.get("type", "PERSON"),
                    "cluster": node_data.get("cluster", "UNKNOWN"),
                    "cluster_name": node_data.get("cluster_name", ""),
                    "risk_level": node_data.get("risk_level", "LOW"),
                    "role": node_data.get("role", "Unknown"),
                    "centrality": cent.get("combined_score", 0),
                    "degree": cent.get("degree", 0),
                    "betweenness": cent.get("betweenness", 0),
                }
            })

        edges = []
        for u, v, data in self.G.edges(data=True):
            edges.append({
                "data": {
                    "source": u, "target": v,
                    "type": data.get("rel_type", "UNKNOWN"),
                    "weight": data.get("weight", 1),
                    "confidence": data.get("confidence", 0.5),
                }
            })

        return {"nodes": nodes, "edges": edges}

    def explain_entity(self, entity_id: str, persons: List[dict], relationships: List[dict], events: List[dict], sightings: List[dict]) -> dict:
        """Generate explainable AI reasoning for why an entity is flagged."""
        if not self.G or entity_id not in self.G:
            return {"factors": [], "combined_confidence": 0}

        cent = self._centralities.get(entity_id, {})
        node_data = dict(self.G.nodes[entity_id])
        neighbors = list(self.G.neighbors(entity_id))
        neighbor_clusters = set(self.G.nodes[n].get("cluster", "?") for n in neighbors)

        # Count events involving this entity
        entity_events = [e for e in events if entity_id in e.get("entities", [])]
        entity_sightings = [s for s in sightings if s.get("person_id") == entity_id]
        unique_locations = set(s.get("location_id") for s in entity_sightings)

        # Find shared vehicles
        shared_vehicles = [r for r in relationships if
                          (r["source"] == entity_id or r["target"] == entity_id) and
                          r.get("type") == "SHARED_VEHICLE"]

        # Find financial relationships
        financial_rels = [r for r in relationships if
                         (r["source"] == entity_id or r["target"] == entity_id) and
                         r.get("type") in ("TRANSFERRED_TO", "OWNS") and
                         (r["source"].startswith("A-") or r["target"].startswith("A-") or r.get("type") == "TRANSFERRED_TO")]

        factors = []
        confidences = []

        if len(neighbors) >= 5:
            conf = min(len(neighbors) / 20 + 0.5, 0.98)
            factors.append({"factor": f"{len(neighbors)} direct connections in the network", "confidence": round(conf, 2), "icon": "network"})
            confidences.append(conf)

        if len(neighbor_clusters) >= 2:
            conf = min(len(neighbor_clusters) / 4 + 0.6, 0.98)
            factors.append({"factor": f"Connects {len(neighbor_clusters)} otherwise separate clusters", "confidence": round(conf, 2), "icon": "bridge"})
            confidences.append(conf)

        if len(unique_locations) >= 3:
            conf = min(len(unique_locations) / 15 + 0.6, 0.97)
            factors.append({"factor": f"Repeated movement between {len(unique_locations)} locations", "confidence": round(conf, 2), "icon": "location"})
            confidences.append(conf)

        if len(entity_events) >= 5:
            conf = min(len(entity_events) / 30 + 0.5, 0.96)
            factors.append({"factor": f"Associated with {len(entity_events)} high-confidence events", "confidence": round(conf, 2), "icon": "event"})
            confidences.append(conf)

        if shared_vehicles:
            others = []
            for sv in shared_vehicles:
                other = sv["target"] if sv["source"] == entity_id else sv["source"]
                others.append(other)
            factors.append({"factor": f"Shared vehicle with {', '.join(others)}", "confidence": 0.93, "icon": "vehicle"})
            confidences.append(0.93)

        if financial_rels:
            factors.append({"factor": f"{len(financial_rels)} financial relationship(s) detected", "confidence": 0.90, "icon": "finance"})
            confidences.append(0.90)

        if cent.get("betweenness", 0) > 0.1:
            factors.append({"factor": f"High betweenness centrality ({cent['betweenness']:.4f}) — acts as network bridge", "confidence": 0.95, "icon": "centrality"})
            confidences.append(0.95)

        combined_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0

        return {
            "entity_id": entity_id,
            "name": node_data.get("label", entity_id),
            "risk_level": node_data.get("risk_level", "LOW"),
            "factors": factors,
            "centrality": cent,
            "combined_confidence": combined_confidence,
            "connections_count": len(neighbors),
            "clusters_connected": len(neighbor_clusters),
            "events_count": len(entity_events),
            "locations_count": len(unique_locations),
        }


graph_service = GraphService()
