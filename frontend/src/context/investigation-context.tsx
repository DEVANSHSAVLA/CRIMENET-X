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
  });

  // Modals
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [compareEntities, setCompareEntities] = useState<[Person | null, Person | null]>([null, null]);
  const [pendingAiQuery, setPendingAiQuery] = useState<string | null>(null);

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

  const toggleLayer = useCallback((layerKey: string) => {
    setLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey as keyof typeof prev],
    }));
  }, []);

  // Centralized Cross-View Action Dispatcher
  const dispatchAction = useCallback((action: string, payload: any) => {
    switch (action) {
      case 'SELECT_ENTITY': {
        const id = typeof payload === 'string' ? payload : payload?.entity_id || payload?.id;
        if (id) selectEntity(id);
        break;
      }
      case 'SELECT_CAMERA': {
        if (payload) selectCamera(payload);
        break;
      }
      case 'SELECT_SIGNAL': {
        if (payload) selectSignal(payload);
        break;
      }
      case 'SELECT_LOCATION': {
        if (payload) selectLocation(payload);
        break;
      }
      case 'SELECT_EVENT': {
        if (payload) selectEvent(payload);
        break;
      }
      case 'SELECT_EVIDENCE': {
        if (payload) selectEvidence(payload);
        break;
      }
      case 'FOCUS_NETWORK': {
        const id = typeof payload === 'string' ? payload : payload?.entity_id || selectedEntityId;
        if (id) setSelectedEntityId(id);
        router.push('/network');
        break;
      }
      case 'FOCUS_MAP_LOCATION': {
        if (payload?.lat && payload?.lng) {
          setMapFocusTarget({
            lat: payload.lat,
            lng: payload.lng,
            zoom: payload.zoom || 15.2,
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
        break;
      }
      case 'VIEW_TIMELINE_EVENTS': {
        router.push('/timeline');
        break;
      }
      case 'NAVIGATE_TIMELINE': {
        router.push('/timeline');
        break;
      }
      case 'ASK_AI_EXPLANATION': {
        const id = typeof payload === 'string' ? payload : selectedEntityId || 'P-001';
        setPendingAiQuery(`Why is ${id} important in the network?`);
        router.push('/ai-investigator');
        break;
      }
      case 'TOGGLE_CAMERAS': {
        toggleLayer('cameras');
        break;
      }
      case 'TOGGLE_SIGNALS': {
        toggleLayer('signals');
        break;
      }
      case 'RESET_VIEW': {
        setRiskFilter(null);
        setTimeYear(2026);
        router.push('/command-center');
        break;
      }
      case 'FLY_TO_CITY': {
        router.push('/command-center');
        break;
      }
      default:
        console.log('Action dispatched:', action, payload);
    }
  }, [router, selectEntity, selectCamera, selectSignal, selectLocation, selectEvent, selectEvidence, selectedEntityId, toggleLayer, openDrawer]);

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
        mode,
        setMode,
        timeYear,
        setTimeYear,
        riskFilter,
        setRiskFilter,
        layers,
        toggleLayer,
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
