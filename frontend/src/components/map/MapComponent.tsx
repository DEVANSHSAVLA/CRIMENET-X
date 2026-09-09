'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Location, Person, Camera, TrafficSignal, TrafficCorridor, TimelineEvent } from '@/lib/types';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import { 
  User, Shield, Video, Radio, Clock, MapPin, Activity, 
  Layers, ChevronDown, ChevronUp, AlertCircle, Eye, Info,
  Globe, Compass, Plane, HelpCircle, X, ExternalLink
} from 'lucide-react';
import { 
  GLOBAL_HOTSPOTS, 
  TRANSNATIONAL_FLIGHT_ARCS, 
  MAP_TAXONOMY_EXPLANATION, 
  type GlobalHotspot, 
  type FlightArc 
} from '@/lib/global-hotspots';

interface MapComponentProps {
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string) => void;
  onSelectCamera?: (camera: Camera) => void;
  onSelectSignal?: (signal: TrafficSignal) => void;
  onSelectLocation?: (location: Location) => void;
  onSelectEvent?: (event: TimelineEvent) => void;
  onSelectHotspot?: (hotspot: GlobalHotspot) => void;
  cameraRadius?: { lat: number; lng: number; radiusM: number } | null;
  initialViewMode?: 'GLOBAL' | 'NATIONAL' | 'URBAN';
  layerVisibility?: {
    locations?: boolean;
    events?: boolean;
    cameras?: boolean;
    signals?: boolean;
    traffic?: boolean;
    trajectories?: boolean;
    heatmap?: boolean;
    buildings?: boolean;
    hotspots?: boolean;
    arcs?: boolean;
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

function generateArcPoints(start: [number, number], end: [number, number], numPoints: number = 40): [number, number][] {
  const points: [number, number][] = [];
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;

  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;
  const distance = Math.hypot(lng2 - lng1, lat2 - lat1);
  const arcHeight = Math.min(distance * 0.22, 18);

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const controlLng = midLng;
    const controlLat = midLat + arcHeight;

    const lng = (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
    const lat = (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
    points.push([lng, lat]);
  }
  return points;
}

export default function MapComponent({
  selectedEntityId: propEntityId,
  onSelectEntity: propSelectEntity,
  onSelectCamera: propSelectCamera,
  onSelectSignal: propSelectSignal,
  onSelectLocation: propSelectLocation,
  onSelectEvent: propSelectEvent,
  onSelectHotspot,
  cameraRadius: propCameraRadius,
  initialViewMode = 'GLOBAL',
  layerVisibility = {
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
  const hotspotMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Geospatial Data States
  const [locations, setLocations] = useState<Location[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [signals, setSignals] = useState<TrafficSignal[]>([]);
  const [trafficCorridors, setTrafficCorridors] = useState<TrafficCorridor[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // View Mode State
  const [currentViewMode, setCurrentViewMode] = useState<'GLOBAL' | 'NATIONAL' | 'URBAN'>(initialViewMode);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
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

  // View Mode Transition Handlers
  const setViewMode = (mode: 'GLOBAL' | 'NATIONAL' | 'URBAN') => {
    setCurrentViewMode(mode);
    if (!map.current) return;

    if (mode === 'GLOBAL') {
      map.current.flyTo({
        center: [30.0, 24.0],
        zoom: 1.85,
        pitch: 15,
        bearing: 0,
        speed: 1.2,
      });
    } else if (mode === 'NATIONAL') {
      map.current.flyTo({
        center: [78.9629, 22.5937],
        zoom: 4.8,
        pitch: 35,
        bearing: -5,
        speed: 1.2,
      });
    } else if (mode === 'URBAN') {
      map.current.flyTo({
        center: [72.8777, 19.0760],
        zoom: 12.5,
        pitch: 55,
        bearing: -15,
        speed: 1.2,
      });
    }
  };

  // 2. Initialize MapLibre GL
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Start with Global View coordinates
    const initialCenter: [number, number] = initialViewMode === 'GLOBAL' ? [30.0, 24.0] : initialViewMode === 'NATIONAL' ? [78.96, 22.59] : [72.8777, 19.0760];
    const initialZoom = initialViewMode === 'GLOBAL' ? 1.85 : initialViewMode === 'NATIONAL' ? 4.8 : 11.2;
    const initialPitch = initialViewMode === 'GLOBAL' ? 15 : initialViewMode === 'NATIONAL' ? 35 : 55;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: initialCenter,
      zoom: initialZoom,
      pitch: initialPitch,
      bearing: 0,
      antialias: true,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    const handleFlyTo = (e: any) => {
      if (!map.current || !e.detail) return;
      const { center, zoom = 12, pitch = 55, bearing = 0 } = e.detail;
      map.current.flyTo({
        center,
        zoom,
        pitch,
        bearing,
        essential: true,
        speed: 1.2,
      });
    };

    const handleCameraAngle = (e: any) => {
      if (!map.current || !e.detail) return;
      const { pitch = 55, bearing = 0 } = e.detail;
      map.current.easeTo({
        pitch,
        bearing,
        duration: 1000,
      });
    };

    const handleSetViewMode = (e: any) => {
      if (e.detail?.mode) {
        setViewMode(e.detail.mode);
      }
    };

    window.addEventListener('map-fly-to', handleFlyTo);
    window.addEventListener('map-set-camera-angle', handleCameraAngle);
    window.addEventListener('map-set-view-mode', handleSetViewMode);

    return () => {
      window.removeEventListener('map-fly-to', handleFlyTo);
      window.removeEventListener('map-set-camera-angle', handleCameraAngle);
      window.removeEventListener('map-set-view-mode', handleSetViewMode);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 3. Render Transnational Flight Arcs Layer
  useEffect(() => {
    if (!map.current) return;

    const setupArcs = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const sourceId = 'transnational-flight-arcs-source';
      const lineLayerId = 'transnational-flight-arcs-line';
      const glowLayerId = 'transnational-flight-arcs-glow';

      if (map.current.getLayer(lineLayerId)) map.current.removeLayer(lineLayerId);
      if (map.current.getLayer(glowLayerId)) map.current.removeLayer(glowLayerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      if (layerVisibility.arcs === false) return;

      const arcFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = TRANSNATIONAL_FLIGHT_ARCS.map((arc) => {
        const coords = generateArcPoints(arc.sourceCoords, arc.targetCoords, 50);
        return {
          type: 'Feature',
          properties: {
            id: arc.id,
            corridorType: arc.corridorType,
            description: arc.description,
            density: arc.density,
          },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        };
      });

      const arcGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: arcFeatures,
      };

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: arcGeoJSON,
      });

      // Outer glow line
      map.current.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'density'],
            'CRITICAL', '#FF1744',
            'HIGH', '#00D4FF',
            '#10B981'
          ],
          'line-width': 4.5,
          'line-opacity': 0.35,
          'line-blur': 2,
        },
      });

      // Core dashed line
      map.current.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'match',
            ['get', 'density'],
            'CRITICAL', '#FF5252',
            'HIGH', '#00E5FF',
            '#34D399'
          ],
          'line-width': 2.0,
          'line-dasharray': [3, 2],
          'line-opacity': 0.9,
        },
      });
    };

    if (map.current.isStyleLoaded()) {
      setupArcs();
    } else {
      map.current.once('load', setupArcs);
    }
  }, [layerVisibility.arcs]);

  // 4. Render Global Hotspot Spotted Markers
  useEffect(() => {
    if (!map.current) return;
    hotspotMarkersRef.current.forEach(m => m.remove());
    hotspotMarkersRef.current = [];

    if (layerVisibility.hotspots === false) return;

    GLOBAL_HOTSPOTS.forEach((spot) => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.minWidth = '24px';
      el.style.maxWidth = '24px';
      el.style.minHeight = '24px';
      el.style.maxHeight = '24px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.dataset.featureType = 'GLOBAL_HOTSPOT';
      el.dataset.featureId = spot.id;

      const isIndia = spot.countryCode === 'IN';
      const accentColor = isIndia ? '#F59E0B' : '#F43F5E';

      // Micro pulse ring (exactly 22px, never expands container)
      const pulse = document.createElement('div');
      pulse.className = 'absolute rounded-full pointer-events-none animate-ping';
      pulse.style.width = '20px';
      pulse.style.height = '20px';
      pulse.style.backgroundColor = isIndia ? 'rgba(245, 158, 11, 0.35)' : 'rgba(244, 63, 94, 0.35)';
      el.appendChild(pulse);

      // Core Pinpoint 18px circle
      const pin = document.createElement('div');
      pin.className = 'relative rounded-full flex items-center justify-center font-mono font-bold text-white shadow-md transition-transform duration-200 group-hover:scale-125';
      pin.style.width = '18px';
      pin.style.height = '18px';
      pin.style.backgroundColor = '#070D18';
      pin.style.border = `2px solid ${accentColor}`;
      pin.style.boxShadow = `0 0 8px ${accentColor}aa`;
      pin.style.fontSize = '8.5px';
      pin.style.lineHeight = '1';
      pin.textContent = String(spot.fugitiveCount);
      el.appendChild(pin);

      // Hover micro-badge
      const label = document.createElement('div');
      label.className = 'absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded bg-black/95 border border-white/20 text-[9px] font-mono text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50';
      label.textContent = `${spot.flag} ${spot.name}`;
      el.appendChild(label);

      // Interactive Popup
      const popup = new maplibregl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 10px; background: rgba(5,10,20,0.98); border: 1px solid #FF1744; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.95); max-width: 270px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 6px;">
              <span style="font-size: 14px;">${spot.flag}</span>
              <span style="color: #FF1744; font-weight: bold; font-size: 11px;">${spot.name.toUpperCase()}</span>
              <span style="background: rgba(255, 23, 68, 0.2); color: #FF5252; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">
                ${spot.fugitiveCount} RED NOTICES
              </span>
            </div>
            <div style="color: #00D4FF; font-size: 10px; font-weight: bold; margin-bottom: 3px;">
              TREATY: ${spot.extraditionStatus}
            </div>
            <div style="color: #94A3B8; font-size: 9px; line-height: 1.4; margin-bottom: 6px;">
              ${spot.investigativeRationale}
            </div>
            <div style="color: #FFB300; font-size: 9px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
              TOP CHARGES: ${spot.topOffenses.slice(0, 2).join(' · ')}
            </div>
            <div style="margin-top: 6px; font-size: 8px; color: #10B981; text-align: center; font-weight: bold;">
              CLICK TO FLY 3D & INSPECT FUGITIVES
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([spot.lng, spot.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([spot.lng, spot.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectHotspot) onSelectHotspot(spot);
        map.current?.flyTo({
          center: [spot.lng, spot.lat],
          zoom: spot.countryCode === 'IN' ? 10.5 : 5.8,
          pitch: 50,
          bearing: 0,
          speed: 1.2,
        });
      });

      hotspotMarkersRef.current.push(marker);
    });
  }, [layerVisibility.hotspots, onSelectHotspot]);

  // 5. Camera Coverage Circle Layer (Dynamic Polygon Buffer)
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

  // 6. Render Location Markers (Emerald Pin Glyph)
  useEffect(() => {
    if (!map.current) return;
    locationMarkersRef.current.forEach(m => m.remove());
    locationMarkersRef.current = [];

    if (!layerVisibility.locations) return;

    locations.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.minWidth = '18px';
      el.style.maxWidth = '18px';
      el.style.minHeight = '18px';
      el.style.maxHeight = '18px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.dataset.featureType = 'LOCATION';
      el.dataset.featureId = loc.id;

      const pin = document.createElement('div');
      pin.className = 'w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-125';
      pin.innerHTML = `<span class="w-1 h-1 rounded-full bg-white"></span>`;
      el.appendChild(pin);

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

  // 7. Render Camera Markers (CCTV Lens Glyph)
  useEffect(() => {
    if (!map.current) return;
    cameraMarkersRef.current.forEach(m => m.remove());
    cameraMarkersRef.current = [];

    if (!layerVisibility.cameras) return;

    cameras.forEach(cam => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.minWidth = '20px';
      el.style.maxWidth = '20px';
      el.style.minHeight = '20px';
      el.style.maxHeight = '20px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.dataset.featureType = 'CAMERA';
      el.dataset.featureId = cam.id;

      const isNearSelected = selectedEntityId && cam.nearby_entities?.includes(selectedEntityId);
      const isLive = cam.status === 'LIVE' || Boolean(cam.stream_url);

      const beacon = document.createElement('div');
      beacon.className = `w-4 h-4 rounded flex items-center justify-center border transition-all duration-200 group-hover:scale-125 ${
        isNearSelected
          ? 'bg-amber-500/40 border-amber-400 shadow-md shadow-amber-500/50 animate-pulse'
          : isLive
            ? 'bg-black/90 border-emerald-400 text-emerald-400 shadow-sm'
            : 'bg-black/85 border-amber-400/70 text-amber-400'
      }`;

      beacon.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${isLive ? '#10B981' : '#FFB300'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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

  // 8. Render Traffic Signal Markers (Traffic Light Glyph)
  useEffect(() => {
    if (!map.current) return;
    signalMarkersRef.current.forEach(m => m.remove());
    signalMarkersRef.current = [];

    if (!layerVisibility.signals) return;

    signals.forEach(sig => {
      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.minWidth = '18px';
      el.style.maxWidth = '18px';
      el.style.minHeight = '18px';
      el.style.maxHeight = '18px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.dataset.featureType = 'SIGNAL';
      el.dataset.featureId = sig.id;

      const phaseColor = sig.phase === 'RED' ? '#FF1744' : sig.phase === 'YELLOW' ? '#FFB300' : '#10B981';

      const ring = document.createElement('div');
      ring.className = 'w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm transition-transform duration-200 group-hover:scale-125';
      ring.style.backgroundColor = phaseColor;
      ring.style.boxShadow = `0 0 6px ${phaseColor}`;
      ring.innerHTML = `<span style="font-size: 7px; font-weight: bold; color: #fff; font-family: monospace;">${sig.remaining_seconds || 20}</span>`;
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

  // 9. Render Timeline Event Markers (Purple Diamond Glyph)
  useEffect(() => {
    if (!map.current) return;
    eventMarkersRef.current.forEach(m => m.remove());
    eventMarkersRef.current = [];

    if (!layerVisibility.events || timelineEvents.length === 0) return;

    const locMap = new Map(locations.map(l => [l.id, l]));

    timelineEvents.forEach(ev => {
      const loc = locMap.get(ev.location_id || '');
      if (!loc) return;

      const el = document.createElement('div');
      el.className = 'group cursor-pointer select-none';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.minWidth = '14px';
      el.style.maxWidth = '14px';
      el.style.minHeight = '14px';
      el.style.maxHeight = '14px';
      el.style.position = 'relative';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.dataset.featureType = 'EVENT';
      el.dataset.featureId = ev.id;

      const diamond = document.createElement('div');
      diamond.className = 'w-2.5 h-2.5 bg-purple-500 border border-white rotate-45 flex items-center justify-center shadow-sm transition-transform duration-200 group-hover:scale-150';
      el.appendChild(diamond);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid #A855F7; border-radius: 6px; max-width: 200px;">
            <div style="color: #A855F7; font-weight: bold;">EVENT: ${ev.type}</div>
            <div style="color: #fff; font-size: 10px; margin-top: 2px;">${ev.description}</div>
            <div style="color: #94A3B8; font-size: 9px; margin-top: 2px;">TIME: ${ev.timestamp?.slice(0, 10)}</div>
          </div>
        `);

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

  // 10. Traffic Flow Corridors Layer
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

  // 11. Crime Heatmap Layer (Dynamic Geo Density)
  useEffect(() => {
    if (!map.current) return;

    const setupHeatmap = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const sourceId = 'crime-heatmap-source';
      const layerId = 'crime-heatmap-layer';

      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      if (layerVisibility.heatmap === false || locations.length === 0) return;

      const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

      locations.forEach(loc => {
        const weight = loc.risk_level === 'CRITICAL' ? 1.0 : loc.risk_level === 'HIGH' ? 0.8 : loc.risk_level === 'MEDIUM' ? 0.5 : 0.3;
        features.push({
          type: 'Feature',
          properties: { weight, name: loc.name },
          geometry: {
            type: 'Point',
            coordinates: [loc.lng, loc.lat],
          },
        });
      });

      timelineEvents.forEach(ev => {
        const loc = locations.find(l => l.id === ev.location_id);
        if (loc) {
          const jitterLng = loc.lng + (Math.random() - 0.5) * 0.005;
          const jitterLat = loc.lat + (Math.random() - 0.5) * 0.005;
          features.push({
            type: 'Feature',
            properties: { weight: 0.7 },
            geometry: {
              type: 'Point',
              coordinates: [jitterLng, jitterLat],
            },
          });
        }
      });

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      map.current.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 15,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 0,
            1, 1,
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3,
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 212, 255, 0)',
            0.2, 'rgba(0, 212, 255, 0.6)',
            0.4, 'rgba(16, 185, 129, 0.75)',
            0.6, 'rgba(255, 179, 0, 0.85)',
            0.8, 'rgba(255, 23, 68, 0.9)',
            1, 'rgba(255, 0, 85, 1.0)',
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 4,
            5, 14,
            10, 30,
            14, 48,
          ],
          'heatmap-opacity': 0.85,
        },
      });
    };

    if (map.current.isStyleLoaded()) {
      setupHeatmap();
    } else {
      map.current.once('load', setupHeatmap);
    }
  }, [locations, timelineEvents, layerVisibility.heatmap]);

  // 12. 3D Buildings Fill-Extrusion Layer
  useEffect(() => {
    if (!map.current) return;

    const setupBuildings = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const layerId = '3d-buildings-extrusion';
      if (map.current.getLayer(layerId)) {
        map.current.setLayoutProperty(
          layerId,
          'visibility',
          layerVisibility.buildings !== false ? 'visible' : 'none'
        );
        return;
      }

      if (layerVisibility.buildings === false) return;
      if (!map.current.getSource('carto')) return;

      const styleLayers = map.current.getStyle().layers || [];
      let labelLayerId: string | undefined;
      for (const layer of styleLayers) {
        if (layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']) {
          labelLayerId = layer.id;
          break;
        }
      }

      try {
        map.current.addLayer({
          id: layerId,
          source: 'carto',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 13,
          paint: {
            'fill-extrusion-color': '#0f172a',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13, 0,
              13.5, ['coalesce', ['get', 'render_height'], ['get', 'height'], 22]
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13, 0,
              13.5, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
            ],
            'fill-extrusion-opacity': 0.75,
          },
        }, labelLayerId);
      } catch (e) {
        console.warn('3D building extrusion not available');
      }
    };

    if (map.current.isStyleLoaded()) {
      setupBuildings();
    } else {
      map.current.once('load', setupBuildings);
    }
  }, [layerVisibility.buildings]);

  // 13. Suspect Trajectories Layer
  useEffect(() => {
    if (!map.current) return;

    const setupTrajectories = () => {
      if (!map.current || !map.current.isStyleLoaded()) return;

      const sourceId = 'suspect-trajectories-source';
      const lineLayerId = 'suspect-trajectories-line';
      const glowLayerId = 'suspect-trajectories-glow';

      if (map.current.getLayer(lineLayerId)) map.current.removeLayer(lineLayerId);
      if (map.current.getLayer(glowLayerId)) map.current.removeLayer(glowLayerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);

      if (layerVisibility.trajectories === false) return;

      const trajectoryRoutes = [
        {
          id: 'TRAJ-001',
          name: 'P-017 Mumbai-Pune Smuggling Path',
          points: [
            [72.8147, 18.9067], // Colaba Safehouse
            [72.8234, 18.9438], // Marine Drive
            [72.8153, 19.0176], // Worli Sea Face
            [72.8495, 19.0596], // Bandra East
            [72.8518, 19.0422], // Dharavi Workshop
            [72.8296, 19.1364], // Andheri West Hub
            [73.8077, 18.5074], // Pune Kothrud
            [73.8930, 18.5362], // Pune Koregaon Park
          ],
          color: '#00D4FF',
        },
        {
          id: 'TRAJ-002',
          name: 'Delhi Financial Laundering Transit',
          points: [
            [77.2167, 28.6315], // Connaught Place
            [77.2334, 28.6507], // Chandni Chowk
            [77.1909, 28.6519], // Karol Bagh
            [77.0460, 28.5921], // Dwarka
            [77.1000, 28.5562], // IGI Airport T3
          ],
          color: '#FFB300',
        },
        {
          id: 'TRAJ-003',
          name: 'Interstate Western Logistics Run',
          points: [
            [72.8567, 19.2307], // Borivali
            [72.8789, 19.0728], // Kurla Yard
            [73.7380, 18.5912], // Hinjewadi IT Park
            [73.9260, 18.5089], // Hadapsar MIDC
          ],
          color: '#10B981',
        },
      ];

      const features: GeoJSON.Feature<GeoJSON.LineString>[] = trajectoryRoutes.map(route => ({
        type: 'Feature',
        properties: {
          id: route.id,
          name: route.name,
          color: route.color,
        },
        geometry: {
          type: 'LineString',
          coordinates: route.points,
        },
      }));

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      // Outer glow line
      map.current.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 5,
          'line-opacity': 0.35,
          'line-blur': 3,
        },
      });

      // Core dashed line
      map.current.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.9,
        },
      });
    };

    if (map.current.isStyleLoaded()) {
      setupTrajectories();
    } else {
      map.current.once('load', setupTrajectories);
    }
  }, [layerVisibility.trajectories]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full bg-crimenet-bg" />

      {/* ── TOP VIEW MODE SWITCHER CONTROL BAR (CENTERED, NON-COLLIDING) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 max-w-[calc(100vw-360px)]">
        <div className="glass-panel p-1.5 rounded-xl border border-white/10 shadow-2xl bg-[#060B14]/90 backdrop-blur-md flex items-center gap-1.5">
          <button
            onClick={() => setViewMode('GLOBAL')}
            className={`btn-3d px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentViewMode === 'GLOBAL'
                ? 'bg-crimenet-cyan text-black shadow-[0_0_15px_rgba(0,212,255,0.5)]'
                : 'bg-black/50 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="World Map: 379 CBI-Interpol Red Notices mapped across international sanctuary hubs & flight arcs"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌍 GLOBAL WORLD VIEW (SPOTTED)</span>
          </button>

          <button
            onClick={() => setViewMode('NATIONAL')}
            className={`btn-3d px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentViewMode === 'NATIONAL'
                ? 'bg-crimenet-amber text-black shadow-[0_0_15px_rgba(255,179,0,0.5)]'
                : 'bg-black/50 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="National Indian Corridors: State syndicates (Punjab, Manipur, Maharashtra, Gujarat, Delhi)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🇮🇳 NATIONAL SYNDICATES</span>
          </button>

          <button
            onClick={() => setViewMode('URBAN')}
            className={`btn-3d px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentViewMode === 'URBAN'
                ? 'bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'bg-black/50 text-white/80 hover:text-white hover:bg-white/10'
            }`}
            title="Urban Tactical View: Mumbai live street CCTV streams & intersection signal phases"
          >
            <Video className="w-3.5 h-3.5" />
            <span>🏙️ URBAN TACTICAL CORRIDORS</span>
          </button>
        </div>

        {/* Map Taxonomy Primer Button */}
        <button
          onClick={() => setIsTaxonomyModalOpen(true)}
          className="btn-3d px-3 py-2 rounded-xl bg-black/80 border border-crimenet-cyan/40 text-crimenet-cyan font-mono text-xs font-bold transition-all flex items-center gap-1.5 hover:bg-crimenet-cyan/20 shadow-lg"
          title="Explain what each map sign renders, why it renders, and for what investigative reason"
        >
          <HelpCircle className="w-4 h-4 text-crimenet-cyan" />
          <span>MAP TAXONOMY PRIMER</span>
        </button>
      </div>

      {/* ── PERSISTENT MAP LEGEND OVERLAY ── */}
      <div className="absolute bottom-6 left-4 z-20">
        <div className="glass-panel p-2.5 rounded-xl border border-white/10 shadow-2xl bg-[#060B14]/90 backdrop-blur-md w-64">
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
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500/90 border border-white flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                    🔴
                  </div>
                  <span className="text-white/80">Red Notice Hotspot</span>
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold">{GLOBAL_HOTSPOTS.length} hubs</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-crimenet-cyan shrink-0"></div>
                  <span className="text-white/80">Flight & Smuggling Arc</span>
                </div>
                <span className="text-[10px] font-mono text-crimenet-cyan font-bold">{TRANSNATIONAL_FLIGHT_ARCS.length} routes</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shrink-0"></div>
                  <span className="text-white/80">Jurisdiction Police Hub</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{locations.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-black border border-amber-400 flex items-center justify-center shrink-0">
                    <Video className="w-2 h-2 text-amber-400" />
                  </div>
                  <span className="text-white/80">Urban CCTV Sensor</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{cameras.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-crimenet-crimson border border-white shrink-0"></div>
                  <span className="text-white/80">Traffic Signal Phase</span>
                </div>
                <span className="text-[10px] font-mono text-crimenet-crimson font-bold">{signals.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 border border-white rotate-45 shrink-0"></div>
                  <span className="text-white/80">Timeline Sighting</span>
                </div>
                <span className="text-[10px] font-mono text-purple-400 font-bold">{timelineEvents.length}</span>
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

      {/* ── MAP TAXONOMY PRIMER MODAL (WHAT, WHY, AND FOR WHAT REASON) ── */}
      {isTaxonomyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl border border-crimenet-cyan/40 bg-[#060B14]/95 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-crimenet-cyan/20 border border-crimenet-cyan/40 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-crimenet-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-mono tracking-wider">
                    MAP INTELLIGENCE & SIGN TAXONOMY PRIMER
                  </h3>
                  <p className="text-[10px] font-mono text-crimenet-muted">
                    Forensic breakdown: What each map glyph renders, why it was chosen, and its investigative purpose.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTaxonomyModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto scrollbar-dark space-y-3.5">
              {MAP_TAXONOMY_EXPLANATION.map((item, idx) => (
                <div 
                  key={idx}
                  className="card-3d p-3.5 rounded-xl bg-black/60 border border-white/10 hover:border-crimenet-cyan/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-2">
                      <span>{item.sign}</span>
                      <span className="text-[10px] text-crimenet-cyan font-normal">→ {item.target}</span>
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-bold"
                      style={{ backgroundColor: `${item.color}20`, color: item.color, border: `1px solid ${item.color}40` }}
                    >
                      AUTHENTICATED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/5">
                    <div>
                      <span className="text-[10px] font-mono text-crimenet-muted uppercase block font-bold">What & Why It Renders:</span>
                      <p className="text-white/85 leading-relaxed mt-0.5">{item.whyRenders}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-crimenet-amber uppercase block font-bold">Investigative & Legal Reason:</span>
                      <p className="text-white/85 leading-relaxed mt-0.5">{item.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[10px] font-mono text-crimenet-muted">
              <span>LEGAL GROUNDING: BSA 2023 SEC 63 · INTERPOL CONSTITUTION ART 83 · PMLA 2002</span>
              <button
                onClick={() => setIsTaxonomyModalOpen(false)}
                className="btn-3d px-4 py-1.5 rounded-lg bg-crimenet-cyan text-black font-bold text-xs shadow-md"
              >
                Close Primer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attribution & Responsible AI Watermark */}
      <div className="absolute bottom-1.5 right-14 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded border border-white/5 text-[9px] font-mono text-crimenet-muted z-10 flex items-center gap-3 pointer-events-none">
        <span>TEAM AETHERIUS · SIH26189</span>
        <span className="text-white/40">|</span>
        <span>CBI-INTERPOL PUBLIC RED NOTICES (379)</span>
        <span className="text-white/40">|</span>
        <span className="text-emerald-400">GLOBAL SPOTTED INTELLIGENCE SYNCHRONIZED</span>
      </div>
    </div>
  );
}
