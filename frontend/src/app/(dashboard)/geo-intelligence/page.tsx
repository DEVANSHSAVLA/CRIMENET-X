'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { useInvestigation } from '@/context/investigation-context';
import { 
  Compass, Video, Radio, Layers, MapPin, Activity, 
  Flame, Building2, Navigation, Target, Zap, Globe,
  ShieldAlert, Plane, User, ArrowRight, ExternalLink, Filter, ChevronRight,
  Eye, Monitor, RotateCcw, Crosshair
} from 'lucide-react';
import { 
  GLOBAL_HOTSPOTS, 
  TRANSNATIONAL_FLIGHT_ARCS, 
  type GlobalHotspot, 
  type FlightArc 
} from '@/lib/global-hotspots';
import { api } from '@/lib/api';
import type { Person } from '@/lib/types';
import { SuspectPhoto } from '@/components/shared/suspect-photo';
import { TiltCard3D } from '@/components/shared/tilt-card-3d';

const Map = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

const CITIES = [
  { name: 'Mumbai', lng: 72.8777, lat: 19.0760, zoom: 11.5, region: 'Maharashtra' },
  { name: 'Delhi', lng: 77.2090, lat: 28.6139, zoom: 11.5, region: 'NCR' },
  { name: 'Pune', lng: 73.8567, lat: 18.5204, zoom: 12.0, region: 'Maharashtra' },
  { name: 'Gujarat', lng: 72.5714, lat: 23.0225, zoom: 11.5, region: 'West' },
  { name: 'Punjab', lng: 75.3412, lat: 31.1471, zoom: 10.5, region: 'North' },
  { name: 'Manipur', lng: 93.9063, lat: 24.8170, zoom: 11.0, region: 'Northeast' },
  { name: 'Bengaluru', lng: 77.5946, lat: 12.9716, zoom: 12.0, region: 'South' },
  { name: 'Kolkata', lng: 88.3639, lat: 22.5726, zoom: 12.0, region: 'East' },
];

const MUMBAI_STREETS = [
  { id: 'CAM-MUM-001', name: 'Marine Drive Promenade', lng: 72.8234, lat: 18.9438, desc: 'South Coastal Corridor' },
  { id: 'CAM-MUM-002', name: 'Worli Sea Face North', lng: 72.8153, lat: 19.0176, desc: 'Bandra-Worli Connector' },
  { id: 'CAM-MUM-003', name: 'CST Central Junction', lng: 72.8354, lat: 18.9401, desc: 'High Transit Terminal' },
  { id: 'CAM-MUM-004', name: 'Andheri Link Road', lng: 72.8296, lat: 19.1364, desc: 'North Commercial Hub' },
];

const CAMERA_ANGLES = [
  { label: 'Tactical 3D 60°', pitch: 60, bearing: -20, icon: '📐' },
  { label: 'Isometric 45°', pitch: 45, bearing: 45, icon: '🏛️' },
  { label: 'Street Horizon 75°', pitch: 75, bearing: -10, icon: '🌆' },
  { label: 'Top-Down 0°', pitch: 0, bearing: 0, icon: '🗺️' },
];

export default function GeoIntelligencePage() {
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
    setLayer,
  } = useInvestigation();

  const [activeTab, setActiveTab] = useState<'SANCTUARIES' | 'CORRIDORS' | 'SENSORS'>('SANCTUARIES');
  const [selectedHotspot, setSelectedHotspot] = useState<GlobalHotspot | null>(GLOBAL_HOTSPOTS[0]);
  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [activeCity, setActiveCity] = useState('Mumbai');
  const [activeAngle, setActiveAngle] = useState('Tactical 3D 60°');
  const [activeStreet, setActiveStreet] = useState<string | null>(null);
  const [isAutoOrbit, setIsAutoOrbit] = useState(false);

  // Load all 379 real fugitives for global sanctuary drilldown
  useEffect(() => {
    const loadFugitives = async () => {
      try {
        const res = await api.getEntities();
        setAllPersons(res.entities || []);
      } catch (e) {
        console.warn('Fugitives loading fallback');
      }
    };
    loadFugitives();
  }, []);

  // Filter persons associated with the selected hotspot
  const hotspotPersons = useMemo(() => {
    if (!selectedHotspot || allPersons.length === 0) return [];
    const ids = new Set(selectedHotspot.linkedFugitiveIds);

    return allPersons.filter(p => {
      if (ids.has(p.id)) return true;
      const city = (p.primary_city || '').toLowerCase();
      const loc = (p.primary_location_name || '').toLowerCase();
      const pob = (p.place_of_birth || '').toLowerCase();
      
      if (selectedHotspot.countryCode === 'AE' && (city.includes('dubai') || pob.includes('dubai') || loc.includes('dubai'))) return true;
      if (selectedHotspot.countryCode === 'PK' && (city.includes('pk') || loc.includes('pk') || pob.includes('pakistan'))) return true;
      if (selectedHotspot.countryCode === 'NP' && (city.includes('np') || loc.includes('np') || pob.includes('nepal'))) return true;
      if (selectedHotspot.countryCode === 'RO' && (city.includes('ro') || loc.includes('ro') || pob.includes('romania'))) return true;
      if (selectedHotspot.name.includes('Punjab') && (city.includes('punjab') || loc.includes('punjab'))) return true;
      if (selectedHotspot.name.includes('Manipur') && (city.includes('manipur') || loc.includes('manipur'))) return true;
      if (selectedHotspot.name.includes('Mumbai') && (city.includes('mumbai') || loc.includes('mumbai'))) return true;
      if (selectedHotspot.name.includes('Delhi') && (city.includes('delhi') || loc.includes('delhi'))) return true;
      if (selectedHotspot.name.includes('Gujarat') && (city.includes('gujarat') || loc.includes('gujarat'))) return true;
      if (selectedHotspot.name.includes('Jammu') && (city.includes('jammu') || loc.includes('jammu'))) return true;

      return false;
    }).slice(0, 15);
  }, [selectedHotspot, allPersons]);

  // 3D Auto-Orbit Loop
  useEffect(() => {
    if (!isAutoOrbit) return;
    let bearing = -20;
    const interval = setInterval(() => {
      bearing = (bearing + 1.2) % 360;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('map-set-camera-angle', {
            detail: { pitch: 62, bearing },
          })
        );
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  const handleSelectHotspot = (hotspot: GlobalHotspot) => {
    setSelectedHotspot(hotspot);
    selectHotspot(hotspot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('map-fly-to', {
          detail: {
            center: [hotspot.lng, hotspot.lat],
            zoom: hotspot.countryCode === 'IN' ? 10.5 : 5.8,
            pitch: 52,
            bearing: -10,
          },
        })
      );
    }
  };

  const flyToCity = (city: typeof CITIES[0]) => {
    setActiveCity(city.name);
    setActiveStreet(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('map-fly-to', {
          detail: {
            center: [city.lng, city.lat],
            zoom: city.zoom,
            pitch: 58,
            bearing: -15,
          },
        })
      );
    }
  };

  const flyToStreet = (street: typeof MUMBAI_STREETS[0]) => {
    setActiveStreet(street.name);
    setLayer('cameras', true);
    setLayer('signals', true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('map-fly-to', {
          detail: {
            center: [street.lng, street.lat],
            zoom: 15.4,
            pitch: 65,
            bearing: -20,
          },
        })
      );
    }
  };

  const changeCameraAngle = (angle: typeof CAMERA_ANGLES[0]) => {
    setActiveAngle(angle.label);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('map-set-camera-angle', {
          detail: {
            pitch: angle.pitch,
            bearing: angle.bearing,
          },
        })
      );
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030406] select-none">
      {/* Dynamic 3D Map Container */}
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        onSelectEvent={selectEvent}
        onSelectHotspot={handleSelectHotspot}
        onSelectCorridor={selectCorridor}
        layerVisibility={layers}
        initialViewMode="GLOBAL"
      />

      {/* Floating 3D Auto-Orbit HUD Switch */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={() => setIsAutoOrbit(!isAutoOrbit)}
          className={`btn-3d px-3 py-2 rounded-2xl border text-xs font-mono font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all ${
            isAutoOrbit
              ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_rgba(0,212,255,0.6)]'
              : 'bg-black/85 text-white/90 border-white/15 hover:bg-white/10'
          }`}
        >
          <Compass className={`w-4 h-4 ${isAutoOrbit ? 'animate-spin' : ''}`} />
          <span>{isAutoOrbit ? '🛸 3D ORBIT ACTIVE' : '🛸 3D CINEMATIC ORBIT'}</span>
        </button>
      </div>

      {/* 3D Geospatial Command Deck (Right Docked Panel) */}
      <div className="absolute right-4 top-4 bottom-4 w-[430px] flex flex-col gap-3 pointer-events-none z-10">
        <GlassPanel 
          title="3D GEOSPATIAL COMMAND DECK" 
          className="pointer-events-auto h-full flex flex-col overflow-hidden bg-[#060B14]/95 border-crimenet-cyan/30 depth-3d-box shadow-2xl"
        >
          {/* Top Sub-Nav Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-black/60 rounded-2xl border border-white/10 mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('SANCTUARIES')}
              className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 btn-3d ${
                activeTab === 'SANCTUARIES'
                  ? 'bg-crimenet-cyan text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>SANCTUARIES</span>
            </button>
            <button
              onClick={() => setActiveTab('CORRIDORS')}
              className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 btn-3d ${
                activeTab === 'CORRIDORS'
                  ? 'bg-crimenet-amber text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>FLIGHT ARCS</span>
            </button>
            <button
              onClick={() => setActiveTab('SENSORS')}
              className={`flex-1 py-2 rounded-xl font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 btn-3d ${
                activeTab === 'SENSORS'
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>3D SENSORS</span>
            </button>
          </div>

          {/* Tab 1: Global Sanctuaries & Extradition Explorer */}
          {activeTab === 'SANCTUARIES' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-3.5 pr-1 text-xs">
              
              {/* Selected Hotspot Intelligence 3D Card */}
              {selectedHotspot && (
                <TiltCard3D
                  glowColor="cyan"
                  className="p-3.5 rounded-2xl bg-black/75 border border-crimenet-cyan/40 shadow-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedHotspot.flag}</span>
                      <div>
                        <div className="font-bold text-white text-xs tracking-wide">{selectedHotspot.name}</div>
                        <div className="text-[10px] font-mono text-crimenet-muted">{selectedHotspot.country}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 font-mono text-[10px] font-bold text-rose-300">
                      {selectedHotspot.fugitiveCount} RED NOTICES
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="text-[10px] font-mono text-crimenet-cyan font-bold flex items-center gap-1.5">
                      <span>⚖️ STATUS:</span>
                      <span>{selectedHotspot.extraditionStatus}</span>
                    </div>
                    <div className="text-white/80 text-[10px] leading-relaxed">
                      {selectedHotspot.investigativeRationale}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-crimenet-amber truncate max-w-[220px]">
                      OFFENSES: {selectedHotspot.topOffenses.slice(0, 2).join(', ')}
                    </span>
                    <button
                      onClick={() => handleSelectHotspot(selectedHotspot)}
                      className="btn-3d px-3 py-1.5 rounded-xl bg-crimenet-cyan/20 border border-crimenet-cyan/50 text-crimenet-cyan font-mono text-[9px] font-bold hover:bg-crimenet-cyan/35 flex items-center gap-1 shadow-sm"
                    >
                      <span>FLY 3D</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </TiltCard3D>
              )}

              {/* Connected CBI-Interpol Fugitives List */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Interpol Red Notice Subjects ({hotspotPersons.length})
                  </span>
                  <span className="text-[9px] text-white/50 font-normal">BSA 2023 SEC 63</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-dark">
                  {hotspotPersons.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectEntity(p.id)}
                      className={`btn-3d p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedEntityId === p.id
                          ? 'bg-crimenet-cyan/25 border-crimenet-cyan text-white shadow-md'
                          : 'bg-black/50 border border-white/5 text-white/80 hover:bg-white/10 hover:border-crimenet-cyan/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                          <SuspectPhoto 
                            entityId={p.id}
                            displayName={p.display_name || p.name}
                            riskLevel={p.risk_level}
                            size="sm" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate text-white flex items-center gap-1.5">
                            <span className="text-crimenet-cyan font-mono text-[10px]">{p.id}</span>
                            <span className="truncate">{p.display_name || p.name}</span>
                          </div>
                          <div className="text-[9px] font-mono text-crimenet-muted truncate">
                            NOTICE: {p.notice_id || 'PENDING'} · {p.primary_city}
                          </div>
                        </div>
                      </div>

                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                        p.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {p.risk_level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All World Spotted Hubs Grid */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-crimenet-cyan" /> World Sanctuary Nodes
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {GLOBAL_HOTSPOTS.map((spot) => (
                    <button
                      key={spot.id}
                      onClick={() => handleSelectHotspot(spot)}
                      className={`btn-3d p-2 rounded-xl text-left transition-all flex items-center justify-between ${
                        selectedHotspot?.id === spot.id
                          ? 'bg-crimenet-cyan/25 border-crimenet-cyan text-white shadow-[0_0_12px_rgba(0,212,255,0.35)]'
                          : 'bg-black/50 border border-white/5 text-white/80 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className="text-sm shrink-0">{spot.flag}</span>
                        <span className="truncate text-[10px] font-mono font-bold">{spot.name.split(' ')[0]}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold shrink-0 text-crimenet-cyan">
                        {spot.fugitiveCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Transnational 3D Flight & Smuggling Arcs */}
          {activeTab === 'CORRIDORS' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-3 pr-1 text-xs">
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-[11px] text-white/80 leading-relaxed">
                <span className="text-crimenet-cyan font-bold font-mono block mb-1">TRANSNATIONAL 3D FLIGHT ARCS (10 ACTIVE)</span>
                Rendered as great-circle flight trajectories connecting safe haven airports to Indian syndicates.
              </div>

              <div className="space-y-2.5">
                {TRANSNATIONAL_FLIGHT_ARCS.map((arc) => (
                  <TiltCard3D
                    key={arc.id}
                    glowColor={arc.density === 'CRITICAL' ? 'crimson' : 'amber'}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('map-fly-to', {
                            detail: {
                              center: arc.sourceCoords,
                              zoom: 4.8,
                              pitch: 50,
                              bearing: 0,
                            },
                          })
                        );
                      }
                    }}
                    className="p-3 rounded-2xl bg-black/60 border border-white/10 hover:border-crimenet-cyan/50 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span className="text-crimenet-cyan">{arc.sourceName}</span>
                        <span className="text-white/40">➔</span>
                        <span className="text-amber-400">{arc.targetName}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-mono font-bold ${
                        arc.density === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-crimenet-cyan/20 text-crimenet-cyan border border-cyan-500/40'
                      }`}>
                        {arc.density}
                      </span>
                    </div>

                    <p className="text-[10px] text-white/70 leading-normal">
                      {arc.description}
                    </p>

                    <div className="text-[9px] font-mono text-crimenet-muted flex items-center justify-between pt-1.5 border-t border-white/10">
                      <span>CONDUIT: {arc.corridorType.replace(/_/g, ' ')}</span>
                      <span className="text-crimenet-cyan group-hover:underline">INSPECT 3D ➔</span>
                    </div>
                  </TiltCard3D>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Urban Sensors & 3D Optical CCTV Deck */}
          {activeTab === 'SENSORS' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-4 pr-1 text-xs">
              
              {/* 3D Camera Angles */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-crimenet-cyan" /> 3D Camera Angles
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CAMERA_ANGLES.map((angle) => (
                    <button
                      key={angle.label}
                      onClick={() => changeCameraAngle(angle)}
                      className={`btn-3d p-2 rounded-xl text-left text-[11px] font-mono transition-all flex items-center gap-2 ${
                        activeAngle === angle.label
                          ? 'bg-crimenet-cyan/25 border-crimenet-cyan text-white shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                          : 'bg-black/50 border-white/10 text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{angle.icon}</span>
                      <span className="truncate">{angle.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Regional Metros Navigation */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Regional Hub Jump
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                  {CITIES.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => flyToCity(c)}
                      className={`btn-3d py-1.5 rounded-lg text-center transition-all ${
                        activeCity === c.name
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-sm'
                          : 'bg-black/50 border border-white/5 text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D CCTV Optical Surveillance Monitor Deck */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-amber-400" />
                    3D CCTV Surveillance Feeds
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[8px] font-bold">
                    LIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {MUMBAI_STREETS.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => flyToStreet(st)}
                      className={`btn-3d p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                        activeStreet === st.name
                          ? 'bg-amber-500/20 border-amber-400/60 shadow-lg text-white'
                          : 'bg-black/50 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs group-hover:text-amber-300 transition-colors flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          {st.name}
                        </div>
                        <div className="text-[9px] font-mono text-crimenet-muted mt-0.5">{st.desc}</div>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-1 rounded bg-black/60 border border-white/10 text-crimenet-cyan font-bold">
                        ZOOM 3D
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </GlassPanel>
      </div>
    </div>
  );
}
