'use client';

import React, { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import type { TimelineEvent } from '@/lib/types';
import { 
  FileText, ShieldAlert, MapPin, Users, Eye, 
  Filter, Calendar, ShieldCheck 
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
  LOCATION_EVENT: '#4CAF50',
  PERSON_INTERACTION: '#9C27B0',
  SURVEILLANCE_EVENT: '#FF9800',
};

export default function TimelinePage() {
  const { selectEntity } = useInvestigation();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const params: Record<string, string> = {};
        if (filterType) params.event_type = filterType;
        const res = await api.getTimeline('CBI-INTERPOL-RED-379', params);
        setEvents(res.events || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.warn('API fallback for timeline');
      }
    };
    fetchTimeline();
  }, [filterType]);

  const eventTypes = [
    'WARRANT_PUBLICATION',
    'COMMUNICATION',
    'SURVEILLANCE_EVENT',
    'LOCATION_EVENT',
  ];

  return (
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden">
      
      {/* Header Bar */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-crimenet-cyan">
        <div>
          <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4 text-crimenet-cyan" /> TEMPORAL INTELLIGENCE STREAM
          </h2>
          <p className="text-[11px] text-crimenet-muted font-mono mt-0.5">
            CHRONOLOGICAL PROVENANCE ACROSS 379 INTERPOL RED NOTICES & VERIFIED WARRANTS
          </p>
        </div>
        <div className="text-right font-mono text-xs">
          <span className="text-crimenet-muted">TOTAL EVENTS:</span>{' '}
          <span className="text-crimenet-cyan font-bold">{total}</span>
        </div>
      </div>

      {/* Main Timeline Card */}
      <GlassPanel title="CHRONOLOGICAL INVESTIGATION TRAIL" className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="mb-4 flex items-center gap-2 flex-wrap border-b border-white/10 pb-3">
          <span className="text-[10px] font-mono uppercase text-crimenet-muted flex items-center gap-1 mr-2">
            <Filter className="w-3 h-3 text-crimenet-cyan" /> Filter Event Type:
          </span>
          <button
            onClick={() => setFilterType(null)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
              !filterType
                ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            All Events
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

        {/* Timeline Events List */}
        <div className="flex-1 overflow-y-auto scrollbar-dark pr-2 space-y-3">
          {events.map((ev) => {
            const Icon = EVENT_ICONS[ev.type] || FileText;
            const color = EVENT_COLORS[ev.type] || '#00D4FF';

            return (
              <div
                key={ev.id}
                className="glass-card p-3.5 rounded-lg border border-white/5 hover:border-white/15 transition-all flex items-start gap-3.5 group"
              >
                {/* Event Icon Glyph */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Event Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">
                        {ev.id}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {ev.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-crimenet-muted">
                      {ev.timestamp.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>

                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    {ev.description}
                  </p>

                  {/* Linked Entities */}
                  {ev.entities && ev.entities.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-mono text-crimenet-muted uppercase">Linked Targets:</span>
                      <div className="flex flex-wrap gap-1">
                        {ev.entities.map((eid) => (
                          <button
                            key={eid}
                            onClick={() => selectEntity(eid)}
                            className="px-1.5 py-0.5 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/30 text-[10px] font-mono transition-colors"
                          >
                            {eid}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-crimenet-muted mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-crimenet-cyan" /> {ev.location_city || 'India'}
                      </span>
                      <span>SOURCE: {ev.source}</span>
                    </div>

                    {ev.evidence_hash && (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{ev.evidence_hash.slice(0, 12)}...</span>
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
