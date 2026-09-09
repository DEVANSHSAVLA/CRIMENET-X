// ── Entity & Canonical Types ─────────────────────────────────────
export interface PhysicalDescription {
  height_m: string;
  weight_kg: string;
  hair_color: string;
  eye_color: string;
  distinguishing_marks: string;
}

export interface ProvenanceRecord {
  source: string;
  notice_id?: string;
  source_type: string;
  provenance_badge: 'SOURCE-DERIVED' | 'AI-DERIVED' | 'SIMULATED' | 'SYNTHETIC';
  verification_status: string;
}

export interface Person {
  id: string;
  display_name: string;
  cbi_listed_name?: string;
  forename?: string;
  family_name?: string;
  name?: string; // fallback
  aliases: string[];
  gender: string;
  date_of_birth: string;
  place_of_birth: string;
  nationalities: string[];
  languages_spoken: string[];
  physical_description?: PhysicalDescription;
  notice_id: string;
  notice_status: string;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  offense_categories: string[];
  primary_location_id: string;
  primary_location_name: string;
  primary_city: string;
  source_urls: string[];
  photo_thumbnail_url?: string;
  photo_url?: string;
  provenance: ProvenanceRecord[];
  confidence: number;
  last_updated: string;
  centrality_score?: number;
  connections_count?: number;
  cluster?: string;
  role?: string;
}

export interface Notice {
  id: string;
  person_id: string;
  subject_name: string;
  notice_type: string;
  status: string;
  issuing_country: string;
  charges_raw: string;
  charges_list: string[];
  interpol_url: string;
  cbi_url: string;
  photo_url?: string;
  provenance: string;
  verification_hash: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city: string;
  region?: string;
  country?: string;
  lat: number;
  lng: number;
  type?: string;
  risk_level?: string;
  precision: string;
  synthetic: boolean;
  provenance_type: 'SOURCE-DERIVED' | 'SYNTHETIC / DEMONSTRATION LOCATION';
  confidence: number;
  sightings_count?: number;
  linked_persons?: number;
  source?: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  location_id: string;
  location_name?: string;
  location_city?: string;
  entities: string[];
  confidence: number;
  source: string;
  evidence_hash?: string;
  description: string;
  provenance_badge?: string;
}

// ── Urban Intelligence Types ─────────────────────────────────────
export interface Camera {
  id: string;
  name: string;
  type?: string;
  city: string;
  lat: number;
  lng: number;
  status: 'ONLINE' | 'SIMULATED' | 'OFFLINE' | 'DEMO FEED' | 'LIVE';
  stream_type?: string;
  coverage_radius_m: number;
  street_name?: string;
  stream_url?: string;
  nearby_entities: string[];
  nearby_signals: string[];
  nearby_events: string[];
}

export interface TrafficSignal {
  id: string;
  intersection: string;
  city: string;
  lat: number;
  lng: number;
  status: 'ACTIVE' | 'OFFLINE';
  phase: 'RED' | 'YELLOW' | 'GREEN';
  remaining_seconds: number;
  traffic_density: 'LOW' | 'MEDIUM' | 'HIGH';
  nearby_cameras: string[];
  nearby_entities: string[];
}

export interface TrafficCorridor {
  id: string;
  corridor: string;
  density: 'LOW' | 'MEDIUM' | 'HIGH';
  points: [number, number][]; // [lng, lat]
}

export interface EvidenceRecord {
  id: string;
  person_id: string;
  notice_id: string;
  title: string;
  type: string;
  source: string;
  source_url: string;
  sha256_hash: string;
  timestamp: string;
  uploaded_by: string;
  integrity_status: 'VERIFIED' | 'MODIFIED' | 'UNKNOWN';
  provenance_badge: string;
  summary: string;
}

// ── Network Types ────────────────────────────────────────────────
export interface NetworkNode {
  data: {
    id: string;
    label: string;
    type: string;
    cluster: string;
    cluster_name?: string;
    risk_level: string;
    role?: string;
    centrality: number;
    degree?: number;
    betweenness?: number;
    photo_url?: string;
    nationality?: string;
  };
}

export interface NetworkEdge {
  data: {
    id?: string;
    source: string;
    target: string;
    type: string;
    weight: number;
    confidence: number;
    relationship_classification?: 'SOURCE RELATIONSHIP' | 'DERIVED RELATIONSHIP';
    evidence?: string[];
  };
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  communities?: Community[];
}

export interface Community {
  id: string;
  name: string;
  color: string;
  members: string[];
  member_count: number;
  risk_level: string;
}

// ── Analytics Types ──────────────────────────────────────────────
export interface CentralityRanking {
  entity_id: string;
  name: string;
  degree: number;
  betweenness: number;
  eigenvector: number;
  pagerank: number;
  combined_score: number;
  technical_rationale?: string;
}

export interface Anomaly {
  id: string;
  type: string;
  description: string;
  entities: string[];
  confidence: number;
  severity: string;
  evidence: string[];
}

export interface DashboardStats {
  persons: number;
  notices?: number;
  locations: number;
  events: number;
  relationships: number;
  evidence?: number;
  cameras?: number;
  traffic_signals?: number;
  high_risk_entities: number;
  network_risk_pct: number;
  location_distribution: Record<string, number>;
  event_type_distribution: Record<string, number>;
  monthly_events: Record<string, number>;
  clusters: Record<string, number>;
}

// ── Case & Report Types ──────────────────────────────────────────
export interface CaseSummary {
  id: string;
  name: string;
  team?: string;
  problem_statement?: string;
  theme?: string;
  status: string;
  description: string;
  created_at: string;
  risk_level: string;
  stats: {
    persons: number;
    notices?: number;
    locations: number;
    events: number;
    relationships: number;
    evidence?: number;
    cameras?: number;
    traffic_signals?: number;
    communities: number;
    anomalies: number;
    phones: number;
    vehicles: number;
  };
}

export interface InvestigationReport {
  report_id: string;
  team: string;
  problem_statement: string;
  theme: string;
  title: string;
  case_id: string;
  case_name: string;
  generated_at: string;
  security_classification: string;
  integrity_hash: string;
  blockchain_anchor: string;
  executive_summary: string;
  focus_subject?: Person;
  top_targets_by_centrality: CentralityRanking[];
  active_communities_count: number;
  detected_anomalies: Anomaly[];
  urban_context: {
    monitored_cameras: number;
    monitored_signals: number;
    geographic_hubs: number;
  };
  responsible_ai_disclaimer: string;
  audit_provenance: {
    source_agency: string;
    ingest_timestamp: string;
    data_protection_standard: string;
  };
}

// ── AI & Voice Types ─────────────────────────────────────────────
export interface AIAction {
  type: string;
  label: string;
  target: string;
}

export interface AIResponse {
  answer: string;
  evidence: string[];
  entities: string[];
  confidence: number;
  actions: AIAction[];
}

export interface VoiceCommandResult {
  intent?: string;
  confidence?: number;
  language?: string;
  transcript?: string;
  entities?: string[];
  parameters?: Record<string, any>;
  requires_confirmation?: boolean;
  confirmation_message?: string;
  spoken_response: string;
  action: string;
  target?: string;
  data: any;
  is_disambiguation?: boolean;
  disambiguation_options?: Array<{
    id: string;
    label: string;
    type: string;
    details?: string;
    role?: string;
  }>;
  feedback_notice?: string;
}

export type InvestigationMode = 'EXPLORE' | 'INVESTIGATE' | 'COMPARE';

export type ContextDrawerType = 'ENTITY' | 'CAMERA' | 'SIGNAL' | 'LOCATION' | 'EVENT' | 'EVIDENCE' | 'HOTSPOT' | 'CORRIDOR' | null;

export type ContextSelection =
  | { type: 'ENTITY'; id: string; data: Person }
  | { type: 'CAMERA'; id: string; data: Camera }
  | { type: 'SIGNAL'; id: string; data: TrafficSignal }
  | { type: 'LOCATION'; id: string; data: Location }
  | { type: 'EVENT'; id: string; data: TimelineEvent }
  | { type: 'EVIDENCE'; id: string; data: EvidenceRecord }
  | { type: 'HOTSPOT'; id: string; data: any }
  | { type: 'CORRIDOR'; id: string; data: any }
  | null;

export interface ContextDrawerState {
  type: ContextDrawerType;
  data: any;
  isOpen: boolean;
}

