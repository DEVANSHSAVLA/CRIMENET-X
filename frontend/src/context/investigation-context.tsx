'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { 
  Person, Camera, TrafficSignal, Location, EvidenceRecord, TimelineEvent,
  ContextDrawerType, InvestigationMode 
} from '@/lib/types';

interface InvestigationContextType {
  // Selections
  selectedEntityId: string | null;
  selectedEntity: Person | null;
  selectedCamera: Camera | null;
  selectedSignal: TrafficSignal | null;
  selectedEvidence: EvidenceRecord | null;
  selectedLocation: Location | null;
  selectedEvent: TimelineEvent | null;
  selectedHotspot: any | null;

  // Drawer
  drawerType: ContextDrawerType;
  drawerData: any;
  isDrawerOpen: boolean;
  openDrawer: (type: ContextDrawerType, data: any) => void;
  closeDrawer: () => void;

  // Selection Setters
  selectEntity: (entityId: string) => Promise<void>;
  selectCamera: (camera: Camera) => void;
  selectSignal: (signal: TrafficSignal) => void;
  selectEvidence: (evidence: EvidenceRecord) => void;
  selectLocation: (location: Location) => void;
  selectEvent: (event: TimelineEvent) => void;
  selectHotspot: (hotspot: any) => void;
  selectCorridor: (corridor: any) => void;

  // Filters & State
  mode: InvestigationMode;
  setMode: (mode: InvestigationMode) => void;
  timeYear: number;
  setTimeYear: (year: number) => void;
  riskFilter: string | null;
  setRiskFilter: (risk: string | null) => void;
  layers: {
    locations: boolean;
    events: boolean;
    cameras: boolean;
    signals: boolean;
    traffic: boolean;
    trajectories: boolean;
    heatmap: boolean;
    buildings: boolean;
    hotspots: boolean;
    arcs: boolean;
  };
  toggleLayer: (layerKey: string) => void;

  // Modals
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
  isReportOpen: boolean;
  setIsReportOpen: (open: boolean) => void;
  compareEntities: [Person | null, Person | null];
  setCompareEntities: (entities: [Person | null, Person | null]) => void;

  // Active Cross-Module Filters
  activeFilters: {
    country: string | null;
    riskLevel: string | null;
    entityType: string | null;
  };
  setFilter: (key: 'country' | 'riskLevel' | 'entityType', value: string | null) => void;
  clearFilters: () => void;

  // Timeline Synchronization
  timelineCursor: string | null;
  setTimelineCursor: (cursor: string | null) => void;
  isTimelinePlaying: boolean;
  setIsTimelinePlaying: (playing: boolean) => void;

  // Camera Spatial Radius Overlay
  cameraRadius: { lat: number; lng: number; radiusM: number } | null;
  setCameraRadius: (radius: { lat: number; lng: number; radiusM: number } | null) => void;

  // Map Focus Target
  mapFocusTarget: { lat: number; lng: number; zoom?: number; timestamp: number } | null;
  setMapFocusTarget: (target: { lat: number; lng: number; zoom?: number; timestamp: number } | null) => void;

  // AI & Voice Coordination
  pendingAiQuery: string | null;
  setPendingAiQuery: (query: string | null) => void;
  voiceFeedbackNotice: string | null;
  setVoiceFeedbackNotice: (notice: string | null) => void;
  isVoicePanelOpen: boolean;
  setIsVoicePanelOpen: (open: boolean) => void;
  disambiguationState: { query: string; options: any[] } | null;
  setDisambiguationState: (state: { query: string; options: any[] } | null) => void;
  sensitiveConfirmation: { message: string; action: string; payload: any } | null;
  setSensitiveConfirmation: (state: { message: string; action: string; payload: any } | null) => void;
  setLayer: (layerKey: string, value: boolean) => void;
  dispatchAction: (action: string, payload: any) => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export function InvestigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const currentSelectionSeqRef = useRef<number>(0);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>('P-001');
  const [selectedEntity, setSelectedEntity] = useState<Person | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<TrafficSignal | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);

  // Drawer State
  const [drawerType, setDrawerType] = useState<ContextDrawerType>('ENTITY');
  const [drawerData, setDrawerData] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Filters & State
  const [mode, setMode] = useState<InvestigationMode>('EXPLORE');
  const [timeYear, setTimeYear] = useState<number>(2026);
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<{ country: string | null; riskLevel: string | null; entityType: string | null }>({
    country: null,
    riskLevel: null,
    entityType: null,
  });
  const [timelineCursor, setTimelineCursor] = useState<string | null>(null);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);
  const [cameraRadius, setCameraRadius] = useState<{ lat: number; lng: number; radiusM: number } | null>(null);
  const [mapFocusTarget, setMapFocusTarget] = useState<{ lat: number; lng: number; zoom?: number; timestamp: number } | null>(null);

  const setFilter = useCallback((key: 'country' | 'riskLevel' | 'entityType', value: string | null) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({ country: null, riskLevel: null, entityType: null });
    setRiskFilter(null);
  }, []);

  const [layers, setLayers] = useState({
    locations: true,
    events: true,
    cameras: true,
    signals: true,
    traffic: true,
    trajectories: true,
    heatmap: false,
    buildings: true,
    hotspots: true,
    arcs: true,
  });

  // Modals
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [compareEntities, setCompareEntities] = useState<[Person | null, Person | null]>([null, null]);
  const [pendingAiQuery, setPendingAiQuery] = useState<string | null>(null);

  // Voice Interaction & Feedback Coordination
  const [voiceFeedbackNotice, setVoiceFeedbackNotice] = useState<string | null>(null);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState<boolean>(false);
  const [disambiguationState, setDisambiguationState] = useState<{ query: string; options: any[] } | null>(null);
  const [sensitiveConfirmation, setSensitiveConfirmation] = useState<{ message: string; action: string; payload: any } | null>(null);

  useEffect(() => {
    if (voiceFeedbackNotice) {
      const timer = setTimeout(() => setVoiceFeedbackNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [voiceFeedbackNotice]);

  // Initial Load for default entity P-001
  useEffect(() => {
    const loadDefault = async () => {
      try {
        const p1 = await api.getEntity('P-001');
        setSelectedEntity(p1);
        setDrawerData(p1);
      } catch (err) {
        console.warn('Default entity fetch fallback');
      }
    };
    loadDefault();
  }, []);

  const openDrawer = useCallback((type: ContextDrawerType, data: any) => {
    setDrawerType(type);
    setDrawerData(data);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const selectEntity = useCallback(async (entityId: string) => {
    const seq = ++currentSelectionSeqRef.current;
    setSelectedEntityId(entityId);
    openDrawer('ENTITY', { id: entityId, display_name: entityId, loading: true });
    try {
      const details = await api.getEntity(entityId);
      if (currentSelectionSeqRef.current === seq) {
        setSelectedEntity(details);
        setDrawerData(details);
      }
    } catch (e) {
      if (currentSelectionSeqRef.current === seq) {
        console.warn('Entity fetch failed', e);
        const fallback = { id: entityId, display_name: entityId, name: entityId, type: 'PERSON' } as any;
        setSelectedEntity(fallback);
        setDrawerData(fallback);
      }
    }
  }, [openDrawer]);

  const selectCamera = useCallback((camera: Camera) => {
    currentSelectionSeqRef.current += 1;
    setSelectedCamera(camera);
    if (camera.lat && camera.lng) {
      setCameraRadius({
        lat: camera.lat,
        lng: camera.lng,
        radiusM: camera.coverage_radius_m || 350,
      });
      setMapFocusTarget({
        lat: camera.lat,
        lng: camera.lng,
        zoom: 15.2,
        timestamp: Date.now(),
      });
    }
    openDrawer('CAMERA', camera);
  }, [openDrawer]);

  const selectSignal = useCallback((signal: TrafficSignal) => {
    currentSelectionSeqRef.current += 1;
    setSelectedSignal(signal);
    openDrawer('SIGNAL', signal);
  }, [openDrawer]);

  const selectEvidence = useCallback((evidence: EvidenceRecord) => {
    currentSelectionSeqRef.current += 1;
    setSelectedEvidence(evidence);
    openDrawer('EVIDENCE', evidence);
  }, [openDrawer]);

  const selectLocation = useCallback(async (location: Location) => {
    const seq = ++currentSelectionSeqRef.current;
    setSelectedLocation(location);
    openDrawer('LOCATION', { ...location, loading: true });
    try {
      const detailed = await api.getLocation(location.id);
      if (currentSelectionSeqRef.current === seq) {
        setSelectedLocation(detailed);
        setDrawerData(detailed);
      }
    } catch (e) {
      if (currentSelectionSeqRef.current === seq) {
        setDrawerData(location);
      }
    }
  }, [openDrawer]);

  const selectEvent = useCallback((event: TimelineEvent) => {
    currentSelectionSeqRef.current += 1;
    setSelectedEvent(event);
    openDrawer('EVENT', event);
  }, [openDrawer]);

  const selectHotspot = useCallback((hotspot: any) => {
    currentSelectionSeqRef.current += 1;
    setSelectedHotspot(hotspot);
    openDrawer('HOTSPOT', hotspot);
    if (hotspot?.lat && hotspot?.lng) {
      setMapFocusTarget({
        lat: hotspot.lat,
        lng: hotspot.lng,
        zoom: hotspot.countryCode === 'IN' ? 10.5 : 5.8,
        timestamp: Date.now(),
      });
    }
  }, [openDrawer]);

  const selectCorridor = useCallback((corridor: any) => {
    currentSelectionSeqRef.current += 1;
    openDrawer('CORRIDOR', corridor);
    if (corridor?.sourceCoords && corridor?.targetCoords) {
      const midLat = (corridor.sourceCoords[1] + corridor.targetCoords[1]) / 2;
      const midLng = (corridor.sourceCoords[0] + corridor.targetCoords[0]) / 2;
      setMapFocusTarget({
        lat: midLat,
        lng: midLng,
        zoom: 4.8,
        timestamp: Date.now(),
      });
    }
  }, [openDrawer]);

  const toggleLayer = useCallback((layerKey: string) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey as keyof typeof prev],
    }));
  }, []);

  const setLayer = useCallback((layerKey: string, value: boolean) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: value,
    }));
  }, []);

  // Centralized Cross-View Action Dispatcher
  const dispatchAction = useCallback((action: string, payload: any) => {
    // Show feedback notice if available in payload
    if (payload?.feedback_notice) {
      setVoiceFeedbackNotice(payload.feedback_notice);
    }

    switch (action) {
      case 'SELECT_ENTITY': {
        const id = typeof payload === 'string' ? payload : payload?.entity_id || payload?.id;
        if (id) {
          selectEntity(id);
          setVoiceFeedbackNotice(`✓ Selected suspect ${id}`);
        }
        break;
      }
      case 'SELECT_CAMERA': {
        if (payload) {
          selectCamera(payload);
          setVoiceFeedbackNotice(`✓ Selected camera ${payload.name || payload.id}`);
        }
        break;
      }
      case 'SELECT_SIGNAL': {
        if (payload) {
          selectSignal(payload);
          setVoiceFeedbackNotice(`✓ Selected traffic signal ${payload.name || payload.id}`);
        }
        break;
      }
      case 'SELECT_LOCATION': {
        if (payload) {
          selectLocation(payload);
          setVoiceFeedbackNotice(`✓ Selected location ${payload.name || payload.id}`);
        }
        break;
      }
      case 'SELECT_EVENT': {
        if (payload) {
          selectEvent(payload);
          setVoiceFeedbackNotice(`✓ Selected event ${payload.title || payload.id}`);
        }
        break;
      }
      case 'SELECT_EVIDENCE': {
        if (payload) {
          selectEvidence(payload);
          setVoiceFeedbackNotice(`✓ Selected evidence ${payload.id}`);
        }
        break;
      }
      case 'SELECT_HOTSPOT': {
        if (payload) {
          selectHotspot(payload);
          setVoiceFeedbackNotice(`✓ Selected sanctuary ${payload.name || payload.id}`);
        }
        break;
      }
      case 'SELECT_CORRIDOR': {
        if (payload) {
          selectCorridor(payload);
          setVoiceFeedbackNotice(`✓ Selected corridor ${payload.name || payload.id}`);
        }
        break;
      }
      case 'NAVIGATE_COMMAND_CENTER': {
        router.push('/command-center');
        setVoiceFeedbackNotice('✓ Navigated to Command Center');
        break;
      }
      case 'OPEN_GEO': {
        router.push('/geo-intelligence');
        setVoiceFeedbackNotice('✓ Navigated to 3D Geo Intelligence');
        break;
      }
      case 'OPEN_NETWORK':
      case 'FOCUS_NETWORK': {
        const id = typeof payload === 'string' ? payload : payload?.entity_id || selectedEntityId;
        if (id) setSelectedEntityId(id);
        router.push('/network');
        setVoiceFeedbackNotice(`✓ Focused network on ${id || 'suspect'}`);
        break;
      }
      case 'OPEN_TIMELINE':
      case 'NAVIGATE_TIMELINE':
      case 'VIEW_TIMELINE_EVENTS': {
        router.push('/timeline');
        setVoiceFeedbackNotice('✓ Navigated to Timeline');
        break;
      }
      case 'OPEN_ANALYTICS':
      case 'SHOW_COUNTRIES':
      case 'SHOW_CENTRALITY': {
        router.push('/analytics');
        setVoiceFeedbackNotice('✓ Navigated to Analytics');
        break;
      }
      case 'OPEN_EVIDENCE': {
        router.push('/evidence');
        setVoiceFeedbackNotice('✓ Navigated to Evidence Vault');
        break;
      }
      case 'OPEN_ADMIN': {
        router.push('/admin');
        setVoiceFeedbackNotice('✓ Navigated to Admin');
        break;
      }
      case 'PLAY_TIMELINE': {
        setIsTimelinePlaying(true);
        router.push('/timeline');
        setVoiceFeedbackNotice('▶ Playing chronological timeline');
        break;
      }
      case 'PAUSE_TIMELINE': {
        setIsTimelinePlaying(false);
        setVoiceFeedbackNotice('⏸ Timeline paused');
        break;
      }
      case 'NEXT_EVENT': {
        router.push('/timeline');
        setVoiceFeedbackNotice('⏭ Stepping to next event');
        break;
      }
      case 'PREVIOUS_EVENT': {
        router.push('/timeline');
        setVoiceFeedbackNotice('⏮ Stepping to previous event');
        break;
      }
      case 'FOCUS_MAP_LOCATION': {
        if (payload?.lat && payload?.lng) {
          setMapFocusTarget({
            lat: payload.lat,
            lng: payload.lng,
            zoom: payload.zoom || 14.5,
            timestamp: Date.now(),
          });
          if (payload.camera) {
            setSelectedCamera(payload.camera);
            setCameraRadius({
              lat: payload.lat,
              lng: payload.lng,
              radiusM: payload.camera.coverage_radius_m || 350,
            });
            openDrawer('CAMERA', payload.camera);
          }
        }
        router.push('/command-center');
        setVoiceFeedbackNotice(`✓ Focused map on ${payload?.city || payload?.name || 'target'}`);
        break;
      }
      case 'ZOOM_IN': {
        setMapFocusTarget((prev) =>
          prev
            ? { ...prev, zoom: Math.min(18, (prev.zoom || 12) + 2), timestamp: Date.now() }
            : { lat: 18.9438, lng: 72.8233, zoom: 14.5, timestamp: Date.now() }
        );
        router.push('/command-center');
        setVoiceFeedbackNotice('🔍 Zoomed In');
        break;
      }
      case 'ZOOM_OUT': {
        setMapFocusTarget((prev) =>
          prev
            ? { ...prev, zoom: Math.max(7, (prev.zoom || 12) - 2), timestamp: Date.now() }
            : { lat: 18.9438, lng: 72.8233, zoom: 10, timestamp: Date.now() }
        );
        router.push('/command-center');
        setVoiceFeedbackNotice('🔍 Zoomed Out');
        break;
      }
      case 'SET_LAYER': {
        if (payload?.layer) {
          setLayer(payload.layer, payload.value ?? true);
          setVoiceFeedbackNotice(`✓ Layer ${payload.layer} set to ${payload.value ? 'ON' : 'OFF'}`);
        }
        break;
      }
      case 'TOGGLE_CAMERAS': {
        toggleLayer('cameras');
        setVoiceFeedbackNotice('✓ Toggled Cameras layer');
        break;
      }
      case 'TOGGLE_SIGNALS': {
        toggleLayer('signals');
        setVoiceFeedbackNotice('✓ Toggled Traffic Signals layer');
        break;
      }
      case 'COMPARE_ENTITIES': {
        setIsCompareOpen(true);
        setVoiceFeedbackNotice('✓ Opened Comparison view');
        break;
      }
      case 'DISAMBIGUATE_ENTITY': {
        setDisambiguationState({
          query: payload?.query || payload?.target || '',
          options: payload?.disambiguation_options || [],
        });
        setVoiceFeedbackNotice(`Found ${payload?.disambiguation_options?.length || 0} matching suspects`);
        break;
      }
      case 'REQUIRE_SECURITY_CONFIRMATION': {
        setSensitiveConfirmation({
          message: payload?.confirmation_message || 'Critical operation requires explicit human confirmation.',
          action: payload?.operation || action,
          payload,
        });
        break;
      }
      case 'OPEN_EXPLANATION':
      case 'ASK_AI_EXPLANATION': {
        const id = typeof payload === 'string' ? payload : payload?.entity_id || selectedEntityId || 'P-017';
        setPendingAiQuery(`Why is ${id} important in the network?`);
        router.push('/ai-investigator');
        setVoiceFeedbackNotice(`💡 Requesting AI analysis for ${id}`);
        break;
      }
      case 'AI_COPILOT_RESPONSE': {
        router.push('/ai-investigator');
        break;
      }
      case 'RESET_VIEW': {
        setRiskFilter(null);
        setTimeYear(2026);
        clearFilters();
        router.push('/command-center');
        setVoiceFeedbackNotice('✓ Investigation view reset');
        break;
      }
      default:
        console.log('Action dispatched:', action, payload);
    }
  }, [
    router,
    selectEntity,
    selectCamera,
    selectSignal,
    selectLocation,
    selectEvent,
    selectEvidence,
    selectHotspot,
    selectCorridor,
    selectedEntityId,
    toggleLayer,
    setLayer,
    clearFilters,
    openDrawer,
    setMapFocusTarget,
    setCameraRadius,
  ]);

  return (
    <InvestigationContext.Provider
      value={{
        selectedEntityId,
        selectedEntity,
        selectedCamera,
        selectedSignal,
        selectedEvidence,
        selectedLocation,
        selectedEvent,
        selectedHotspot,
        drawerType,
        drawerData,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        selectEntity,
        selectCamera,
        selectSignal,
        selectEvidence,
        selectLocation,
        selectEvent,
        selectHotspot,
        selectCorridor,
        mode,
        setMode,
        timeYear,
        setTimeYear,
        riskFilter,
        setRiskFilter,
        layers,
        toggleLayer,
        setLayer,
        isCompareOpen,
        setIsCompareOpen,
        isReportOpen,
        setIsReportOpen,
        compareEntities,
        setCompareEntities,
        activeFilters,
        setFilter,
        clearFilters,
        timelineCursor,
        setTimelineCursor,
        isTimelinePlaying,
        setIsTimelinePlaying,
        cameraRadius,
        setCameraRadius,
        mapFocusTarget,
        setMapFocusTarget,
        pendingAiQuery,
        setPendingAiQuery,
        voiceFeedbackNotice,
        setVoiceFeedbackNotice,
        isVoicePanelOpen,
        setIsVoicePanelOpen,
        disambiguationState,
        setDisambiguationState,
        sensitiveConfirmation,
        setSensitiveConfirmation,
        dispatchAction,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
}
