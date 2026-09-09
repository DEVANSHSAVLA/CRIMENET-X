'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  Users, MapPin, Video, Radio, Activity, Shield, AlertTriangle, 
  Layers, Clock, Filter, Eye, ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { CaseSummary, CentralityRanking, Camera, TrafficSignal, Location } from '@/lib/types';

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
    layers,
    toggleLayer,
    timeYear,
    setTimeYear,
    riskFilter,
    setRiskFilter,
  } = useInvestigation();

  const [caseData, setCaseData] = useState<CaseSummary | null>(null);
  const [rankings, setRankings] = useState<CentralityRanking[]>([]);

  // Load Case & Centrality Rankings
  useEffect(() => {
    const init = async () => {
      try {
        const [caseRes, centRes] = await Promise.all([
          api.getCase('CBI-INTERPOL-RED-379'),
          api.getCentrality(),
        ]);
        setCaseData(caseRes);
        setRankings((centRes.rankings || []).slice(0, 5));
      } catch (err) {
        console.warn('Initial data fetch fallback');
      }
    };
    init();
  }, []);

  const stats = caseData?.stats;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 3D Geospatial Map Layer */}
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        layerVisibility={layers}
      />

      {/* Left Control Panel: Urban Layers & Filters */}
      <div className="absolute left-4 top-4 bottom-4 w-72 flex flex-col gap-3 pointer-events-none z-20">
        
        {/* Layer Visibility Toggles */}
        <GlassPanel title="URBAN INTELLIGENCE LAYERS" className="pointer-events-auto">
          <div className="space-y-4">
            
            {/* Infrastructure Layers */}
            <div>
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-crimenet-cyan" /> Geospatial & Sensor Toggles
              </div>
              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'locations', label: 'Regional Locations (38)', icon: MapPin, color: 'text-crimenet-cyan' },
                  { key: 'cameras', label: 'Urban Cameras (8 Active)', icon: Video, color: 'text-crimenet-amber' },
                  { key: 'signals', label: 'Traffic Signals (9 Intersections)', icon: Radio, color: 'text-emerald-400' },
                  { key: 'traffic', label: 'Traffic Flow Corridors', icon: Activity, color: 'text-crimenet-blue' },
                  { key: 'trajectories', label: 'Suspect Trajectories', icon: Clock, color: 'text-white' },
                ].map(({ key, label, icon: Icon, color }) => (
                  <label key={key} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-white/90 font-medium">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={layers[key as keyof typeof layers]}
                      onChange={() => toggleLayer(key)}
                      className="accent-crimenet-cyan rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Environmental & Heatmap Toggles */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-2">
                Cartographic Enhancements
              </div>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                  <span className="text-white/80">3D Building Footprints</span>
                  <input
                    type="checkbox"
                    checked={layers.buildings}
                    onChange={() => toggleLayer('buildings')}
                    className="accent-crimenet-cyan rounded"
                  />
                </label>
                <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                  <span className="text-white/80">Event Density Heatmap</span>
                  <input
                    type="checkbox"
                    checked={layers.heatmap}
                    onChange={() => toggleLayer('heatmap')}
                    className="accent-crimenet-cyan rounded"
                  />
                </label>
              </div>
            </div>

            {/* Timeline Filter */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest flex items-center gap-1">
                  <Clock className="w-3 h-3 text-crimenet-cyan" /> Timeline Scrubber
                </span>
                <span className="text-xs font-mono font-bold text-crimenet-cyan">{timeYear}</span>
              </div>
              <input
                type="range"
                min="2021"
                max="2026"
                step="1"
                value={timeYear}
                onChange={(e) => setTimeYear(parseInt(e.target.value))}
                className="w-full accent-crimenet-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-crimenet-muted mt-1">
                <span>2021</span>
                <span>2024</span>
                <span>2026</span>
              </div>
            </div>

            {/* Warrant Risk Filter */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1">
                <Filter className="w-3 h-3 text-crimenet-amber" /> Notice Risk Filter
              </div>
              <div className="flex gap-1.5">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => {
                  const isSelected = (!riskFilter && lvl === 'ALL') || riskFilter === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => setRiskFilter(lvl === 'ALL' ? null : lvl)}
                      className={`flex-1 py-1 text-[10px] font-bold rounded tracking-wider transition-all ${
                        isSelected
                          ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40'
                          : 'bg-white/5 text-crimenet-muted hover:bg-white/10'
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

      {/* Right Intelligence Summary Panel */}
      <div className="absolute right-4 top-4 w-80 flex flex-col gap-3 pointer-events-none z-20">
        <GlassPanel title="OPERATION METRICS" className="pointer-events-auto">
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

            {/* Core Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                <div className="text-[10px] text-crimenet-muted font-mono uppercase">Persons</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">{stats?.persons || 379}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                <div className="text-[10px] text-crimenet-muted font-mono uppercase">Edges</div>
                <div className="text-sm font-bold font-mono text-crimenet-cyan mt-0.5">{stats?.relationships || 528}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/5 text-center">
                <div className="text-[10px] text-crimenet-muted font-mono uppercase">Sensors</div>
                <div className="text-sm font-bold font-mono text-crimenet-amber mt-0.5">17</div>
              </div>
            </div>

            {/* Top Centrality Ranking */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-widest mb-2 flex items-center justify-between">
                <span>Top Network Brokers</span>
                <span className="text-[9px] font-mono text-crimenet-cyan">BETWEENNESS</span>
              </div>
              <div className="space-y-1.5">
                {rankings.map((r, idx) => (
                  <button
                    key={r.entity_id}
                    onClick={() => selectEntity(r.entity_id)}
                    className={`w-full p-1.5 rounded flex items-center justify-between text-xs transition-colors ${
                      selectedEntityId === r.entity_id 
                        ? 'bg-crimenet-cyan/20 border border-crimenet-cyan/40 text-white' 
                        : 'bg-white/5 hover:bg-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-crimenet-muted w-3">{idx + 1}.</span>
                      <span className="font-medium truncate">{r.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-crimenet-cyan shrink-0 ml-2">
                      {Math.round(r.betweenness * 1000) / 10}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Provenance Badge */}
            <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>379 VERIFIED RED NOTICES</span>
              </div>
              <span className="text-[9px] text-emerald-500/80 font-bold">SHA-256</span>
            </div>

          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
