'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import type { TimelineEvent } from '@/lib/types';
import { 
  FileText, ShieldAlert, MapPin, Users, Eye, 
  Filter, Calendar, ShieldCheck, Play, Pause, 
  SkipBack, SkipForward, RotateCcw, FastForward, Volume2
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

const EVENT_COLORS: Record<string, string> = {
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
    timelineCursor, 
    setTimelineCursor,
    isTimelinePlaying,
    setIsTimelinePlaying 
  } = useInvestigation();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Playback States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const activeEventRef = useRef<HTMLDivElement | null>(null);

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

    const intervalMs = 2000 / playbackSpeed;
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
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isTimelinePlaying, playbackSpeed, events, setTimelineCursor, selectEvent, selectEntity, setIsTimelinePlaying]);

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

  const currentEvent = events[currentIndex] || events[0];

  return (
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden">
      
      {/* ── TOP PLAYBACK CONTROLLER BAR ── */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between border-l-4 border-crimenet-cyan gap-4">
        <div className="flex items-center gap-3">
          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isTimelinePlaying
                ? 'bg-crimenet-amber text-black shadow-lg shadow-amber-500/40 animate-pulse'
                : 'bg-crimenet-cyan hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/40'
            }`}
            title={isTimelinePlaying ? 'Pause Playback' : 'Start Chronological Playback'}
          >
            {isTimelinePlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Step Back & Forward */}
          <button
            onClick={handleStepBackward}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
            title="Previous Event"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentIndex >= events.length - 1}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 transition-colors"
            title="Next Event"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Playback Speed Multiplier */}
          <div className="flex bg-black/60 rounded-lg p-0.5 border border-white/10 text-xs font-mono">
            {([1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                  playbackSpeed === spd ? 'bg-crimenet-cyan text-black' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>
        </div>

        {/* Temporal Cursor Indicator */}
        <div className="text-center md:text-right font-mono">
          <div className="text-[10px] text-crimenet-muted uppercase tracking-widest flex items-center justify-center md:justify-end gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isTimelinePlaying ? 'bg-emerald-400 animate-ping' : 'bg-crimenet-cyan'}`}></span>
            TEMPORAL CURSOR
          </div>
          <div className="text-base font-bold text-white tracking-wider mt-0.5">
            {currentEvent ? currentEvent.timestamp.slice(0, 10) : '2026-02-15'}
          </div>
          <div className="text-[10px] text-crimenet-cyan">
            EVENT {currentIndex + 1} OF {events.length}
          </div>
        </div>
      </div>

      {/* ── MAIN TIMELINE PANEL ── */}
      <GlassPanel title="CHRONOLOGICAL INVESTIGATION STREAM (CLICK EVENT TO SYNCHRONIZE MAP & GRAPH)" className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="mb-4 flex items-center gap-2 flex-wrap border-b border-white/10 pb-3">
          <span className="text-[10px] font-mono uppercase text-crimenet-muted flex items-center gap-1 mr-2">
            <Filter className="w-3 h-3 text-crimenet-cyan" /> Event Filter:
          </span>
          <button
            onClick={() => setFilterType(null)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
              !filterType
                ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            All Events ({total})
          </button>
          {eventTypes.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(filterType === t ? null : t)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
                filterType === t
                  ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Timeline Events Scroll Area */}
        <div className="flex-1 overflow-y-auto scrollbar-dark pr-2 space-y-3">
          {events.map((ev, idx) => {
            const Icon = EVENT_ICONS[ev.type] || FileText;
            const color = EVENT_COLORS[ev.type] || '#00D4FF';
            const isActive = currentIndex === idx || selectedEvent?.id === ev.id;

            return (
              <div
                key={ev.id}
                onClick={() => handleEventClick(ev, idx)}
                className={`glass-card p-3.5 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer group ${
                  isActive
                    ? 'border-crimenet-cyan bg-crimenet-cyan/10 shadow-lg shadow-cyan-500/20 scale-[1.01]'
                    : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                {/* Event Icon Glyph */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
                    isActive ? 'scale-110 shadow-md' : 'group-hover:scale-105'
                  }`}
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Event Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-crimenet-cyan' : 'text-white'}`}>
                        {ev.id}
                      </span>
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-crimenet-muted">
                      {ev.timestamp.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>

                  <p className="text-xs text-white/90 mt-1.5 leading-relaxed font-sans">
                    {ev.description}
                  </p>

                  {/* Linked Suspects */}
                  {ev.entities && ev.entities.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-mono text-crimenet-muted uppercase">Correlated Entities:</span>
                      <div className="flex flex-wrap gap-1">
                        {ev.entities.map((eid) => (
                          <button
                            key={eid}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectEntity(eid);
                            }}
                            className="px-2 py-0.5 rounded bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/30 text-[10px] font-mono transition-colors"
                          >
                            {eid}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location & Provenance Footer */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-crimenet-muted mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-white/80">
                        <MapPin className="w-3 h-3 text-emerald-400" /> {ev.location_name || ev.location_city || 'Jurisdictional Point'}
                      </span>
                      <span>{ev.source}</span>
                    </div>

                    {ev.evidence_hash && (
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">SHA-256 PROTECTED</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

    </div>
  );
}
