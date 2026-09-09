import type {
  CaseSummary,
  Person,
  Location,
  TimelineEvent,
  NetworkData,
  CentralityRanking,
  Community,
  Anomaly,
  DashboardStats,
  AIResponse,
  Camera,
  TrafficSignal,
  TrafficCorridor,
  EvidenceRecord,
  InvestigationReport,
  VoiceCommandResult
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    console.warn(`API Error: ${res.status} on ${endpoint}`);
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Case
  getCase: (id: string = 'CBI-INTERPOL-RED-379') => fetchAPI<CaseSummary>(`/api/v1/cases/${id}`),

  // Entities (379 Red Notices)
  getEntities: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ entities: Person[] }>(`/api/v1/entities${qs}`);
  },
  getEntity: (id: string) => fetchAPI<Person & {
    centrality: CentralityRanking;
    connections: NetworkData;
    events: TimelineEvent[];
    location_history: any[];
    explanation: any;
  }>(`/api/v1/entities/${id}`),

  // Network Topology
  getNetwork: (caseId: string = 'CBI-INTERPOL-RED-379') => fetchAPI<NetworkData>(`/api/v1/network/${caseId}`),
  getNeighbors: (entityId: string, depth = 2) => fetchAPI<NetworkData>(`/api/v1/network/${entityId}/neighbors?depth=${depth}`),

  // Geospatial & Locations
  getLocations: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ locations: Location[] }>(`/api/v1/locations${qs}`);
  },
  getLocation: (id: string) => fetchAPI<Location & {
    associated_cases: any[];
    associated_persons: any[];
    associated_events: any[];
    nearby_cameras: any[];
    nearby_signals: any[];
    associated_evidence: any[];
  }>(`/api/v1/locations/${id}`),
  getSightings: (entityId?: string) => {
    const qs = entityId ? `?entity_id=${entityId}` : '';
    return fetchAPI<{ sightings: any[] }>(`/api/v1/sightings${qs}`);
  },

  // Urban Intelligence: Cameras
  getCameras: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ cameras: Camera[]; total: number }>(`/api/v1/cameras${qs}`);
  },
  getCamera: (id: string) => fetchAPI<Camera & { entity_details: Person[]; signal_details: TrafficSignal[]; event_details: TimelineEvent[] }>(`/api/v1/cameras/${id}`),

  // Urban Intelligence: Traffic Signals & Flow
  getTrafficSignals: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ signals: TrafficSignal[]; total: number }>(`/api/v1/traffic/signals${qs}`);
  },
  getTrafficSignal: (id: string) => fetchAPI<TrafficSignal & { entity_details: Person[]; camera_details: Camera[] }>(`/api/v1/traffic/signals/${id}`),
  getTrafficFlow: () => fetchAPI<{ corridors: TrafficCorridor[]; total: number }>(`/api/v1/traffic/flow`),

  // Evidence Repository & SHA-256
  getEvidence: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ evidence: EvidenceRecord[]; total: number }>(`/api/v1/evidence${qs}`);
  },
  verifyEvidence: (id: string) => fetchAPI<{ evidence_id: string; verification_status: string; blockchain_anchor: string; sha256_hash: string }>(`/api/v1/evidence/${id}/verify`, { method: 'POST' }),
  revealEvidenceHash: (id: string, password: string) => fetchAPI<{ evidence_id: string; sha256_hash: string; is_hash_protected: boolean; verification_status: string; audit_entry: any }>(`/api/v1/evidence/${id}/reveal-hash`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),
  getEvidenceAuditLogs: () => fetchAPI<{ audit_logs: any[]; total: number }>('/api/v1/evidence/audit-logs'),

  // Timeline
  getTimeline: (caseId: string = 'CBI-INTERPOL-RED-379', params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchAPI<{ events: TimelineEvent[]; total: number }>(`/api/v1/timeline/${caseId}${qs}`);
  },

  // Analytics
  getCentrality: () => fetchAPI<{ rankings: CentralityRanking[] }>('/api/v1/analytics/centrality'),
  getCommunities: () => fetchAPI<{ communities: Community[] }>('/api/v1/analytics/communities'),
  getAnomalies: () => fetchAPI<{ anomalies: Anomaly[]; total: number; by_type: Record<string, number> }>('/api/v1/analytics/anomalies'),
  getStats: () => fetchAPI<DashboardStats>('/api/v1/analytics/stats'),

  // Explainable AI Investigator Copilot
  askAI: (question: string, caseId: string = 'CBI-INTERPOL-RED-379', contextEntityId?: string) => fetchAPI<AIResponse>('/api/v1/ai/query', {
    method: 'POST',
    body: JSON.stringify({ question, case_id: caseId, context_entity_id: contextEntityId }),
  }),
  askAIChat: (messages: { role: string; content: string }[], caseId: string = 'CBI-INTERPOL-RED-379', contextEntityId?: string) => fetchAPI<AIResponse>('/api/v1/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, case_id: caseId, context_entity_id: contextEntityId }),
  }),
  uploadAIDocument: async (file: File, caseId: string = 'CBI-INTERPOL-RED-379') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('case_id', caseId);
    const res = await fetch(`${API_BASE}/api/v1/ai/upload-document`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error(`Document upload failed: ${res.status}`);
    return res.json();
  },
  uploadAIImage: async (file: File, caseId: string = 'CBI-INTERPOL-RED-379') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('case_id', caseId);
    const res = await fetch(`${API_BASE}/api/v1/ai/upload-image`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) throw new Error(`Image upload failed: ${res.status}`);
    return res.json();
  },

  // Voice Command Processing
  sendVoiceCommand: (transcript: string, contextEntityId?: string, language?: string) => fetchAPI<VoiceCommandResult>('/api/v1/voice/command', {
    method: 'POST',
    body: JSON.stringify({ transcript, context_entity_id: contextEntityId, language }),
  }),


  // Official Investigation Report Generation
  generateReport: (caseId: string = 'CBI-INTERPOL-RED-379', focusEntityId?: string) => fetchAPI<InvestigationReport>('/api/v1/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ case_id: caseId, focus_entity_id: focusEntityId }),
  }),
};
