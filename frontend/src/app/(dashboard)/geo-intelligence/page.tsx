'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { useInvestigation } from '@/context/investigation-context';
import { 
  Compass, Video, Radio, Layers, MapPin, Activity, 
  Flame, Building2, Navigation, Target, Zap
} from 'lucide-react';

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

  const [activeCity, setActiveCity] = useState('Mumbai');
  const [activeAngle, setActiveAngle] = useState('Tactical 3D 60°');
  const [activeStreet, setActiveStreet] = useState<string | null>(null);

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
      {/* Dynamic 3D Map Container */}
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        layerVisibility={layers}
      />

      {/* 3D Geospatial Command Deck (Right Docked Panel) */}
      <div className="absolute right-4 top-4 bottom-4 w-96 flex flex-col gap-3 pointer-events-none z-10">
        <GlassPanel title="3D GEOSPATIAL COMMAND DECK" className="pointer-events-auto h-full flex flex-col overflow-y-auto scrollbar-dark bg-[#060B14]/95 border-crimenet-cyan/30 shadow-2xl">
          <div className="space-y-4 text-xs pr-1">
            {/* Status Header */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/60 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] font-bold text-white">MAP ENGINE: MAPLIBRE 3D</span>
              </div>
              <span className="font-mono text-[10px] text-crimenet-cyan font-bold">{activeCity.toUpperCase()}</span>
            </div>

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

            {/* Layer Switches */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="text-[10px] font-mono font-bold text-crimenet-muted uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-emerald-400" /> Geospatial Layer Filters
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'cameras', label: 'CCTV Sensors', icon: Video, color: 'text-amber-400' },
                  { key: 'signals', label: 'Traffic Signals', icon: Radio, color: 'text-crimenet-crimson' },
                  { key: 'heatmap', label: 'Crime Heatmap', icon: Flame, color: 'text-rose-400' },
                  { key: 'buildings', label: '3D Extrusions', icon: Building2, color: 'text-blue-400' },
                  { key: 'trajectories', label: 'Trajectories', icon: Zap, color: 'text-crimenet-cyan' },
                  { key: 'locations', label: 'Location Hubs', icon: MapPin, color: 'text-emerald-400' },
                  { key: 'events', label: 'Timeline Incidents', icon: Activity, color: 'text-purple-400' },
                  { key: 'traffic', label: 'Traffic Density', icon: Target, color: 'text-yellow-400' },
                ].map(({ key, label, icon: Icon, color }) => {
                  const isActive = layers[key as keyof typeof layers];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
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
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-white/20'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

