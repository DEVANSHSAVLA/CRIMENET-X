'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  Users, MapPin, Video, Radio, Activity, Shield, AlertTriangle, 
  Layers, Clock, Filter, Eye, ChevronRight, Globe, Plane,
  Compass, Crosshair, Radar, Sparkles, Zap, RotateCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { CaseSummary, CentralityRanking, Camera, TrafficSignal, Location } from '@/lib/types';
import { MUMBAI_STREET_CAMERAS } from '@/components/panels/context-drawer';

const Map = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-crimenet-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-crimenet-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-crimenet-cyan font-mono text-xs tracking-widest uppercase">
          INITIALIZING AETHERIUS 3D URBAN INTELLIGENCE...
        </div>
      </div>
    </div>
  ),
});

export default function CommandCenter() {
  const {
    selectedEntityId,
    selectEntity,
    selectCamera,
    selectSignal,
    selectLocation,
    selectEvent,
    selectHotspot,
    selectCorridor,
    layers,
    toggleLayer,
    timeYear,
    setTimeYear,
    riskFilter,
    setRiskFilter,
    dispatchAction,
  } = useInvestigation();

  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseSummary | null>(null);
  const [rankings, setRankings] = useState<CentralityRanking[]>([]);
  const [isOrbitMode, setIsOrbitMode] = useState(false);
  const [activeCityFocus, setActiveCityFocus] = useState('Mumbai');

  // Load Case & Centrality Rankings
  useEffect(() => {
    const init = async () => {
      try {
        const [caseRes, centRes] = await Promise.all([
          api.getCase('CBI-INTERPOL-RED-379'),
          api.getCentrality(),
        ]);
        setCaseData(caseRes);
        setRankings(centRes.rankings.slice(0, 5));
      } catch (err) {
        console.warn('Initial data fetch fallback');
      }
    };
    init();
  }, []);

  // 3D Orbit Camera Reconnaissance Loop
  useEffect(() => {
    if (!isOrbitMode) return;
    const cities: Record<string, { lat: number; lng: number }> = {
      Mumbai: { lat: 19.0760, lng: 72.8777 },
      Delhi: { lat: 28.6139, lng: 77.2090 },
      Pune: { lat: 18.5204, lng: 73.8567 },
    };
    const target = cities[activeCityFocus] || cities.Mumbai;
    let angle = 0;
    const orbitInterval = setInterval(() => {
      angle = (angle + 1.5) % 360;
      dispatchAction('FOCUS_MAP_LOCATION', {
        lat: target.lat,
        lng: target.lng,
        bearing: angle,
        pitch: 62,
        zoom: 12.8,
      });
    }, 250);

    return () => clearInterval(orbitInterval);
  }, [isOrbitMode, activeCityFocus, dispatchAction]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* 3D Geospatial Map Layer */}
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        onSelectEvent={selectEvent}
        onSelectHotspot={selectHotspot}
        onSelectCorridor={selectCorridor}
        layerVisibility={layers}
        initialViewMode="URBAN"
        topBarPlacement="offset-command-center"
      />

      {/* ── 3D FLOATING HUD LEFT PANEL: URBAN LAYERS & SENSORS ── */}
      <div className="absolute left-4 top-4 bottom-4 w-76 flex flex-col gap-3 pointer-events-none z-20">
        <GlassPanel title="3D SENSOR MATRIX" className="pointer-events-auto depth-3d-box">
          <div className="space-y-4">
            
            {/* 3D Orbit Reconnaissance Controller */}
            <div className="p-2.5 rounded-xl bg-cyan-950/25 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                  3D RECON ORBIT
                </span>
                <button
                  onClick={() => setIsOrbitMode(!isOrbitMode)}
                  className={`btn-3d px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold transition-all ${
                    isOrbitMode 
                      ? 'bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,212,255,0.6)]' 
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  {isOrbitMode ? 'ORBIT ACTIVE' : 'START ORBIT'}
                </button>
              </div>

              {/* City Selector for 3D Camera */}
              <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
                {['Mumbai', 'Delhi', 'Pune'].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setActiveCityFocus(c);
                      const coords: Record<string, { lat: number; lng: number; zoom: number }> = {
                        Mumbai: { lat: 19.0760, lng: 72.8777, zoom: 12.5 },
                        Delhi: { lat: 28.6139, lng: 77.2090, zoom: 12.0 },
                        Pune: { lat: 18.5204, lng: 73.8567, zoom: 12.2 },
                      };
                      const t = coords[c];
                      dispatchAction('FOCUS_MAP_LOCATION', { ...t, pitch: 60, bearing: -20 });
                    }}
                    className={`btn-3d py-1 rounded-lg font-bold border transition-all ${
                      activeCityFocus === c
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-black/40 border-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Infrastructure Layers */}
            <div>
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5 font-mono">
                <Layers className="w-3 h-3 text-crimenet-cyan" /> Geospatial & Sensor Toggles
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { key: 'hotspots', label: 'Global Spots (16 Hubs)', icon: Globe, color: 'text-rose-400' },
                  { key: 'arcs', label: 'Flight Arcs (10 Routes)', icon: Plane, color: 'text-crimenet-cyan' },
                  { key: 'locations', label: 'Regional Locations (38)', icon: MapPin, color: 'text-emerald-400' },
                  { key: 'cameras', label: 'Urban Cameras (8 Active)', icon: Video, color: 'text-crimenet-amber' },
                  { key: 'signals', label: 'Traffic Signals (9 Intersections)', icon: Radio, color: 'text-crimenet-crimson' },
                  { key: 'traffic', label: 'Traffic Flow Corridors', icon: Activity, color: 'text-crimenet-blue' },
                  { key: 'trajectories', label: 'Suspect Trajectories', icon: Clock, color: 'text-white' },
                ].map(({ key, label, icon: Icon, color }) => (
                  <label key={key} className="btn-3d flex items-center justify-between py-1 px-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-white/90 font-medium text-[11px]">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers[key as keyof typeof layers]}
                      onChange={() => toggleLayer(key)}
                      className="accent-crimenet-cyan rounded cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Live Mumbai Public CCTV Corridors */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-cyan uppercase font-bold tracking-widest mb-1.5 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3 text-crimenet-amber" /> Live Mumbai Feeds (4)
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                  3D PTZ
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                {MUMBAI_STREET_CAMERAS.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => selectCamera(cam)}
                    className="btn-3d p-2 rounded-xl bg-white/5 hover:bg-crimenet-cyan/20 border border-white/10 hover:border-crimenet-cyan/50 text-left transition-all flex items-center gap-2 group"
                    title={`Open live feed for ${cam.street_name}`}
                  >
                    <span className="text-sm group-hover:scale-125 transition-transform">{cam.icon}</span>
                    <div className="truncate">
                      <div className="text-white font-bold group-hover:text-crimenet-cyan truncate">{cam.short_label}</div>
                      <div className="text-[8px] text-crimenet-muted flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                        {cam.id}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Environmental & 3D Extrusions */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-1.5 font-mono">
                3D Volumetric Terrain
              </div>
              <div className="space-y-1 text-xs">
                <label className="btn-3d flex items-center justify-between py-1 px-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10">
                  <span className="text-white/80 text-[11px]">3D Architectural Extrusions</span>
                  <input
                    type="checkbox"
                    checked={layers.buildings}
                    onChange={() => toggleLayer('buildings')}
                    className="accent-crimenet-cyan rounded cursor-pointer"
                  />
                </label>
                <label className="btn-3d flex items-center justify-between py-1 px-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10">
                  <span className="text-white/80 text-[11px]">Event Density Thermal Grid</span>
                  <input
                    type="checkbox"
                    checked={layers.heatmap}
                    onChange={() => toggleLayer('heatmap')}
                    className="accent-crimenet-cyan rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Timeline Filter */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center mb-1 font-mono">
                <span className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3 text-crimenet-cyan" /> Timeline Scrubber
                </span>
                <span className="text-xs font-bold text-crimenet-cyan">{timeYear}</span>
              </div>
              <input
                type="range"
                min="2021"
                max="2026"
                step="1"
                value={timeYear}
                onChange={(e) => setTimeYear(parseInt(e.target.value))}
                className="w-full accent-crimenet-cyan cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>

            {/* Warrant Risk Filter */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1 font-mono">
                <Filter className="w-3 h-3 text-crimenet-amber" /> Risk Filter
              </div>
              <div className="flex gap-1">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => {
                  const isSelected = (!riskFilter && lvl === 'ALL') || riskFilter === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setRiskFilter(lvl === 'ALL' ? null : lvl)}
                      className={`chip-3d flex-1 py-1 text-[9px] font-mono font-bold rounded-lg tracking-wider transition-all select-none ${
                        isSelected
                          ? 'bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/50 shadow-md shadow-cyan-500/20'
                          : 'bg-white/5 text-crimenet-muted hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </GlassPanel>
      </div>

      {/* ── 3D FLOATING HUD RIGHT PANEL: GYROSCOPE & OPERATION METRICS ── */}
      <div className="absolute right-4 top-4 w-84 flex flex-col gap-3 pointer-events-none z-20">
        
        {/* 3D HOLOGRAPHIC THREAT GYROSCOPE & RETICLE WIDGET */}
        <div className="pointer-events-auto glass-panel p-3.5 rounded-2xl border border-cyan-500/30 bg-[#060B14]/90 backdrop-blur-md depth-3d-box space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-crimenet-cyan animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">
                3D THREAT RETICLE
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40">
              TARGET LOCK
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* 3D Rotating Concentric Gyroscope */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              {/* Outer Ring */}
              <div 
                className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50"
                style={{ animation: 'radar-sweep 8s linear infinite' }}
              />
              {/* Middle Ring */}
              <div 
                className="absolute inset-2 rounded-full border border-amber-400/50"
                style={{ animation: 'radar-sweep 5s linear infinite reverse' }}
              />
              {/* Inner Core */}
              <div className="w-6 h-6 rounded-full bg-red-500/30 border border-red-400 flex items-center justify-center animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_#FF1744]" />
              </div>
            </div>

            {/* Telemetry Readouts */}
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between gap-3 text-white/80">
                <span className="text-crimenet-muted">THREAT LEVEL:</span>
                <span className="text-red-400 font-bold">94.7 (CRITICAL)</span>
              </div>
              <div className="flex justify-between gap-3 text-white/80">
                <span className="text-crimenet-muted">PRIMARY TARGET:</span>
                <span className="text-cyan-300 font-bold">P-017 (KINGPIN)</span>
              </div>
              <div className="flex justify-between gap-3 text-white/80">
                <span className="text-crimenet-muted">COORDINATES:</span>
                <span className="text-emerald-400 font-bold">19.076° N, 72.877° E</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operation Metrics Glass Panel */}
        <GlassPanel title="OPERATION METRICS" className="pointer-events-auto depth-3d-box">
          <div className="space-y-3">
            
            {/* Case Header */}
            <div>
              <div className="text-xs font-bold text-white tracking-wide">
                {caseData?.name || 'GLOBAL FUGITIVE NETWORK ANALYSIS'}
              </div>
              <div className="text-[10px] font-mono text-crimenet-cyan mt-0.5">
                CASE: {caseData?.id || 'CBI-INTERPOL-RED-379'}
              </div>
            </div>

            {/* Core Stats Grid - Interactive 3D Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  selectEntity('P-017');
                  dispatchAction('FOCUS_MAP_LOCATION', { city: 'Mumbai', lat: 18.9438, lng: 72.8233, zoom: 13.5 });
                }}
                className="btn-3d p-2 rounded-xl bg-black/50 hover:bg-crimenet-cyan/20 border border-white/10 hover:border-crimenet-cyan/50 text-center cursor-pointer transition-all group"
                title="Filter & focus primary syndicate broker (P-017)"
              >
                <div className="text-[10px] text-crimenet-muted font-mono uppercase group-hover:text-crimenet-cyan transition-colors">Persons</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5 group-hover:scale-110 transition-transform">{caseData?.stats?.persons || 379}</div>
              </button>

              <button
                onClick={() => router.push('/network')}
                className="btn-3d p-2 rounded-xl bg-black/50 hover:bg-crimenet-cyan/20 border border-white/10 hover:border-crimenet-cyan/50 text-center cursor-pointer transition-all group"
                title="Inspect interactive Cytoscape Topology Matrix"
              >
                <div className="text-[10px] text-crimenet-muted font-mono uppercase group-hover:text-crimenet-cyan transition-colors">Edges</div>
                <div className="text-sm font-bold font-mono text-crimenet-cyan mt-0.5 group-hover:scale-110 transition-transform">445</div>
              </button>

              <button
                onClick={() => {
                  dispatchAction('SET_LAYER', { layer: 'cameras', value: true });
                  dispatchAction('SET_LAYER', { layer: 'signals', value: true });
                  dispatchAction('FOCUS_MAP_LOCATION', { city: 'Mumbai', lat: 18.9438, lng: 72.8233, zoom: 14.2 });
                }}
                className="btn-3d-amber p-2 rounded-xl bg-black/50 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/50 text-center cursor-pointer transition-all group"
                title="Activate and zoom into live urban surveillance & signal sensors"
              >
                <div className="text-[10px] text-crimenet-muted font-mono uppercase group-hover:text-crimenet-amber transition-colors">Sensors</div>
                <div className="text-sm font-bold font-mono text-crimenet-amber mt-0.5 group-hover:scale-110 transition-transform">17</div>
              </button>
            </div>

            {/* Top Centrality Ranking */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-2 flex items-center justify-between font-mono">
                <span>Top Network Brokers</span>
                <span className="text-[9px] text-crimenet-cyan">BETWEENNESS</span>
              </div>
              <div className="space-y-1.5">
                {rankings.map((r, idx) => (
                  <button
                    key={r.entity_id}
                    onClick={() => selectEntity(r.entity_id)}
                    className={`btn-3d w-full p-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                      selectedEntityId === r.entity_id 
                        ? 'bg-crimenet-cyan/25 border border-crimenet-cyan/50 text-white shadow-md shadow-cyan-500/20' 
                        : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-crimenet-muted w-3">{idx + 1}.</span>
                      <span className="font-medium truncate font-mono text-[11px]">{r.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-crimenet-cyan shrink-0 ml-2 font-bold">
                      {Math.round(r.betweenness * 1000) / 10}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Provenance Badge - Interactive 3D Button */}
            <button
              onClick={() => router.push('/evidence')}
              className="btn-3d w-full p-2 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 hover:border-emerald-400/60 flex items-center justify-between text-[10px] font-mono text-emerald-400 transition-all cursor-pointer group shadow-sm"
              title="Open verified SHA-256 cryptographically audited Evidence Vault"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
                <span className="font-bold">379 RED NOTICES GROUNDED</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                VAULT →
              </span>
            </button>

          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
