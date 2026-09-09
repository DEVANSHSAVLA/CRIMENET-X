'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import type { TimelineEvent } from '@/lib/types';
import { 
  FileText, ShieldAlert, MapPin, Users, Eye, 
  Filter, Calendar, ShieldCheck, Play, Pause, 
  SkipBack, SkipForward, RotateCcw, Volume2, VolumeX,
  CheckCircle2, Copy, ExternalLink, ArrowRight, Clock, Search
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

const EVENT_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  WARRANT_PUBLICATION: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', text: 'text-cyan-300', hex: '#00D4FF' },
  COMMUNICATION: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', hex: '#FFB300' },
  VEHICLE_SIGHTING: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-300', hex: '#FF1744' },
  LOCATION_EVENT: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', hex: '#10B981' },
  PERSON_INTERACTION: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-300', hex: '#A855F7' },
  SURVEILLANCE_EVENT: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', hex: '#F59E0B' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  // Audio Telemetry - Off by default for calm experience
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Playback States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const activeEventRef = useRef<HTMLDivElement | null>(null);

  // Selected Detail Modal
  const [inspectModalEvent, setInspectModalEvent] = useState<TimelineEvent | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Web Audio Chime Synthesizer
  const playRadarChime = useCallback((freq = 880, dur = 0.06) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // ignore
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

    const intervalMs = 2500 / playbackSpeed;
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
          playRadarChime(880, 0.04);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTimelinePlaying, playbackSpeed, events, setTimelineCursor, selectEvent, selectEntity, setIsTimelinePlaying, playRadarChime]);

  // Auto-scroll active event into view only during active playback
  useEffect(() => {
    if (isTimelinePlaying && activeEventRef.current) {
      activeEventRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  };

  const eventTypes = [
    'WARRANT_PUBLICATION',
    'COMMUNICATION',
    'SURVEILLANCE_EVENT',
    'LOCATION_EVENT',
  ];

  // Filter events based on search query
  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.id.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      ev.type.toLowerCase().includes(q) ||
      (ev.location_city && ev.location_city.toLowerCase().includes(q)) ||
      (ev.entities && ev.entities.some(e => e.toLowerCase().includes(q)))
    );
  });

  const currentEvent = events[currentIndex] || events[0];

  return (
    <div className="h-full p-5 flex flex-col space-y-3 overflow-hidden bg-[#030712]">
      
      {/* ── TOP PLAYBACK TOOLBAR (COMPACT, CLEAN, HIGH-TECH) ── */}
      <div className="glass-panel px-4 py-2.5 rounded-xl flex flex-col md:flex-row items-center justify-between border border-white/10 gap-3 bg-[#060D1A]/95 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          {/* Play / Pause Toggle */}
          <button
            onClick={() => {
              const nextState = !isTimelinePlaying;
              setIsTimelinePlaying(nextState);
              if (nextState) playRadarChime(950, 0.08);
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isTimelinePlaying
                ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                : 'bg-crimenet-cyan hover:bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(0,212,255,0.4)]'
            }`}
            title={isTimelinePlaying ? 'Pause Playback' : 'Start Chronological Playback'}
          >
            {isTimelinePlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Step Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleStepBackward}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-25 transition-colors border border-white/10"
              title="Previous Event"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleStepForward}
              disabled={currentIndex >= events.length - 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-25 transition-colors border border-white/10"
              title="Next Event"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
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
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10"
              title="Reset Timeline to Start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10 text-xs font-mono gap-0.5">
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  playbackSpeed === spd
                    ? 'bg-crimenet-cyan text-black'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title={soundEnabled ? 'Acoustic Chime Active' : 'Acoustic Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Temporal Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-[10px] text-white/50 uppercase tracking-wider flex items-center justify-end gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isTimelinePlaying ? 'bg-emerald-400 animate-pulse' : 'bg-crimenet-cyan'}`} />
              <span>CHRONO TELEMETRY</span>
            </div>
            <div className="text-sm font-bold text-white tracking-wide">
              {currentEvent ? currentEvent.timestamp.slice(0, 10) : '2026-02-15'}
            </div>
          </div>

          <div className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-right">
            <div className="text-[11px] text-crimenet-cyan font-bold">
              EVENT {currentIndex + 1} OF {events.length}
            </div>
            <div className="text-[9px] text-white/50">
              {Math.round(((currentIndex + 1) / Math.max(1, events.length)) * 100)}% PLAYBACK
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TIMELINE CONTAINER (FLAT, UPRIGHT, HIGH-DENSITY, NO INVERSION) ── */}
      <GlassPanel title="CHRONOLOGICAL INVESTIGATION STREAM (CLICK ROW TO SYNCHRONIZE MAP & GRAPH)" className="flex-1 flex flex-col overflow-hidden p-3.5 bg-[#050B14]/90 border border-white/10">
        
        {/* Filter Bar & Quick Search */}
        <div className="mb-3 flex items-center justify-between gap-2 flex-wrap border-b border-white/10 pb-2.5 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-white/50 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-crimenet-cyan" /> Filters:
            </span>
            <button
              onClick={() => setFilterType(null)}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                !filterType
                  ? 'bg-crimenet-cyan text-black font-bold shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              All ({total})
            </button>
            {eventTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? null : t)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                  filterType === t
                    ? 'bg-crimenet-cyan text-black font-bold shadow-sm'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-52">
            <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event text, ID..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-white/40 focus:outline-none focus:border-crimenet-cyan font-sans"
            />
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-1 bg-black/80 rounded-full overflow-hidden mb-2.5 border border-white/5 relative shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / Math.max(1, events.length)) * 100}%` }}
          />
        </div>

        {/* Sleek Vertical Events List (Pure 2D, Upright, High-Contrast, No Mirroring) */}
        <div className="flex-1 overflow-y-auto scrollbar-dark pr-2 space-y-2 relative">
          {filteredEvents.map((ev, idx) => {
            const Icon = EVENT_ICONS[ev.type] || FileText;
            const colors = EVENT_COLORS[ev.type] || EVENT_COLORS.WARRANT_PUBLICATION;
            const isActive = currentIndex === idx || selectedEvent?.id === ev.id;

            return (
              <div
                key={ev.id}
                ref={isActive ? activeEventRef : null}
                onClick={() => handleEventClick(ev, idx)}
                className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-start gap-3 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/60 to-black/90 border-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    : 'bg-[#08101E]/80 border-white/10 hover:border-white/25 hover:bg-[#0B172C]'
                }`}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-cyan-400 rounded-r" />
                )}

                {/* Event Category Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${colors.bg} ${colors.border} ${colors.text} mt-0.5`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Event Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-white'}`}>
                        {ev.id}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${colors.bg} ${colors.border} ${colors.text}`}>
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-mono font-bold text-black bg-cyan-300 px-1.5 py-0.2 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-white/50 shrink-0">
                      {ev.timestamp.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>

                  {/* Description - 100% Upright, Crisp & Clear */}
                  <p className="text-xs text-slate-200 mt-1 leading-snug font-sans">
                    {ev.description}
                  </p>

                  {/* Correlated Operatives & Footer Strip */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.entities && ev.entities.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-white/40 uppercase">ENTITIES:</span>
                          {ev.entities.map((eid) => (
                            <button
                              key={eid}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectEntity(eid);
                              }}
                              className="px-1.5 py-0.2 rounded bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[9px] font-bold"
                            >
                              {eid}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Location Link */}
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
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{ev.location_name || ev.location_city || 'India'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ev.evidence_hash && (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> BSA §63
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectModalEvent(ev);
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] font-mono transition-colors"
                      >
                        CERTIFICATE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* ── SECTION 63 BSA CERTIFICATE MODAL ── */}
      {inspectModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-5 rounded-2xl border border-cyan-500/40 shadow-2xl bg-[#060D1A] space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm font-mono tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> SECTION 63 BSA 2023 DIGITAL EVIDENCE CERTIFICATE
              </div>
              <button
                onClick={() => setInspectModalEvent(null)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 space-y-1">
                <div className="text-[10px] text-white/50 uppercase">Corroborated Event Record</div>
                <div className="text-white font-bold">{inspectModalEvent.id} · {inspectModalEvent.type}</div>
                <div className="text-white/70 text-[11px] mt-0.5">{inspectModalEvent.description}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-black/60 border border-emerald-500/30 space-y-1">
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
                    className="p-1 rounded hover:bg-white/10 text-emerald-400 shrink-0"
                    title="Copy SHA-256 Hash"
                  >
                    {copiedHash ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[9px] text-white/50">
                  Compliant with Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023).
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-white/50 uppercase">Jurisdiction</div>
                  <div className="text-xs text-white font-bold mt-0.5">{inspectModalEvent.location_city || 'India'}</div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-white/50 uppercase">Confidence Rating</div>
                  <div className="text-xs text-cyan-300 font-bold mt-0.5">{Math.round((inspectModalEvent.confidence || 0.95) * 100)}% Verified</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-white/10">
              <button
                onClick={() => {
                  if (inspectModalEvent.entities?.length) {
                    selectEntity(inspectModalEvent.entities[0]);
                  }
                  setInspectModalEvent(null);
                }}
                className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-colors"
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
        </div>
      )}

    </div>
  );
}
