'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Location, Person, Camera, TrafficSignal, TrafficCorridor } from '@/lib/types';
import { api } from '@/lib/api';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#FF1744',
  HIGH: '#FF5252',
  MEDIUM: '#FFB300',
  LOW: '#4FC3F7',
};

interface MapComponentProps {
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string) => void;
  onSelectCamera?: (camera: Camera) => void;
  onSelectSignal?: (signal: TrafficSignal) => void;
  onSelectLocation?: (location: Location) => void;
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

export default function MapComponent({
  selectedEntityId,
  onSelectEntity,
  onSelectCamera,
  onSelectSignal,
  onSelectLocation,
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const cameraMarkersRef = useRef<maplibregl.Marker[]>([]);
  const signalMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [locations, setLocations] = useState<Location[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [signals, setSignals] = useState<TrafficSignal[]>([]);
  const [trafficCorridors, setTrafficCorridors] = useState<TrafficCorridor[]>([]);

  // Fetch all map entities and urban sensor data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const [locRes, camRes, sigRes, flowRes] = await Promise.all([
          api.getLocations(),
          api.getCameras(),
          api.getTrafficSignals(),
          api.getTrafficFlow(),
        ]);
        setLocations(locRes.locations || []);
        setCameras(camRes.cameras || []);
        setSignals(sigRes.signals || []);
        setTrafficCorridors(flowRes.corridors || []);
      } catch (err) {
        console.warn('Geo Data API loading fallback');
      }
    };
    loadGeoData();
  }, []);

  // Initialize MapLibre GL
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [78.9629, 22.5937], // India Overview
      zoom: 4.8,
      pitch: 50,
      bearing: -10,
      antialias: true,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.current.on('load', () => {
      // Smooth fly-to initial hub (Mumbai corridor)
      map.current?.flyTo({
        center: [72.8777, 19.0760],
        zoom: 11,
        pitch: 58,
        bearing: -20,
        speed: 0.8,
        curve: 1.2,
      });

      // Add 3D Buildings Fill-Extrusion Layer
      if (map.current?.getSource('carto')) {
        // Optional 3D buildings can be added if vector tiles support
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Sync Location Markers
  useEffect(() => {
    if (!map.current) return;

    // Clear old location markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!layerVisibility.locations) return;

    locations.forEach(loc => {
      const el = document.createElement('div');
      el.className = 'group relative cursor-pointer z-20';
      el.dataset.featureType = 'LOCATION';
      el.dataset.featureId = loc.id;

      const pulseRing = document.createElement('div');
      pulseRing.className = 'absolute -inset-2 rounded-full bg-crimenet-cyan/20 animate-ping opacity-60 pointer-events-none';
      el.appendChild(pulseRing);

      const dot = document.createElement('div');
      dot.className = 'relative w-4 h-4 rounded-full bg-crimenet-cyan border-2 border-white shadow-lg transition-transform duration-200 group-hover:scale-150';
      el.appendChild(dot);

      // Hover-only Tooltip
      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 4px; background: rgba(3,4,6,0.95); border: 1px solid #00D4FF; border-radius: 6px;">
            <div style="color: #00D4FF; font-weight: bold; text-transform: uppercase;">${loc.name}</div>
            <div style="color: #E0E0E0; margin-top: 2px;">${loc.city}, ${loc.country || 'India'}</div>
            <div style="color: #94A3B8; font-size: 9px; margin-top: 2px;">TYPE: ${loc.provenance_type || 'SOURCE-DERIVED'}</div>
            <div style="color: #FFB300; font-size: 9px; margin-top: 2px;">SUSPECTS LINKED: ${loc.linked_persons || 1}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([loc.lng, loc.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectLocation) onSelectLocation(loc);
        map.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 13.5, pitch: 60, speed: 1.2 });
      });

      markersRef.current.push(marker);
    });
  }, [locations, layerVisibility.locations, onSelectLocation]);

  // Sync Camera Markers (Urban Intelligence Layer)
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

      // Illuminated glow if linked to selected entity
      const isNearSelected = selectedEntityId && cam.nearby_entities?.includes(selectedEntityId);

      const beacon = document.createElement('div');
      beacon.className = `w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 ${
        isNearSelected
          ? 'bg-crimenet-cyan/30 border-crimenet-cyan shadow-lg shadow-cyan-500/50 scale-125 animate-pulse'
          : 'bg-black/80 border-crimenet-cyan/50 text-crimenet-cyan hover:scale-125'
      }`;

      beacon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>
        </svg>
      `;
      el.appendChild(beacon);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid #00D4FF; border-radius: 6px;">
            <div style="color: #00D4FF; font-weight: bold;">${cam.name}</div>
            <div style="color: #94A3B8; font-size: 9px;">TYPE: ${cam.type} · ${cam.city}</div>
            <div style="color: #4CAF50; font-size: 9px; font-weight: bold; margin-top: 2px;">STATUS: ${cam.status} [SIMULATED FEED]</div>
            <div style="color: #FFB300; font-size: 9px;">NEARBY ENTITIES: ${cam.nearby_entities?.length || 0}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([cam.lng, cam.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([cam.lng, cam.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectCamera) onSelectCamera(cam);
        map.current?.flyTo({ center: [cam.lng, cam.lat], zoom: 14.5, pitch: 60, speed: 1.2 });
      });

      cameraMarkersRef.current.push(marker);
    });
  }, [cameras, layerVisibility.cameras, selectedEntityId, onSelectCamera]);

  // Sync Traffic Signal Markers (Urban Intelligence Layer)
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

      const phaseColor = sig.phase === 'RED' ? '#FF1744' : sig.phase === 'YELLOW' ? '#FFB300' : '#4CAF50';

      const ring = document.createElement('div');
      ring.className = `w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-transform duration-200 group-hover:scale-125`;
      ring.style.backgroundColor = phaseColor;
      ring.style.boxShadow = `0 0 12px ${phaseColor}`;

      ring.innerHTML = `
        <span style="font-size: 8px; font-weight: bold; color: #fff; font-family: monospace;">${sig.remaining_seconds || 20}</span>
      `;
      el.appendChild(ring);

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="font-family: monospace; font-size: 11px; padding: 6px; background: rgba(3,4,6,0.95); border: 1px solid ${phaseColor}; border-radius: 6px;">
            <div style="color: #fff; font-weight: bold;">TRAFFIC SIGNAL: ${sig.id}</div>
            <div style="color: #94A3B8; font-size: 9px;">${sig.intersection}</div>
            <div style="color: ${phaseColor}; font-weight: bold; font-size: 10px; margin-top: 2px;">PHASE: ${sig.phase} (${sig.remaining_seconds}s)</div>
            <div style="color: #E0E0E0; font-size: 9px;">CONGESTION: ${sig.traffic_density}</div>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([sig.lng, sig.lat])
        .addTo(map.current!);

      el.addEventListener('mouseenter', () => {
        if (map.current) popup.setLngLat([sig.lng, sig.lat]).addTo(map.current);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.remove();
        if (onSelectSignal) onSelectSignal(sig);
        map.current?.flyTo({ center: [sig.lng, sig.lat], zoom: 14.5, pitch: 60, speed: 1.2 });
      });

      signalMarkersRef.current.push(marker);
    });
  }, [signals, layerVisibility.signals, onSelectSignal]);

  // Traffic Flow Corridors Layer
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
          '#4CAF50'
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

      {/* Attribution & Responsible AI Watermark */}
      <div className="absolute bottom-1.5 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-white/5 text-[9px] font-mono text-crimenet-muted z-10 flex items-center gap-3 pointer-events-none">
        <span>TEAM AETHERIUS · SIH26189</span>
        <span className="text-white/40">|</span>
        <span>CBI-INTERPOL PUBLIC RED NOTICES (379)</span>
        <span className="text-white/40">|</span>
        <span className="text-emerald-400">URBAN CONTEXT ACTIVE</span>
      </div>
    </div>
  );
}
