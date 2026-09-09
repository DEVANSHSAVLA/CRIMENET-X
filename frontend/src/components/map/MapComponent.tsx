'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Location, Person, Camera, TrafficSignal, TrafficCorridor, TimelineEvent } from '@/lib/types';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import { 
  User, Shield, Video, Radio, Clock, MapPin, Activity, 
  Layers, ChevronDown, ChevronUp, AlertCircle, Eye, Info
} from 'lucide-react';

interface MapComponentProps {
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string) => void;
  onSelectCamera?: (camera: Camera) => void;
  onSelectSignal?: (signal: TrafficSignal) => void;
  onSelectLocation?: (location: Location) => void;
  onSelectEvent?: (event: TimelineEvent) => void;
  cameraRadius?: { lat: number; lng: number; radiusM: number } | null;
  layerVisibility?: {
    locations: boolean;
    events: boolean;
    cameras: boolean;
    signals: boolean;
    traffic: boolean;
    trajectories: boolean;
    heatmap: boolean;
    buildings: boolean;
  };
}

function createGeoJSONCircle(center: [number, number], radiusInMeters: number, points: number = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const radiusInKm = radiusInMeters / 1000.0;
  const distanceX = radiusInKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  };
}

export default function MapComponent({
  selectedEntityId: propEntityId,
  onSelectEntity: propSelectEntity,
  onSelectCamera: propSelectCamera,
  onSelectSignal: propSelectSignal,
  onSelectLocation: propSelectLocation,
  onSelectEvent: propSelectEvent,
  cameraRadius: propCameraRadius,
  layerVisibility = {
    locations: true,
    events: true,
    cameras: true,
    signals: true,
    traffic: true,
    trajectories: true,
    heatmap: false,
    buildings: true,
  }
}: MapComponentProps) {
  const context = useInvestigation();
  const selectedEntityId = propEntityId ?? context.selectedEntityId;
  const onSelectEntity = propSelectEntity ?? context.selectEntity;
  const onSelectCamera = propSelectCamera ?? context.selectCamera;
  const onSelectSignal = propSelectSignal ?? context.selectSignal;
  const onSelectLocation = propSelectLocation ?? context.selectLocation;
  const onSelectEvent = propSelectEvent ?? context.selectEvent;
  const cameraRadius = propCameraRadius ?? context.cameraRadius;

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Marker References
  const locationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const cameraMarkersRef = useRef<maplibregl.Marker[]>([]);
  const signalMarkersRef = useRef<maplibregl.Marker[]>([]);
  const eventMarkersRef = useRef<maplibregl.Marker[]>([]);
  const noticeMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Geospatial Data States
  const [locations, setLocations] = useState<Location[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [signals, setSignals] = useState<TrafficSignal[]>([]);
  const [trafficCorridors, setTrafficCorridors] = useState<TrafficCorridor[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Legend State
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // 1. Fetch All Geospatial & Sensor Data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const [locRes, camRes, sigRes, flowRes, timeRes] = await Promise.all([
          api.getLocations(),
          api.getCameras(),
          api.getTrafficSignals(),
          api.getTrafficFlow(),
          api.getTimeline('CBI-INTERPOL-RED-379'),
        ]);
        setLocations(locRes.locations || []);
        setCameras(camRes.cameras || []);
        setSignals(sigRes.signals || []);
        setTrafficCorridors(flowRes.corridors || []);
        setTimelineEvents((timeRes.events || []).slice(0, 40));
      } catch (err) {
        console.warn('Geo Data API loading fallback');
      }
    };
    loadGeoData();
  }, []);

  // 2. Initialize MapLibre GL
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [72.8777, 19.0760], // Mumbai Core Urban Center
      zoom: 11.2,
      pitch: 55,
      bearing: -15,
      antialias: true,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 3. Camera Coverage Circle Layer (Dynamic Polygon Buffer)
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = 'camera-coverage-radius-source';
    const fillLayerId = 'camera-coverage-radius-fill';
    const lineLayerId = 'camera-coverage-radius-line';

    if (map.current.getLayer(fillLayerId)) map.current.removeLayer(fillLayerId);
    if (map.current.getLayer(lineLayerId)) map.current.removeLayer(lineLayerId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    if (!cameraRadius || !cameraRadius.lat || !cameraRadius.lng) return;

    const circleGeoJSON = createGeoJSONCircle(
      [cameraRadius.lng, cameraRadius.lat],
      cameraRadius.radiusM || 300
    );

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: circleGeoJSON,
    });

    map.current.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#00D4FF',
        'fill-opacity': 0.15,
      },
    });

    map.current.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#00D4FF',
        'line-width': 2,
        'line-dasharray': [3, 2],
        'line-opacity': 0.85,
      },
    });
  }, [cameraRadius]);

  // 4. Render Location Markers (Emerald Pin Glyph)
  useEffect(() => {
    if (!map.current) return;
    locationMarkersRef.current.forEach(m => m.remove());
    locationMarkersRef.current = [];

    if (!layerVisibility.locations) return;

    locations.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer z-20';
      el.dataset.featureType = 'LOCATION';
      el.dataset.featureId = loc.id;

      // Glow halo
      const halo = document.createElement('div');
      halo.className = 'absolute -inset-1.5 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-colors pointer-events-none';
      el.appendChild(halo);

      // Distinct Location Pin Glyph
      const pin = document.createElement('div');
      pin.className = 'relative w-6 h-6 rounded-full bg-emerald-500/90 border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-125';
      pin.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      `;
      el.appendChild(pin);

      // Tooltip
      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid #10B981; border-radius: 6px;">
            <div style="color: #10B981; font-weight: bold;">LOCATION: ${loc.name}</div>
            <div style="color: #E0E0E0; font-size: 10px; margin-top: 2px;">${loc.city}, ${loc.country || 'India'}</div>
            <div style="color: #94A3B8; font-size: 9px; margin-top: 2px;">SOURCE: ${loc.provenance_type || 'SOURCE-DERIVED'}</div>
            <div style="color: #FFB300; font-size: 9px; font-weight: bold;">SUSPECTS LINKED: ${loc.linked_persons || 1}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([loc.lng, loc.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectLocation) onSelectLocation(loc);
        map.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 13.5, pitch: 60, speed: 1.2 });
      });

      locationMarkersRef.current.push(marker);
    });
  }, [locations, layerVisibility.locations, onSelectLocation]);

  // Synchronize Map Camera to Focus Target
  useEffect(() => {
    if (!map.current || !context.mapFocusTarget) return;
    const { lat, lng, zoom } = context.mapFocusTarget;
    map.current.flyTo({
      center: [lng, lat],
      zoom: zoom || 15.0,
      pitch: 60,
      bearing: -15,
      speed: 1.3,
      curve: 1.4,
    });
  }, [context.mapFocusTarget]);

  // 5. Render Camera Markers (CCTV Lens Glyph)
  useEffect(() => {
    if (!map.current) return;
    cameraMarkersRef.current.forEach(m => m.remove());
    cameraMarkersRef.current = [];

    if (!layerVisibility.cameras) return;

    cameras.forEach(cam => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer z-30';
      el.dataset.featureType = 'CAMERA';
      el.dataset.featureId = cam.id;

      const isNearSelected = selectedEntityId && cam.nearby_entities?.includes(selectedEntityId);
      const isLive = cam.status === 'LIVE' || Boolean(cam.stream_url);

      const beacon = document.createElement('div');
      beacon.className = `w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 ${
        isNearSelected
          ? 'bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/50 scale-125 animate-pulse'
          : isLive
            ? 'bg-black/90 border-emerald-400 text-emerald-400 hover:scale-125 shadow-md shadow-emerald-500/20'
            : 'bg-black/85 border-amber-400/60 text-amber-400 hover:scale-125'
      }`;

      beacon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isLive ? '#10B981' : '#FFB300'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>
        </svg>
      `;
      el.appendChild(beacon);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 7px; background: rgba(3,4,6,0.95); border: 1px solid ${isLive ? '#10B981' : '#FFB300'}; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.8); min-width: 180px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="color: ${isLive ? '#10B981' : '#FFB300'}; font-weight: bold;">${cam.id}</span>
              <span style="background: ${isLive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 179, 0, 0.2)'}; color: ${isLive ? '#10B981' : '#FFB300'}; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: bold;">
                ${isLive ? 'LIVE FEED' : (cam.stream_type || 'SIMULATED')}
              </span>
            </div>
            <div style="color: #00D4FF; font-size: 10px; font-weight: bold; margin-top: 3px;">
              ${cam.street_name || cam.name}
            </div>
            <div style="color: #94A3B8; font-size: 9px; margin-top: 2px;">
              CITY: ${cam.city} · RADIUS: ${cam.coverage_radius_m || 300}m
            </div>
            ${cam.nearby_entities && cam.nearby_entities.length > 0 ? `
              <div style="color: #FFB300; font-size: 9px; font-weight: bold; margin-top: 3px;">
                NEARBY SUSPECTS: ${cam.nearby_entities.join(', ')}
              </div>
            ` : ''}
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cam.lng, cam.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([cam.lng, cam.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectCamera) onSelectCamera(cam);
        map.current?.flyTo({ center: [cam.lng, cam.lat], zoom: 15.0, pitch: 60, speed: 1.2 });
      });

      cameraMarkersRef.current.push(marker);
    });
  }, [cameras, layerVisibility.cameras, selectedEntityId, onSelectCamera]);

  // 6. Render Traffic Signal Markers (Traffic Light Glyph)
  useEffect(() => {
    if (!map.current) return;
    signalMarkersRef.current.forEach(m => m.remove());
    signalMarkersRef.current = [];

    if (!layerVisibility.signals) return;

    signals.forEach(sig => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer z-25';
      el.dataset.featureType = 'SIGNAL';
      el.dataset.featureId = sig.id;

      const phaseColor = sig.phase === 'RED' ? '#FF1744' : sig.phase === 'YELLOW' ? '#FFB300' : '#10B981';

      const ring = document.createElement('div');
      ring.className = 'w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-125';
      ring.style.backgroundColor = phaseColor;
      ring.style.boxShadow = `0 0 10px ${phaseColor}`;
      ring.innerHTML = `<span style="font-size: 8px; font-weight: bold; color: #fff; font-family: monospace;">${sig.remaining_seconds || 20}</span>`;
      el.appendChild(ring);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid ${phaseColor}; border-radius: 6px;">
            <div style="color: #fff; font-weight: bold;">TRAFFIC SIGNAL: ${sig.id}</div>
            <div style="color: #94A3B8; font-size: 9px;">${sig.intersection}</div>
            <div style="color: ${phaseColor}; font-weight: bold; font-size: 10px; margin-top: 2px;">PHASE: ${sig.phase} (${sig.remaining_seconds}s)</div>
            <div style="color: #E0E0E0; font-size: 9px;">DENSITY: ${sig.traffic_density}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([sig.lng, sig.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([sig.lng, sig.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectSignal) onSelectSignal(sig);
        map.current?.flyTo({ center: [sig.lng, sig.lat], zoom: 14.5, pitch: 60, speed: 1.2 });
      });

      signalMarkersRef.current.push(marker);
    });
  }, [signals, layerVisibility.signals, onSelectSignal]);

  // 7. Render Timeline Event Markers (Amber Diamond / Event Pulse)
  useEffect(() => {
    if (!map.current) return;
    eventMarkersRef.current.forEach(m => m.remove());
    eventMarkersRef.current = [];

    if (!layerVisibility.events || timelineEvents.length === 0) return;

    // Map events to locations
    const locMap = new Map(locations.map(l => [l.id, l]));

    timelineEvents.forEach(ev => {
      const loc = locMap.get(ev.location_id || '');
      if (!loc) return;

      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer z-20';
      el.dataset.featureType = 'EVENT';
      el.dataset.featureId = ev.id;

      // Diamond Marker
      const diamond = document.createElement('div');
      diamond.className = 'w-4 h-4 bg-purple-500 border-2 border-white rotate-45 flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-150';
      el.appendChild(diamond);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid #A855F7; border-radius: 6px; max-width: 200px;">
            <div style="color: #A855F7; font-weight: bold;">EVENT: ${ev.type}</div>
            <div style="color: #fff; font-size: 10px; margin-top: 2px;">${ev.description}</div>
            <div style="color: #94A3B8; font-size: 9px; margin-top: 2px;">TIME: ${ev.timestamp?.slice(0, 10)}</div>
          </div>
        `);

      // Slightly jitter coordinates to prevent exact overlap with location pin
      const jitterLat = loc.lat + (Math.random() - 0.5) * 0.003;
      const jitterLng = loc.lng + (Math.random() - 0.5) * 0.003;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([jitterLng, jitterLat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([jitterLng, jitterLat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectEvent) onSelectEvent(ev);
        map.current?.flyTo({ center: [jitterLng, jitterLat], zoom: 14, pitch: 60, speed: 1.2 });
      });

      eventMarkersRef.current.push(marker);
    });
  }, [timelineEvents, locations, layerVisibility.events, onSelectEvent]);

  // 8. Traffic Flow Corridors Layer
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = 'traffic-flow-corridors';
    const layerId = 'traffic-flow-layer';

    if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
    if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

    if (!layerVisibility.traffic || trafficCorridors.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: trafficCorridors.map(c => ({
        type: 'Feature',
        properties: { density: c.density, corridor: c.corridor },
        geometry: {
          type: 'LineString',
          coordinates: c.points,
        },
      })),
    };

    map.current.addSource(sourceId, { type: 'geojson', data: geojson });

    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': [
          'match',
          ['get', 'density'],
          'HIGH', '#FF1744',
          'MEDIUM', '#FFB300',
          '#10B981'
        ],
        'line-width': 4,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2],
      },
    });
  }, [trafficCorridors, layerVisibility.traffic]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full bg-crimenet-bg" />

      {/* ── PERSISTENT MAP LEGEND OVERLAY ── */}
      <div className="absolute bottom-6 left-4 z-20">
        <div className="glass-panel p-2.5 rounded-xl border border-white/10 shadow-2xl bg-[#060B14]/90 backdrop-blur-md w-60">
          <div 
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center justify-between cursor-pointer text-xs font-mono font-bold text-white uppercase tracking-wider pb-1"
          >
            <span className="flex items-center gap-1.5 text-crimenet-cyan">
              <Layers className="w-3.5 h-3.5" /> MAP TAXONOMY LEGEND
            </span>
            {isLegendOpen ? <ChevronDown className="w-3.5 h-3.5 text-crimenet-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-crimenet-muted" />}
          </div>

          {isLegendOpen && (
            <div className="space-y-1.5 pt-2 border-t border-white/10 text-[11px] font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0"></div>
                  <span className="text-white/80">Location Hub</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">{locations.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-black border border-amber-400 flex items-center justify-center shrink-0">
                    <Video className="w-2 h-2 text-amber-400" />
                  </div>
                  <span className="text-white/80">Urban CCTV Sensor</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400">{cameras.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-crimenet-crimson border border-white shrink-0"></div>
                  <span className="text-white/80">Traffic Signal Phase</span>
                </div>
                <span className="text-[10px] font-mono text-crimenet-crimson">{signals.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 border border-white rotate-45 shrink-0"></div>
                  <span className="text-white/80">Timeline Incident</span>
                </div>
                <span className="text-[10px] font-mono text-purple-400">{timelineEvents.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400 shrink-0"></div>
                  <span className="text-white/80">Traffic Corridor</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">{trafficCorridors.length}</span>
              </div>

              {cameraRadius && (
                <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[10px] font-mono text-crimenet-cyan">
                  <span className="w-2 h-2 rounded-full bg-crimenet-cyan animate-pulse"></span>
                  <span>Camera Coverage: {cameraRadius.radiusM}m Active</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Attribution & Responsible AI Watermark */}
      <div className="absolute bottom-1.5 right-14 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded border border-white/5 text-[9px] font-mono text-crimenet-muted z-10 flex items-center gap-3 pointer-events-none">
        <span>TEAM AETHERIUS · SIH26189</span>
        <span className="text-white/40">|</span>
        <span>CBI-INTERPOL PUBLIC RED NOTICES (379)</span>
        <span className="text-white/40">|</span>
        <span className="text-emerald-400">URBAN CONTEXT SYNCHRONIZED</span>
      </div>
    </div>
  );
}
