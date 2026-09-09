'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { useInvestigation } from '@/context/investigation-context';
import { 
  Compass, Video, Radio, Layers, MapPin, Activity, 
  Flame, Building2, Navigation, Target, Zap, Globe,
  ShieldAlert, Plane, User, ArrowRight, ExternalLink, Filter, ChevronRight
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
    const countryName = selectedHotspot.country.toLowerCase();
    const hubName = selectedHotspot.name.toLowerCase();

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

  const handleSelectHotspot = (hotspot: GlobalHotspot) => {
    setSelectedHotspot(hotspot);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('map-fly-to', {
          detail: {
            center: [hotspot.lng, hotspot.lat],
            zoom: hotspot.countryCode === 'IN' ? 10.5 : 5.8,
            pitch: 50,
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
            pitch: 55,
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
            zoom: 15.2,
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
    <div className="relative w-full h-full overflow-hidden bg-[#030406]">
      {/* Dynamic 3D Map Container with Global Spotted Capabilities */}
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        onSelectHotspot={handleSelectHotspot}
        layerVisibility={layers}
        initialViewMode="GLOBAL"
      />

      {/* 3D Geospatial Command Deck (Right Docked Panel) */}
      <div className="absolute right-4 top-4 bottom-4 w-[420px] flex flex-col gap-3 pointer-events-none z-10">
        <GlassPanel 
          title="GLOBAL & URBAN COMMAND DECK" 
          className="pointer-events-auto h-full flex flex-col overflow-hidden bg-[#060B14]/95 border-crimenet-cyan/30 shadow-2xl"
        >
          {/* Top Sub-Nav Tabs */}
          <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-white/10 mb-3 shrink-0">
            <button
              onClick={() => setActiveTab('SANCTUARIES')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SANCTUARIES'
                  ? 'bg-crimenet-cyan text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>SANCTUARY HUBS</span>
            </button>
            <button
              onClick={() => setActiveTab('CORRIDORS')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'CORRIDORS'
                  ? 'bg-crimenet-amber text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plane className="w-3 h-3" />
              <span>FLIGHT ARCS</span>
            </button>
            <button
              onClick={() => setActiveTab('SENSORS')}
              className={`flex-1 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'SENSORS'
                  ? 'bg-emerald-400 text-black shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>URBAN SENSORS</span>
            </button>
          </div>

          {/* Tab 1: Global Sanctuaries & Extradition Explorer */}
          {activeTab === 'SANCTUARIES' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-3.5 pr-1 text-xs">
              
              {/* Selected Hotspot Intelligence Brief */}
              {selectedHotspot && (
                <div className="card-3d p-3 rounded-xl bg-black/70 border border-crimenet-cyan/40 shadow-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedHotspot.flag}</span>
                      <div>
                        <div className="font-bold text-white text-xs">{selectedHotspot.name}</div>
                        <div className="text-[10px] font-mono text-crimenet-muted">{selectedHotspot.country}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-mono text-[10px] font-bold text-rose-300">
                      {selectedHotspot.fugitiveCount} RED NOTICES
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-[10px] font-mono text-crimenet-cyan font-bold">
                      ⚖️ {selectedHotspot.extraditionStatus}
                    </div>
                    <div className="text-white/80 text-[10px] leading-relaxed">
                      {selectedHotspot.investigativeRationale}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-mono text-crimenet-amber">
                      TOP OFFENSES: {selectedHotspot.topOffenses.slice(0, 2).join(', ')}
                    </span>
                    <button
                      onClick={() => handleSelectHotspot(selectedHotspot)}
                      className="btn-3d px-2.5 py-1 rounded bg-crimenet-cyan/20 border border-crimenet-cyan/50 text-crimenet-cyan font-mono text-[9px] font-bold hover:bg-crimenet-cyan/35 flex items-center gap-1"
                    >
                      <span>FLY 3D</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Connected CBI-Interpol Fugitives List */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    Interpol Red Notice Subjects ({hotspotPersons.length})
                  </span>
                  <span className="text-[9px] text-white/50 font-normal">BSA 2023 SEC 63</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-dark">
                  {hotspotPersons.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => selectEntity(p.id)}
                      className={`chip-3d p-2 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        selectedEntityId === p.id
                          ? 'bg-crimenet-cyan/25 border-crimenet-cyan text-white shadow-md'
                          : 'bg-black/50 border border-white/5 text-white/80 hover:bg-white/10 hover:border-crimenet-cyan/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-white/10">
                          <SuspectPhoto 
                            entityId={p.id}
                            displayName={p.display_name || p.name}
                            noticeId={p.notice_id}
                            gender={p.gender}
                            riskLevel={p.risk_level}
                            photoUrl={p.photo_thumbnail_url || p.photo_url}
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

                  {hotspotPersons.length === 0 && (
                    <div className="p-3 text-center text-[10px] font-mono text-crimenet-muted bg-black/30 rounded-xl">
                      Select a sanctuary hub to list wanted persons
                    </div>
                  )}
                </div>
              </div>

              {/* All World Spotted Hubs Grid */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-crimenet-cyan" /> World Sanctuary & Interstate Nodes
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

          {/* Tab 2: Transnational Flight & Smuggling Arcs */}
          {activeTab === 'CORRIDORS' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-3 pr-1 text-xs">
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 text-[11px] text-white/80 leading-relaxed">
                <span className="text-crimenet-cyan font-bold font-mono block mb-1">TRANSNATIONAL ARCS (10 ACTIVE)</span>
                Rendered as great-circle flight paths connecting overseas safe havens to Indian syndicate landing points.
              </div>

              <div className="space-y-2">
                {TRANSNATIONAL_FLIGHT_ARCS.map((arc) => (
                  <div
                    key={arc.id}
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('map-fly-to', {
                            detail: {
                              center: arc.sourceCoords,
                              zoom: 4.5,
                              pitch: 45,
                              bearing: 0,
                            },
                          })
                        );
                      }
                    }}
                    className="card-3d p-2.5 rounded-xl bg-black/50 border border-white/5 hover:border-crimenet-cyan/40 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[11px] font-bold text-white flex items-center gap-1.5">
                        <span className="text-crimenet-cyan">{arc.sourceName}</span>
                        <span className="text-white/40">➔</span>
                        <span className="text-amber-400">{arc.targetName}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                        arc.density === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-crimenet-cyan/20 text-crimenet-cyan'
                      }`}>
                        {arc.density}
                      </span>
                    </div>

                    <p className="text-[10px] text-white/70 leading-normal">
                      {arc.description}
                    </p>

                    <div className="text-[9px] font-mono text-crimenet-muted flex items-center justify-between pt-1 border-t border-white/5">
                      <span>TYPE: {arc.corridorType.replace(/_/g, ' ')}</span>
                      <span className="text-crimenet-cyan group-hover:underline">FOCUS MAP ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Urban Sensors & Controls */}
          {activeTab === 'SENSORS' && (
            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-4 pr-1 text-xs">
              
              {/* 3D Camera Angles */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-crimenet-cyan" /> 3D Camera Angle Presets
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CAMERA_ANGLES.map((angle) => (
                    <button
                      key={angle.label}
                      onClick={() => changeCameraAngle(angle)}
                      className={`btn-3d p-2 rounded-lg text-left text-[11px] font-mono transition-all flex items-center gap-2 ${
                        activeAngle === angle.label
                          ? 'bg-crimenet-cyan/20 border-crimenet-cyan text-white shadow-[0_0_12px_rgba(0,212,255,0.35)]'
                          : 'bg-black/50 border-white/10 text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{angle.icon}</span>
                      <span className="truncate">{angle.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4 Live Mumbai CCTV Streets */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3 h-3 text-crimenet-cyan" /> Live Mumbai Surveillance Streets
                </div>
                <div className="space-y-1.5">
                  {MUMBAI_STREETS.map((st) => (
                    <button
                      key={st.name}
                      onClick={() => flyToStreet(st)}
                      className={`btn-3d w-full p-2 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                        activeStreet === st.name
                          ? 'bg-crimenet-cyan/25 border-crimenet-cyan text-white shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                          : 'bg-black/60 border border-white/10 text-white/90 hover:bg-white/10 hover:border-crimenet-cyan/40'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="truncate">{st.name}</span>
                        </div>
                        <div className="text-[10px] text-crimenet-muted truncate mt-0.5">{st.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono text-crimenet-cyan shrink-0 px-1.5 py-0.5 rounded bg-crimenet-cyan/10 border border-crimenet-cyan/20">
                        FLY 3D
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 8 City Quick-Fly Corridors */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-crimenet-amber" /> Indian Intelligence Corridors
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {CITIES.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => flyToCity(city)}
                      className={`chip-3d p-1.5 rounded-lg text-center font-mono text-[10px] transition-all flex flex-col items-center justify-center ${
                        activeCity === city.name
                          ? 'bg-crimenet-amber text-black font-bold shadow-[0_0_14px_rgba(255,179,0,0.45)]'
                          : 'bg-black/60 border border-white/10 text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold truncate w-full">{city.name}</span>
                      <span className="text-[8px] opacity-70 truncate w-full">{city.region}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer Switches */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-emerald-400" /> Geospatial Layer Filters
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'hotspots', label: 'Global Spots', icon: Globe, color: 'text-rose-400', desc: '16 International fugitive sanctuary hubs' },
                    { key: 'arcs', label: 'Flight Arcs', icon: Plane, color: 'text-crimenet-cyan', desc: '10 Transnational flight & smuggling arcs' },
                    { key: 'cameras', label: 'CCTV Sensors', icon: Video, color: 'text-amber-400', desc: '8 Live street surveillance cameras' },
                    { key: 'signals', label: 'Traffic Signals', icon: Radio, color: 'text-crimenet-crimson', desc: '9 Intersection signal controllers' },
                    { key: 'heatmap', label: 'Crime Heatmap', icon: Flame, color: 'text-rose-400', desc: 'Geospatial crime & incident density' },
                    { key: 'buildings', label: '3D Extrusions', icon: Building2, color: 'text-blue-400', desc: '3D Building footprints & heights' },
                    { key: 'trajectories', label: 'Trajectories', icon: Zap, color: 'text-crimenet-cyan', desc: 'Suspect transit corridors' },
                    { key: 'locations', label: 'Location Hubs', icon: MapPin, color: 'text-emerald-400', desc: '38 Regional jurisdiction points' },
                    { key: 'events', label: 'Timeline Events', icon: Activity, color: 'text-purple-400', desc: 'Timeline incident & sighting markers' },
                    { key: 'traffic', label: 'Traffic Density', icon: Target, color: 'text-yellow-400', desc: 'Real-time traffic flow velocity' },
                  ].map(({ key, label, icon: Icon, color, desc }) => {
                    const isActive = layers[key as keyof typeof layers];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleLayer(key)}
                        title={desc}
                        className={`chip-3d p-2 rounded-lg text-left text-[10px] font-mono transition-all flex items-center justify-between ${
                          isActive
                            ? 'bg-white/15 border-white/30 text-white shadow-md'
                            : 'bg-black/40 border-white/5 text-crimenet-muted hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Icon className={`w-3.5 h-3.5 ${color}`} />
                          <span className="truncate">{label}</span>
                        </div>
                        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-white/20'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </GlassPanel>
      </div>
    </div>
  );
}
