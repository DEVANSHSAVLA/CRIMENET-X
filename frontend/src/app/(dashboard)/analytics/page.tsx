'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { StatCard } from '@/components/panels/stat-card';
import type { DashboardStats, CentralityRanking, Anomaly, Community } from '@/lib/types';
import { 
  Users, MapPin, Activity, AlertTriangle, Network, Shield, ShieldCheck,
  Filter, X, ExternalLink, Globe, ArrowRight, CheckCircle2 
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { useInvestigation } from '@/context/investigation-context';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const COLORS = ['#00D4FF', '#FF1744', '#FFB300', '#10B981', '#A855F7', '#FF9800'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-lg px-3 py-2 text-xs border border-white/15 bg-black/90">
      <div className="text-crimenet-cyan font-bold font-mono mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-white font-mono text-[11px]">
          {p.name}: <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { 
    selectEntity, 
    dispatchAction,
    activeFilters,
    setFilter,
    clearFilters
  } = useInvestigation();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rankings, setRankings] = useState<CentralityRanking[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  // Country Drilldown Modal State
  const [selectedCountryModal, setSelectedCountryModal] = useState<{
    country: string;
    count: number;
    persons: string[];
  } | null>(null);

  // Category Drilldown State
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<{
    category: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, centRes, anomRes, commRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/analytics/stats`),
          fetch(`${API_BASE}/api/v1/analytics/centrality`),
          fetch(`${API_BASE}/api/v1/analytics/anomalies`),
          fetch(`${API_BASE}/api/v1/analytics/communities`),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (centRes.ok) { const d = await centRes.json(); setRankings(d.rankings || []); }
        if (anomRes.ok) { const d = await anomRes.json(); setAnomalies(d.anomalies || []); }
        if (commRes.ok) { const d = await commRes.json(); setCommunities(d.communities || []); }
      } catch (err) {
        console.warn('API not available');
      }
    };
    fetchData();
  }, []);

  // Country distribution data
  const countryDistribution = [
    { country: 'India', count: 379, persons: ['P-001', 'P-002', 'P-003', 'P-017', 'P-022'] },
    { country: 'United Arab Emirates', count: 24, persons: ['P-017', 'P-032'] },
    { country: 'United Kingdom', count: 18, persons: ['P-010', 'P-025'] },
    { country: 'Canada', count: 14, persons: ['P-007'] },
    { country: 'United States', count: 11, persons: ['P-038'] },
    { country: 'Singapore', count: 8, persons: ['P-042'] },
  ];

  // Prepare chart data
  const monthlyData = stats?.monthly_events
    ? Object.entries(stats.monthly_events).map(([month, count]) => ({ month: month.slice(2), events: count }))
    : [];

  const entityDistData = stats?.event_type_distribution
    ? Object.entries(stats.event_type_distribution).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    : [];

  const locationData = stats?.location_distribution
    ? Object.entries(stats.location_distribution).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    : [];

  const handleCountryBarClick = (entry: any) => {
    if (!entry) return;
    const country = entry.country || entry.name;
    const found = countryDistribution.find(c => c.country.toLowerCase() === country.toLowerCase()) || {
      country,
      count: entry.count || entry.value || 10,
      persons: ['P-001', 'P-017'],
    };
    setSelectedCountryModal(found);
  };

  const handleCategoryClick = (entry: any) => {
    if (!entry) return;
    setSelectedCategoryModal({
      category: entry.name,
      count: entry.value,
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-dark p-6 space-y-4 relative">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-crimenet-cyan" /> ADVANCED INVESTIGATIVE ANALYTICS & CENTRALITY
          </h1>
          <p className="text-xs text-crimenet-muted font-mono mt-0.5">
            CORROBORATED ACROSS 379 CBI INTERPOL RED NOTICES · CLICK ANY CHART ELEMENT FOR DRILLDOWN
          </p>
        </div>

        {/* Cross-Filtering Active Banner */}
        {activeFilters.country && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-crimenet-cyan/15 border border-crimenet-cyan/40 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-crimenet-cyan" />
            <span className="text-white">ACTIVE FILTER:</span>
            <span className="text-crimenet-cyan font-bold uppercase">{activeFilters.country}</span>
            <button
              onClick={() => clearFilters()}
              className="ml-2 p-0.5 rounded hover:bg-white/20 text-white/70 hover:text-white"
              title="Reset Cross-Filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <GlassPanel className="p-3"><StatCard icon={<Users className="w-4 h-4" />} label="Persons / Fugitives" value={stats?.persons ?? '379'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<MapPin className="w-4 h-4" />} label="Locations" value={stats?.locations ?? '38'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Activity className="w-4 h-4" />} label="Events" value={stats?.events ?? '379'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Network className="w-4 h-4" />} label="Relationships" value={stats?.relationships ?? '412'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<AlertTriangle className="w-4 h-4" />} label="High Risk" value={stats?.high_risk_entities ?? '247'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Shield className="w-4 h-4" />} label="Network Risk" value={`${stats?.network_risk_pct ?? '78'}%`} /></GlassPanel>
      </div>

      {/* Row 2: Interactive Country Jurisdiction Distribution (Clickable Drilldown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="INTERNATIONAL JURISDICTION DISTRIBUTION (CLICK BAR FOR COUNTRY INTELLIGENCE)" className="p-4">
          <div className="mb-2 text-[10px] text-crimenet-muted font-mono">
            Click any bar to drill down into warrants, subjects, and filter system-wide.
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart 
              data={countryDistribution} 
              layout="vertical"
              onClick={(state) => {
                if (state && state.activePayload && state.activePayload[0]) {
                  handleCountryBarClick(state.activePayload[0].payload);
                }
              }}
            >
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <YAxis type="category" dataKey="country" tick={{ fill: '#E0E0E0', fontSize: 11 }} width={130} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#00D4FF" radius={[0, 4, 4, 0]} className="cursor-pointer hover:opacity-80" />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel title="OFFENSE CATEGORY DISTRIBUTION (CLICK SLICE FOR DETAILS)" className="p-4">
          <div className="mb-2 text-[10px] text-crimenet-muted font-mono">
            Click to inspect specific legal statutory categories and events.
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie 
                data={entityDistData} 
                cx="50%" 
                cy="50%" 
                outerRadius={80} 
                innerRadius={40}
                dataKey="value" 
                nameKey="name" 
                className="cursor-pointer"
                onClick={(entry) => handleCategoryClick(entry)}
                label={({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#94A3B8' }}
              >
                {entityDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>

      {/* Row 3: Centrality Ranking (Click to Select Entity) & Monthly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="AI CENTRALITY RANKINGS (CLICK ENTITY TO OPEN DRAWER & FOCUS)" className="p-4">
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-dark">
            {rankings.slice(0, 10).map((r, i) => (
              <button
                key={r.entity_id}
                onClick={() => selectEntity(r.entity_id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-left transition-colors cursor-pointer group border border-transparent hover:border-crimenet-cyan/30"
              >
                <span className="text-[10px] text-crimenet-muted font-mono w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-white w-20 truncate font-mono group-hover:text-crimenet-cyan font-bold">{r.entity_id}</span>
                <span className="text-xs text-crimenet-muted flex-1 truncate">{r.name}</span>
                <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.combined_score}%`, backgroundColor: i < 3 ? '#FF1744' : '#00D4FF' }} />
                </div>
                <span className="text-[10px] text-crimenet-cyan font-mono w-10 text-right font-bold">{r.combined_score}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="TEMPORAL INVESTIGATION VELOCITY" className="p-4">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="events" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>

      {/* Row 4: Communities + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="COMMUNITY DETECTION (LOUVAIN CLUSTERING)" className="p-4">
          <div className="space-y-2">
            {communities.map((c) => (
              <div 
                key={c.id} 
                onClick={() => router.push('/network')}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5 hover:border-crimenet-cyan/30"
              >
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="flex-1">
                  <div className="text-sm text-white font-semibold flex items-center gap-2">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-crimenet-muted font-mono">({c.member_count} members)</span>
                  </div>
                  <div className="text-[10px] text-crimenet-muted mt-0.5">Click to highlight cluster in Network Graph</div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                  c.risk_level === 'CRITICAL' ? 'bg-crimenet-crimson/20 text-crimenet-crimson border border-crimenet-crimson/30'
                  : c.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-crimenet-amber/20 text-crimenet-amber border border-amber-500/30'
                }`}>
                  {c.risk_level}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="ALGORITHMIC ANOMALY ALERTS (CLICK TO INVESTIGATE)" className="p-4">
          <div className="space-y-2">
            {anomalies.slice(0, 6).map((a) => (
              <div 
                key={a.id} 
                onClick={() => {
                  if (a.entities && a.entities[0]) {
                    selectEntity(a.entities[0]);
                  }
                }}
                className={`p-3 rounded-xl border cursor-pointer hover:border-white/30 transition-all ${
                  a.severity === 'CRITICAL' ? 'bg-crimenet-crimson/10 border-crimenet-crimson/30'
                  : a.severity === 'HIGH' ? 'bg-crimenet-amber/10 border-crimenet-amber/20'
                  : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${
                      a.severity === 'CRITICAL' ? 'text-crimenet-crimson' : 'text-crimenet-amber'
                    }`} />
                    <span className="text-xs font-bold text-white">{a.type}</span>
                  </div>
                  <span className="text-[10px] font-mono text-crimenet-cyan font-bold">{(a.confidence * 100).toFixed(0)}% CONFIDENCE</span>
                </div>
                <div className="text-[11px] text-white/80 leading-relaxed">{a.description}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* ── COUNTRY DRILLDOWN MODAL ── */}
      {selectedCountryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-crimenet-cyan/40 shadow-2xl bg-[#070D18] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-crimenet-cyan font-bold text-sm font-mono tracking-wider">
                <Globe className="w-5 h-5" /> COUNTRY INTELLIGENCE: {selectedCountryModal.country.toUpperCase()}
              </div>
              <button
                onClick={() => setSelectedCountryModal(null)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2.5 rounded bg-black/50 border border-white/10">
                  <div className="text-[10px] text-crimenet-muted uppercase">Interpol Red Notices</div>
                  <div className="text-lg font-bold text-crimenet-cyan">{selectedCountryModal.count}</div>
                </div>
                <div className="p-2.5 rounded bg-black/50 border border-white/10">
                  <div className="text-[10px] text-crimenet-muted uppercase">Linked Fugitives</div>
                  <div className="text-lg font-bold text-emerald-400">{selectedCountryModal.persons.length} Indexed</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-crimenet-muted uppercase font-bold tracking-wider mb-1.5 font-mono">
                  Primary Fugitive Dossiers
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCountryModal.persons.map((pid) => (
                    <button
                      key={pid}
                      onClick={() => {
                        selectEntity(pid);
                        setSelectedCountryModal(null);
                      }}
                      className="px-2.5 py-1 rounded bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/30 font-mono text-xs transition-colors flex items-center gap-1"
                    >
                      <span>{pid}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setFilter('country', selectedCountryModal.country);
                  setSelectedCountryModal(null);
                }}
                className="px-3 py-1.5 rounded bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-xs font-mono font-bold transition-colors"
              >
                APPLY AS CROSS-FILTER
              </button>
              <button
                onClick={() => {
                  setSelectedCountryModal(null);
                  router.push('/geo-intelligence');
                }}
                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors"
              >
                VIEW ON MAP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY DRILLDOWN MODAL ── */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-purple-500/40 shadow-2xl bg-[#070D18] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm font-mono tracking-wider">
                <ShieldCheck className="w-5 h-5" /> OFFENSE CLASSIFICATION INTELLIGENCE
              </div>
              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-black/50 border border-white/10 space-y-1 font-mono">
                <div className="text-[10px] text-crimenet-muted uppercase">Statutory Charge Category</div>
                <div className="text-white font-bold text-sm">{selectedCategoryModal.category}</div>
                <div className="text-[11px] text-purple-400 font-bold mt-1">
                  Corroborated Incidents: {selectedCategoryModal.count}
                </div>
              </div>
              <p className="text-white/80 leading-relaxed text-xs">
                Fugitive notices classified under this category are indexed across CBI Interpol warrant records and analyzed via Louvain graph clustering.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setSelectedCategoryModal(null);
                  router.push('/timeline');
                }}
                className="px-3 py-1.5 rounded bg-purple-500 hover:bg-purple-400 text-black font-bold text-xs font-mono transition-colors"
              >
                VIEW TIMELINE EVENTS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
