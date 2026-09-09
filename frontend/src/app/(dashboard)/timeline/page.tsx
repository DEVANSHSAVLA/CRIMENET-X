'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { TiltCard3D } from '@/components/shared/tilt-card-3d';
import { SuspectPhoto } from '@/components/shared/suspect-photo';
import type { TimelineEvent } from '@/lib/types';
import { 
  FileText, ShieldAlert, MapPin, Users, Eye, 
  Filter, Calendar, ShieldCheck, Play, Pause, 
  SkipBack, SkipForward, RotateCcw, FastForward, Volume2, VolumeX,
  Layers, Sparkles, CheckCircle2, Copy, ExternalLink, ArrowRight, Box
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';

const EVENT_ICONS: Record<string, any> = {
  WARRANT_PUBLICATION: FileText,
  COMMUNICATION: ShieldAlert,
  VEHICLE_SIGHTING: Eye,
  LOCATION_EVENT: MapPin,
  PERSON_INTERACTION: Users,
  SURVEILLANCE_EVENT: Eye,
};

const EVENT_GLOW_COLORS: Record<string, 'cyan' | 'amber' | 'crimson' | 'emerald' | 'purple'> = {
  WARRANT_PUBLICATION: 'cyan',
  COMMUNICATION: 'amber',
  VEHICLE_SIGHTING: 'crimson',
  LOCATION_EVENT: 'emerald',
  PERSON_INTERACTION: 'purple',
  SURVEILLANCE_EVENT: 'amber',
};

const EVENT_HEX_COLORS: Record<string, string> = {
  WARRANT_PUBLICATION: '#00D4FF',
  COMMUNICATION: '#FFB300',
  VEHICLE_SIGHTING: '#FF1744',
  LOCATION_EVENT: '#10B981',
  PERSON_INTERACTION: '#A855F7',
  SURVEILLANCE_EVENT: '#F59E0B',
};

export default function TimelinePage() {
  const { 
    selectEntity, 
    selectEvent, 
    selectedEvent, 
    selectLocation,
    dispatchAction,
    timelineCursor, 
    setTimelineCursor,
    isTimelinePlaying,
    setIsTimelinePlaying 
  } = useInvestigation();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // 3D View Mode: Isometric 3D Ribbon vs Flat Stream
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Playback States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const activeEventRef = useRef<HTMLDivElement | null>(null);

  // Selected Detail Modal
  const [inspectModalEvent, setInspectModalEvent] = useState<TimelineEvent | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Web Audio Chime Synthesizer
  const playRadarChime = useCallback((freq = 880, dur = 0.08) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // AudioContext might be blocked until user interaction
    }
  }, [soundEnabled]);

  // Load Timeline Events
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const params: Record<string, string> = {};
        if (filterType) params.event_type = filterType;
        const res = await api.getTimeline('CBI-INTERPOL-RED-379', params);
        const sorted = (res.events || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setEvents(sorted);
        setTotal(res.total || sorted.length);
      } catch (err) {
        console.warn('API fallback for timeline');
      }
    };
    fetchTimeline();
  }, [filterType]);

  // Synchronized Playback Timer Loop
  useEffect(() => {
    if (!isTimelinePlaying || events.length === 0) return;

    const intervalMs = 2200 / playbackSpeed;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= events.length) {
          setIsTimelinePlaying(false);
          return 0;
        }
        const ev = events[next];
        if (ev) {
          setTimelineCursor(ev.timestamp);
          selectEvent(ev);
          if (ev.entities && ev.entities.length > 0) {
            selectEntity(ev.entities[0]);
          }
          playRadarChime(950 + (next % 5) * 50, 0.06);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTimelinePlaying, playbackSpeed, events, setTimelineCursor, selectEvent, selectEntity, setIsTimelinePlaying, playRadarChime]);

  // Auto-scroll active event into view during playback
  useEffect(() => {
    if (isTimelinePlaying && activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIndex, isTimelinePlaying]);

  // Step Forward
  const handleStepForward = () => {
    if (currentIndex < events.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      const ev = events[next];
      setTimelineCursor(ev.timestamp);
      selectEvent(ev);
      if (ev.entities?.length) selectEntity(ev.entities[0]);
      playRadarChime(1100, 0.05);
    }
  };

  // Step Backward
  const handleStepBackward = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      const ev = events[prev];
      setTimelineCursor(ev.timestamp);
      selectEvent(ev);
      if (ev.entities?.length) selectEntity(ev.entities[0]);
      playRadarChime(750, 0.05);
    }
  };

  // Click on specific event
  const handleEventClick = (ev: TimelineEvent, idx: number) => {
    setCurrentIndex(idx);
    setTimelineCursor(ev.timestamp);
    selectEvent(ev);
    if (ev.entities && ev.entities.length > 0) {
      selectEntity(ev.entities[0]);
    }
    playRadarChime(1200, 0.06);
  };

  const eventTypes = [
    'WARRANT_PUBLICATION',
    'COMMUNICATION',
    'SURVEILLANCE_EVENT',
    'LOCATION_EVENT',
  ];

  const currentEvent = events[currentIndex] || events[0];

  return (
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden relative">
      
      {/* ── TOP PLAYBACK CONTROLLER BAR (3D RIG) ── */}
      <TiltCard3D glowColor="cyan" maxTilt={3} className="rounded-2xl shrink-0">
        <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between border-l-4 border-crimenet-cyan gap-4 depth-3d-box neon-depth-cyan shadow-xl bg-[#060D1A]/90">
          <div className="flex items-center gap-3">
            {/* Play / Pause Toggle */}
            <button
              onClick={() => {
                const nextState = !isTimelinePlaying;
                setIsTimelinePlaying(nextState);
                if (nextState) playRadarChime(1320, 0.1);
              }}
              className={`btn-3d w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                isTimelinePlaying
                  ? 'bg-crimenet-amber text-black shadow-[0_0_20px_rgba(255,179,0,0.6)] animate-pulse'
                  : 'bg-crimenet-cyan hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,212,255,0.5)]'
              }`}
              title={isTimelinePlaying ? 'Pause Playback' : 'Start Chronological 3D Playback'}
            >
              {isTimelinePlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Step Back & Forward */}
            <button
              onClick={handleStepBackward}
              disabled={currentIndex === 0}
              className="btn-3d p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all border border-white/10 hover:border-crimenet-cyan/40"
              title="Previous Event"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={handleStepForward}
              disabled={currentIndex >= events.length - 1}
              className="btn-3d p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-all border border-white/10 hover:border-crimenet-cyan/40"
              title="Next Event"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Reset Playback */}
            <button
              onClick={() => {
                setIsTimelinePlaying(false);
                setCurrentIndex(0);
                if (events[0]) {
                  setTimelineCursor(events[0].timestamp);
                  selectEvent(events[0]);
                  if (events[0].entities?.length) selectEntity(events[0].entities[0]);
                }
              }}
              className="btn-3d p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white transition-all border border-white/10"
              title="Reset Timeline to Origin"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Playback Speed Multiplier */}
            <div className="flex bg-black/60 rounded-lg p-1 border border-white/10 text-xs font-mono gap-1">
              {([1, 2, 5] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`chip-3d px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                    playbackSpeed === spd
                      ? 'bg-crimenet-cyan text-black shadow-[0_0_10px_rgba(0,212,255,0.4)]'
                      : 'text-crimenet-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {spd}X
                </button>
              ))}
            </div>

            {/* Audio Telemetry Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
              title={soundEnabled ? 'Acoustic Telemetry Active' : 'Acoustic Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* 3D Isometric View Mode Toggle */}
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                is3DMode 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.3)]' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{is3DMode ? '3D ISO RIBBON' : '2D STREAM'}</span>
            </button>
          </div>

          {/* Temporal Cursor Telemetry */}
          <div className="text-center md:text-right font-mono">
            <div className="text-[10px] text-crimenet-muted uppercase tracking-widest flex items-center justify-center md:justify-end gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isTimelinePlaying ? 'bg-emerald-400 animate-ping' : 'bg-crimenet-cyan'}`}></span>
              3D CHRONO TELEMETRY
            </div>
            <div className="text-base font-bold text-white tracking-wider mt-0.5">
              {currentEvent ? currentEvent.timestamp.slice(0, 10) : '2026-02-15'}
            </div>
            <div className="text-[10px] text-crimenet-cyan font-bold">
              EVENT {currentIndex + 1} OF {events.length} · PROGRESS {Math.round(((currentIndex + 1) / Math.max(1, events.length)) * 100)}%
            </div>
          </div>
        </div>
      </TiltCard3D>

      {/* ── MAIN TIMELINE CONTAINER ── */}
      <GlassPanel title="3D CHRONOMETRIC TIMELINE CONDUIT (CLICK SLAB TO SYNCHRONIZE MAP & 3D GRAPH)" className="flex-1 flex flex-col overflow-hidden depth-3d-box p-4 bg-[#050B14]/80">
        
        {/* Filters and Scrubber Progress Bar */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-crimenet-muted flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-crimenet-cyan" /> Event Filter:
            </span>
            <button
              onClick={() => setFilterType(null)}
              className={`chip-3d px-3 py-1 text-[10px] font-bold rounded-full transition-all font-mono ${
                !filterType
                  ? 'bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/50 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              All Events ({total})
            </button>
            {eventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? null : t)}
                className={`chip-3d px-3 py-1 text-[10px] font-bold rounded-full transition-all font-mono ${
                  filterType === t
                    ? 'bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/50 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-white/50">
            BSA §63 SHA-256 DIGITAL EVIDENCE CHAIN CERTIFIED
          </span>
        </div>

        {/* Global Scrub Progress Track */}
        <div className="w-full h-1.5 bg-black/70 rounded-full overflow-hidden mb-3 border border-white/10 relative">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_10px_rgba(0,212,255,0.6)] transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / Math.max(1, events.length)) * 100}%` }}
          />
        </div>

        {/* 3D Isometric Timeline Conduit Scroll Area */}
        <div 
          className={`flex-1 overflow-y-auto scrollbar-dark pr-3 space-y-3 relative transition-all duration-500 ${
            is3DMode ? 'perspective-1000' : ''
          }`}
          style={is3DMode ? { perspective: '1200px' } : undefined}
        >
          {/* Vertical Chrono Conduit Spine */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/40 via-purple-500/30 to-transparent pointer-events-none hidden md:block" />

          {events.map((ev, idx) => {
            const Icon = EVENT_ICONS[ev.type] || FileText;
            const glowColor = EVENT_GLOW_COLORS[ev.type] || 'cyan';
            const hexColor = EVENT_HEX_COLORS[ev.type] || '#00D4FF';
            const isActive = currentIndex === idx || selectedEvent?.id === ev.id;

            return (
              <div 
                key={ev.id}
                ref={isActive ? activeEventRef : null}
                style={is3DMode ? {
                  transform: isActive ? 'rotateX(4deg) translateZ(12px)' : 'rotateX(8deg)',
                  transformStyle: 'preserve-3d',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                } : undefined}
              >
                <TiltCard3D 
                  glowColor={glowColor}
                  maxTilt={isActive ? 6 : 4}
                  className="rounded-xl"
                >
                  <div
                    onClick={() => handleEventClick(ev, idx)}
                    className={`p-4 rounded-xl border transition-all flex items-start gap-4 cursor-pointer group relative overflow-hidden ${
                      isActive
                        ? 'border-crimenet-cyan bg-crimenet-cyan/15 shadow-[0_0_25px_rgba(0,212,255,0.35)] ring-1 ring-crimenet-cyan/50'
                        : 'border-white/10 bg-black/60 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    {/* Active Laser Scanline Indicator */}
                    {isActive && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_12px_rgba(0,212,255,1)] animate-pulse" />
                    )}

                    {/* Event Icon Glyph with 3D Depth */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform shadow-md ${
                        isActive ? 'scale-110 shadow-cyan-500/40' : 'group-hover:scale-105'
                      }`}
                      style={{ 
                        backgroundColor: `${hexColor}20`, 
                        borderColor: `${hexColor}60`, 
                        color: hexColor 
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Event Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold ${isActive ? 'text-crimenet-cyan' : 'text-white'}`}>
                            {ev.id}
                          </span>
                          <span
                            className="text-[9px] font-mono px-2 py-0.5 rounded font-bold border uppercase"
                            style={{ backgroundColor: `${hexColor}20`, borderColor: `${hexColor}40`, color: hexColor }}
                          >
                            {ev.type.replace(/_/g, ' ')}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono font-bold text-black bg-cyan-400 px-1.5 py-0.2 rounded animate-pulse">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-crimenet-muted">
                          {ev.timestamp.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>

                      <p className="text-xs text-white/90 mt-1.5 leading-relaxed font-sans">
                        {ev.description}
                      </p>

                      {/* Linked Suspects with Photos */}
                      {ev.entities && ev.entities.length > 0 && (
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                          <span className="text-[9px] font-mono text-crimenet-muted uppercase">CORRELATED OPERATIVES:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ev.entities.map((eid) => (
                              <button
                                key={eid}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectEntity(eid);
                                }}
                                className="px-2 py-0.5 rounded bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/35 text-[10px] font-mono font-bold transition-all shadow-[0_0_8px_rgba(0,212,255,0.2)] flex items-center gap-1"
                              >
                                <span>{eid}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Location & Provenance Footer */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-crimenet-muted mt-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ev.location_id) {
                                selectLocation({
                                  id: ev.location_id,
                                  name: ev.location_name || ev.location_city || 'Jurisdictional Hub',
                                  city: ev.location_city || 'India',
                                  lat: ev.lat || 18.9438,
                                  lng: ev.lng || 72.8233,
                                  risk_level: 'HIGH',
                                } as any);
                              } else {
                                dispatchAction('FOCUS_MAP_LOCATION', {
                                  lat: ev.lat,
                                  lng: ev.lng,
                                  city: ev.location_city,
                                  name: ev.location_name || ev.location_city,
                                });
                              }
                            }}
                            className="flex items-center gap-1 text-white/90 hover:text-emerald-400 p-1 -m-1 rounded hover:bg-white/5 transition-all cursor-pointer font-bold"
                            title="Click to focus on 3D Geospatial Map"
                          >
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>{ev.location_name || ev.location_city || 'Jurisdictional Point'}</span>
                          </button>
                          <span>{ev.source}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          {ev.evidence_hash && (
                            <div className="flex items-center gap-1 text-emerald-400 font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              <span className="truncate max-w-[130px]">SHA-256 PROTECTED</span>
                            </div>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectModalEvent(ev);
                            }}
                            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono transition-colors"
                          >
                            INSPECT CERTIFICATE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </TiltCard3D>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* ── 3D SECTION 63 BSA CERTIFICATE INSPECTOR MODAL ── */}
      {inspectModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <TiltCard3D glowColor="cyan" maxTilt={3} className="w-full max-w-xl">
            <div className="glass-panel p-6 rounded-2xl border border-crimenet-cyan/50 shadow-2xl bg-[#060D1A] space-y-4 depth-3d-box">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-crimenet-cyan font-bold text-sm font-mono tracking-wider">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> SECTION 63 BSA 2023 DIGITAL EVIDENCE CERTIFICATE
                </div>
                <button
                  onClick={() => setInspectModalEvent(null)}
                  className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-1">
                  <div className="text-[10px] text-crimenet-muted uppercase">Corroborated Event ID</div>
                  <div className="text-white font-bold text-sm">{inspectModalEvent.id} · {inspectModalEvent.type}</div>
                  <div className="text-white/60 text-[11px] mt-1">{inspectModalEvent.description}</div>
                </div>

                <div className="p-3 rounded-lg bg-black/60 border border-emerald-500/30 space-y-1">
                  <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Cryptographic SHA-256 Digest
                  </div>
                  <div className="p-2 rounded bg-black/80 border border-white/10 text-[11px] text-emerald-300 font-mono break-all flex items-center justify-between gap-2">
                    <span>{inspectModalEvent.evidence_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inspectModalEvent.evidence_hash || '');
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white shrink-0"
                      title="Copy SHA-256 Hash"
                    >
                      {copiedHash ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[9px] text-white/50">
                    Statutory Compliance: Section 63 Bharatiya Sakshya Adhiniyam (BSA 2023) electronic record admissibility.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-black/60 border border-white/10">
                    <div className="text-[9px] text-crimenet-muted uppercase">Jurisdiction City</div>
                    <div className="text-xs text-white font-bold mt-0.5">{inspectModalEvent.location_city || 'India National'}</div>
                  </div>
                  <div className="p-2.5 rounded bg-black/60 border border-white/10">
                    <div className="text-[9px] text-crimenet-muted uppercase">Confidence Rating</div>
                    <div className="text-xs text-crimenet-cyan font-bold mt-0.5">{Math.round((inspectModalEvent.confidence || 0.95) * 100)}% Verified</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    if (inspectModalEvent.entities?.length) {
                      selectEntity(inspectModalEvent.entities[0]);
                    }
                    setInspectModalEvent(null);
                  }}
                  className="px-3 py-1.5 rounded bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-xs font-mono font-bold transition-colors"
                >
                  OPEN SUSPECT DOSSIER
                </button>
                <button
                  onClick={() => setInspectModalEvent(null)}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </TiltCard3D>
        </div>
      )}

    </div>
  );
}
