'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { StatCard } from '@/components/panels/stat-card';
import type { DashboardStats, CentralityRanking, Anomaly, Community } from '@/lib/types';
import { Users, MapPin, Activity, AlertTriangle, Network, Shield } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { useInvestigation } from '@/context/investigation-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const COLORS = ['#00D4FF', '#FF1744', '#FFB300', '#4CAF50', '#9C27B0', '#FF9800'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-lg px-3 py-2 text-xs">
      <div className="text-crimenet-muted mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-white font-mono">{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { selectEntity, dispatchAction } = useInvestigation();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [rankings, setRankings] = useState<CentralityRanking[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

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

  return (
    <div className="w-full h-full overflow-y-auto scrollbar-dark p-4 space-y-4">
      <div className="text-lg font-bold text-white mb-1">NETWORK INTELLIGENCE ANALYTICS</div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <GlassPanel className="p-3"><StatCard icon={<Users className="w-4 h-4" />} label="Persons" value={stats?.persons ?? '—'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<MapPin className="w-4 h-4" />} label="Locations" value={stats?.locations ?? '—'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Activity className="w-4 h-4" />} label="Events" value={stats?.events ?? '—'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Network className="w-4 h-4" />} label="Relationships" value={stats?.relationships ?? '—'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<AlertTriangle className="w-4 h-4" />} label="High Risk" value={stats?.high_risk_entities ?? '—'} /></GlassPanel>
        <GlassPanel className="p-3"><StatCard icon={<Shield className="w-4 h-4" />} label="Network Risk" value={`${stats?.network_risk_pct ?? '—'}%`} /></GlassPanel>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="NETWORK ACTIVITY" className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="events" stroke="#00D4FF" fill="#00D4FF" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel title="EVENT DISTRIBUTION" className="p-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={entityDistData} cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                dataKey="value" nameKey="name" label={({ name, percent }) => `${name.slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#94A3B8' }}>
                {entityDistData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </GlassPanel>
      </div>

      {/* Row 3: Location + Centrality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="TOP LOCATIONS" className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={locationData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#E0E0E0', fontSize: 11 }} width={80} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#00D4FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassPanel>

        <GlassPanel title="CENTRALITY RANKINGS (CLICK TO INSPECT)" className="p-4">
          <div className="space-y-1.5">
            {rankings.slice(0, 8).map((r, i) => (
              <button
                key={r.entity_id}
                onClick={() => selectEntity(r.entity_id)}
                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-white/10 text-left transition-colors cursor-pointer group"
              >
                <span className="text-[10px] text-crimenet-muted font-mono w-5">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs text-white w-20 truncate font-mono group-hover:text-crimenet-cyan">{r.entity_id}</span>
                <span className="text-xs text-crimenet-muted flex-1 truncate">{r.name}</span>
                <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.combined_score}%`, backgroundColor: i < 3 ? '#FF1744' : '#00D4FF' }} />
                </div>
                <span className="text-[10px] text-crimenet-cyan font-mono w-8 text-right">{r.combined_score}</span>
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Row 4: Communities + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="COMMUNITY OVERVIEW" className="p-4">
          <div className="space-y-2">
            {communities.map((c) => (
              <div 
                key={c.id} 
                onClick={() => dispatchAction('FOCUS_NETWORK', null)}
                className="flex items-center gap-3 p-2 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <div className="flex-1">
                  <div className="text-sm text-white font-semibold">{c.name}</div>
                  <div className="text-[10px] text-crimenet-muted">{c.member_count} members · Click to view in Network</div>
                </div>
                <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  c.risk_level === 'CRITICAL' ? 'bg-crimenet-crimson/20 text-crimenet-crimson'
                  : c.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400'
                  : 'bg-crimenet-amber/20 text-crimenet-amber'
                }`}>
                  {c.risk_level}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="ANOMALY ALERTS" className="p-4">
          <div className="space-y-2">
            {anomalies.slice(0, 6).map((a) => (
              <div 
                key={a.id} 
                onClick={() => {
                  if (a.entities && a.entities[0]) {
                    selectEntity(a.entities[0]);
                  }
                }}
                className={`p-2.5 rounded border cursor-pointer hover:border-white/30 transition-all ${
                  a.severity === 'CRITICAL' ? 'bg-crimenet-crimson/10 border-crimenet-crimson/30'
                  : a.severity === 'HIGH' ? 'bg-crimenet-amber/10 border-crimenet-amber/20'
                  : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className={`w-3 h-3 ${
                    a.severity === 'CRITICAL' ? 'text-crimenet-crimson' : 'text-crimenet-amber'
                  }`} />
                  <span className="text-xs font-semibold text-white">{a.type}</span>
                  <span className="ml-auto text-[10px] text-crimenet-muted">{(a.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-[10px] text-white/70 leading-relaxed">{a.description}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
