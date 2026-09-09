'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { StatCard } from '@/components/panels/stat-card';
import { TiltCard3D } from '@/components/shared/tilt-card-3d';
import { SuspectPhoto } from '@/components/shared/suspect-photo';
import type { DashboardStats, CentralityRanking, Anomaly, Community } from '@/lib/types';
import { 
  Users, MapPin, Activity, AlertTriangle, Network, Shield, ShieldCheck,
  Filter, X, ExternalLink, Globe, ArrowRight, CheckCircle2, Box, Zap,
  TrendingUp, Award, Layers, Flame, Scale, Landmark
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
    <div className="glass-panel rounded-lg px-3 py-2 text-xs border border-white/15 bg-black/90 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
      <div className="text-crimenet-cyan font-bold font-mono mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-white font-mono text-[11px]">
          {p.name}: <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// 5 Syndicate Threat Tensors for 3D Matrix
interface SyndicateTensor {
  id: string;
  name: string;
  code: string;
  hub: string;
  leaderId: string;
  leaderName: string;
  mcocaScore: number;       // 0-100 MCOCA Severity
  pmlaHawalaCr: number;     // ₹ Crores Hawala Flow
  frictionScore: number;    // Extradition Friction
  centralityScore: number;  // Network Eigen-Centrality
  threatTier: 'ALPHA-CRITICAL' | 'TIER-1 HIGH' | 'TIER-2 ELEVATED';
  color: 'crimson' | 'cyan' | 'amber' | 'purple' | 'emerald';
  statutes: string;
  members: number;
}

const SYNDICATE_TENSORS: SyndicateTensor[] = [
  {
    id: 'T-01',
    name: 'Shadow Syndicate',
    code: 'CLUSTER-A',
    hub: 'Mumbai Coastal Corridor',
    leaderId: 'P-003',
    leaderName: 'Arjun Patel',
    mcocaScore: 94,
    pmlaHawalaCr: 142.8,
    frictionScore: 78,
    centralityScore: 91.4,
    threatTier: 'ALPHA-CRITICAL',
    color: 'cyan',
    statutes: 'MCOCA Sec 3(1)(ii), NDPS Sec 27A',
    members: 15,
  },
  {
    id: 'T-02',
    name: 'Golden Circuit',
    code: 'CLUSTER-B',
    hub: 'Delhi NCR Financial Hub',
    leaderId: 'P-022',
    leaderName: 'Suresh Gupta',
    mcocaScore: 88,
    pmlaHawalaCr: 268.4,
    frictionScore: 64,
    centralityScore: 86.2,
    threatTier: 'TIER-1 HIGH',
    color: 'amber',
    statutes: 'PMLA 2002 Sec 4, IPC 420/120B',
    members: 12,
  },
  {
    id: 'T-03',
    name: 'Silk Route Smuggling',
    code: 'CLUSTER-C',
    hub: 'Pune MIDC Logistics Belt',
    leaderId: 'P-038',
    leaderName: 'Deepak Joshi',
    mcocaScore: 82,
    pmlaHawalaCr: 95.1,
    frictionScore: 52,
    centralityScore: 79.5,
    threatTier: 'TIER-2 ELEVATED',
    color: 'purple',
    statutes: 'Customs Act Sec 135, Arms Act 25',
    members: 10,
  },
  {
    id: 'T-04',
    name: 'Bridge Nexus Conduit',
    code: 'CLUSTER-BRIDGE',
    hub: 'Tri-City Transit Conduits',
    leaderId: 'P-017',
    leaderName: 'Vikram Reddy',
    mcocaScore: 98,
    pmlaHawalaCr: 315.6,
    frictionScore: 89,
    centralityScore: 99.2,
    threatTier: 'ALPHA-CRITICAL',
    color: 'crimson',
    statutes: 'UAPA Sec 17/40, PMLA Sec 3 Hawala',
    members: 18,
  },
  {
    id: 'T-05',
    name: 'Transnational Axis',
    code: 'CLUSTER-GULF',
    hub: 'Dubai - London - Muscat',
    leaderId: 'P-010',
    leaderName: 'Ajay Sharma',
    mcocaScore: 96,
    pmlaHawalaCr: 410.0,
    frictionScore: 92,
    centralityScore: 94.8,
    threatTier: 'ALPHA-CRITICAL',
    color: 'emerald',
    statutes: 'Interpol Red Notice Art 82, PMLA',
    members: 24,
  },
];

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
  const [selectedTensor, setSelectedTensor] = useState<SyndicateTensor | null>(SYNDICATE_TENSORS[3]); // Default P-017 Bridge
  const [tensorMetricView, setTensorMetricView] = useState<'mcoca' | 'pmla' | 'centrality' | 'friction'>('centrality');

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
    <div className="w-full h-full overflow-y-auto scrollbar-dark p-6 space-y-5 relative">
      
      {/* Header Banner with 3D Gyroscopic Insignia */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-cyan-500/10 border border-crimenet-cyan/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.3)]">
            <Box className="w-5 h-5 text-crimenet-cyan animate-pulse" />
            <div className="absolute inset-0 rounded-xl border border-dashed border-crimenet-cyan/60 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
              <Activity className="w-5 h-5 text-crimenet-cyan" /> 3D SYNDICATE THREAT TENSOR & PREDICTIVE ANALYTICS
            </h1>
            <p className="text-xs text-crimenet-muted font-mono mt-0.5">
              LEGAL CORROBORATION: MCOCA 1999 §3 · PMLA 2002 §4 · 379 CBI INTERPOL RED NOTICES
            </p>
          </div>
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

      {/* Row 1: Dynamic 3D Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard 
          icon={<Users className="w-4 h-4 text-crimenet-cyan" />} 
          label="Persons / Fugitives" 
          value={stats?.persons ?? '379'} 
          change="3D Network Graph →"
          glowColor="cyan"
          onClick={() => router.push('/network')}
        />
        <StatCard 
          icon={<MapPin className="w-4 h-4 text-emerald-400" />} 
          label="Locations" 
          value={stats?.locations ?? '38'} 
          change="3D Geospatial Orbit →"
          glowColor="emerald"
          onClick={() => router.push('/geo-intelligence')}
        />
        <StatCard 
          icon={<Activity className="w-4 h-4 text-purple-400" />} 
          label="Events" 
          value={stats?.events ?? '379'} 
          change="3D Depth Timeline →"
          glowColor="purple"
          onClick={() => router.push('/timeline')}
        />
        <StatCard 
          icon={<Network className="w-4 h-4 text-crimenet-cyan" />} 
          label="Relationships" 
          value={stats?.relationships ?? '412'} 
          change="Co-Accused Graph →"
          glowColor="cyan"
          onClick={() => router.push('/network')}
        />
        <StatCard 
          icon={<AlertTriangle className="w-4 h-4 text-crimenet-amber" />} 
          label="High Risk" 
          value={stats?.high_risk_entities ?? '247'} 
          change="Filter High Risk →"
          glowColor="amber"
          onClick={() => {
            setFilter('riskLevel', 'HIGH');
            router.push('/command-center');
          }}
        />
        <StatCard 
          icon={<Shield className="w-4 h-4 text-crimenet-crimson" />} 
          label="Network Risk" 
          value={`${stats?.network_risk_pct ?? '78'}%`} 
          change="Admin Telemetry →"
          glowColor="crimson"
          onClick={() => router.push('/admin')}
        />
      </div>

      {/* ── ROW 2: 3D ISOMETRIC SYNDICATE THREAT TENSOR MATRIX (NEW HERO 3D FEATURE) ── */}
      <TiltCard3D glowColor="cyan" maxTilt={4} className="rounded-2xl">
        <GlassPanel className="p-5 depth-3d-box neon-depth-cyan border-crimenet-cyan/30 bg-[#060D1A]/90">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40 uppercase">
                  3D TENSOR TELEMETRY
                </span>
                <span className="text-xs text-white/50 font-mono">TACTICAL COMPARISON ENGINE</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-wide mt-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-crimenet-cyan" /> ISOMETRIC SYNDICATE THREAT TENSOR MATRIX
              </h2>
              <p className="text-xs text-crimenet-muted font-mono mt-0.5">
                Multi-dimensional quantitative scoring across MCOCA Organized Crime Severity, PMLA Hawala Volume, Extradition Friction & Graph Centrality.
              </p>
            </div>

            {/* Metric Switcher Controls */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setTensorMetricView('centrality')}
                className={`px-3 py-1.5 rounded-lg transition-all ${tensorMetricView === 'centrality' ? 'bg-crimenet-cyan text-black font-bold shadow-[0_0_12px_rgba(0,212,255,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                CENTRALITY
              </button>
              <button
                onClick={() => setTensorMetricView('mcoca')}
                className={`px-3 py-1.5 rounded-lg transition-all ${tensorMetricView === 'mcoca' ? 'bg-crimenet-crimson text-white font-bold shadow-[0_0_12px_rgba(255,23,68,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                MCOCA SEVERITY
              </button>
              <button
                onClick={() => setTensorMetricView('pmla')}
                className={`px-3 py-1.5 rounded-lg transition-all ${tensorMetricView === 'pmla' ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(255,179,0,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                PMLA HAWALA
              </button>
              <button
                onClick={() => setTensorMetricView('friction')}
                className={`px-3 py-1.5 rounded-lg transition-all ${tensorMetricView === 'friction' ? 'bg-purple-500 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.5)]' : 'text-white/70 hover:text-white'}`}
              >
                EXTRADITION FRICTION
              </button>
            </div>
          </div>

          {/* 5-Syndicate Isometric 3D Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {SYNDICATE_TENSORS.map((syndicate) => {
              const isSelected = selectedTensor?.id === syndicate.id;
              const barHeight = tensorMetricView === 'mcoca' 
                ? syndicate.mcocaScore 
                : tensorMetricView === 'pmla'
                ? Math.min(100, Math.round((syndicate.pmlaHawalaCr / 410) * 100))
                : tensorMetricView === 'friction'
                ? syndicate.frictionScore
                : syndicate.centralityScore;

              const metricDisplay = tensorMetricView === 'mcoca'
                ? `${syndicate.mcocaScore}% MCOCA`
                : tensorMetricView === 'pmla'
                ? `₹${syndicate.pmlaHawalaCr} Cr`
                : tensorMetricView === 'friction'
                ? `${syndicate.frictionScore}% Friction`
                : `${syndicate.centralityScore}% Centrality`;

              return (
                <div
                  key={syndicate.id}
                  onClick={() => setSelectedTensor(syndicate)}
                  className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 border text-left group overflow-hidden ${
                    isSelected 
                      ? 'bg-gradient-to-b from-white/10 to-black/90 border-crimenet-cyan shadow-[0_0_25px_rgba(0,212,255,0.3)] scale-[1.02]'
                      : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-white/5'
                  }`}
                  style={{
                    transform: isSelected ? 'translateZ(10px)' : 'none',
                  }}
                >
                  {/* Top Bar Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-crimenet-muted">{syndicate.code}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      syndicate.threatTier === 'ALPHA-CRITICAL' ? 'bg-crimenet-crimson/20 text-crimenet-crimson border border-crimenet-crimson/40' : 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                    }`}>
                      {syndicate.threatTier}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white group-hover:text-crimenet-cyan transition-colors">
                    {syndicate.name}
                  </div>
                  <div className="text-[11px] text-white/50 font-mono truncate mb-3">
                    {syndicate.hub}
                  </div>

                  {/* 3D Extrusion Metric Pillar */}
                  <div className="h-28 w-full bg-black/60 rounded-lg p-2 flex flex-col justify-end relative border border-white/5 overflow-hidden">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_20px]" />
                    
                    {/* Animated Vertical 3D Bar */}
                    <div 
                      className={`w-full rounded-md transition-all duration-700 relative overflow-hidden ${
                        syndicate.color === 'crimson' ? 'bg-gradient-to-t from-red-900 via-crimenet-crimson to-rose-400 shadow-[0_0_15px_rgba(255,23,68,0.5)]'
                        : syndicate.color === 'amber' ? 'bg-gradient-to-t from-amber-900 via-amber-500 to-yellow-300 shadow-[0_0_15px_rgba(255,179,0,0.5)]'
                        : syndicate.color === 'purple' ? 'bg-gradient-to-t from-purple-900 via-purple-500 to-fuchsia-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        : syndicate.color === 'emerald' ? 'bg-gradient-to-t from-emerald-900 via-emerald-500 to-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-t from-cyan-900 via-crimenet-cyan to-blue-300 shadow-[0_0_15px_rgba(0,212,255,0.5)]'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    >
                      <div className="absolute inset-0 bg-white/15 animate-[pulse_2s_infinite]" />
                    </div>

                    <div className="mt-2 text-center text-xs font-mono font-bold text-white z-10">
                      {metricDisplay}
                    </div>
                  </div>

                  {/* Kingpin Link */}
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-white/50 font-mono">LEADER:</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEntity(syndicate.leaderId);
                      }}
                      className="font-mono text-crimenet-cyan font-bold hover:underline"
                    >
                      {syndicate.leaderId}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Syndicate Deep Dossier Strip */}
          {selectedTensor && (
            <div className="mt-4 p-4 rounded-xl bg-black/60 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-4">
                <SuspectPhoto
                  entityId={selectedTensor.leaderId}
                  displayName={selectedTensor.leaderName}
                  riskLevel="HIGH"
                  size="md"
                  showLightboxOnClick={true}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{selectedTensor.leaderName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-crimenet-cyan text-[10px] font-mono">
                      {selectedTensor.leaderId} · SYNDICATE LEADER
                    </span>
                  </div>
                  <div className="text-xs text-white/70 font-mono mt-0.5">
                    Statutory Invocation: <span className="text-crimenet-amber">{selectedTensor.statutes}</span>
                  </div>
                  <div className="text-[11px] text-white/50 font-mono mt-0.5">
                    Hawala Reserve: <span className="text-emerald-400 font-bold">₹{selectedTensor.pmlaHawalaCr} Cr</span> · Extradition Risk: <span className="text-rose-400 font-bold">{selectedTensor.frictionScore}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => selectEntity(selectedTensor.leaderId)}
                  className="px-3 py-2 rounded-lg bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
                >
                  OPEN DOSSIER
                </button>
                <button
                  onClick={() => {
                    selectEntity(selectedTensor.leaderId);
                    router.push('/network');
                  }}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  <span>ISOLATE IN 3D GRAPH</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </GlassPanel>
      </TiltCard3D>

      {/* Row 3: Interactive Country Jurisdiction & Offense Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="INTERNATIONAL JURISDICTION DISTRIBUTION (CLICK BAR FOR COUNTRY INTELLIGENCE)" className="p-4 depth-3d-box border-white/10 hover:border-crimenet-cyan/40 transition-all">
          <div className="mb-2 text-[10px] text-crimenet-muted font-mono">
            Corroborated with CBI Interpol Red Corner Notices across foreign jurisdictions. Click any bar for warrant drilldown.
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

        <GlassPanel title="OFFENSE CATEGORY DISTRIBUTION (CLICK SLICE FOR DETAILS)" className="p-4 depth-3d-box border-white/10 hover:border-amber-400/40 transition-all">
          <div className="mb-2 text-[10px] text-crimenet-muted font-mono">
            Louvain community crime cluster distribution. Click any slice to inspect statutory incident clusters.
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

      {/* Row 4: 3D Holographic Centrality Leaderboard & Temporal Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="3D HOLOGRAPHIC CENTRALITY LEADERBOARD (CLICK TO FOCUS)" className="p-4 depth-3d-box border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-dark pr-1">
            {rankings.slice(0, 7).map((r, i) => {
              const isKingpin = i < 3;
              const medalColor = i === 0 ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : i === 1 ? 'bg-slate-300/20 text-slate-200 border-slate-300/50'
                : i === 2 ? 'bg-amber-700/20 text-amber-500 border-amber-600/50'
                : 'bg-white/5 text-white/50 border-white/10';

              return (
                <div
                  key={r.entity_id}
                  onClick={() => selectEntity(r.entity_id)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-black/50 hover:bg-white/10 text-left transition-all cursor-pointer group border border-white/5 hover:border-crimenet-cyan/40"
                >
                  {/* Rank Medal */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border ${medalColor} shrink-0`}>
                    #{i + 1}
                  </div>

                  {/* Suspect Photo Badge */}
                  <div className="shrink-0">
                    <SuspectPhoto
                      entityId={r.entity_id}
                      displayName={r.name}
                      riskLevel={isKingpin ? 'HIGH' : 'MEDIUM'}
                      size="sm"
                      showLightboxOnClick={false}
                    />
                  </div>

                  {/* Name & ID */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white font-bold group-hover:text-crimenet-cyan truncate">
                        {r.name}
                      </span>
                      <span className="text-[10px] text-crimenet-muted font-mono">{r.entity_id}</span>
                    </div>
                    <div className="text-[10px] text-white/50 font-mono">
                      Degree: {r.degree?.toFixed(2) ?? '0.88'} · Betweenness: {r.betweenness?.toFixed(2) ?? '0.94'}
                    </div>
                  </div>

                  {/* 3D Depth Progress Bar */}
                  <div className="w-24 shrink-0">
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isKingpin ? 'bg-gradient-to-r from-red-500 to-crimenet-crimson shadow-[0_0_8px_rgba(255,23,68,0.5)]' : 'bg-gradient-to-r from-blue-500 to-crimenet-cyan'}`} 
                        style={{ width: `${r.combined_score}%` }} 
                      />
                    </div>
                    <div className="text-[10px] font-mono text-crimenet-cyan text-right mt-0.5 font-bold">
                      {r.combined_score} PTS
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel title="TEMPORAL INVESTIGATION VELOCITY" className="p-4 depth-3d-box border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="mb-2 text-[10px] text-crimenet-muted font-mono">
            Monthly incident spike frequency corroborating syndicate wire intercepts and border crossings.
          </div>
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

      {/* Row 5: Communities + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel title="COMMUNITY DETECTION (LOUVAIN CLUSTERING)" className="p-4 depth-3d-box border-white/10 hover:border-emerald-500/30 transition-all">
          <div className="space-y-2">
            {communities.map((c) => (
              <div 
                key={c.id} 
                onClick={() => router.push('/network')}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-black/50 hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-crimenet-cyan/40"
              >
                <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: c.color, color: c.color }} />
                <div className="flex-1">
                  <div className="text-sm text-white font-semibold flex items-center gap-2">
                    <span>{c.name}</span>
                    <span className="text-[10px] text-crimenet-muted font-mono">({c.member_count} members)</span>
                  </div>
                  <div className="text-[10px] text-crimenet-muted mt-0.5">Click to highlight cluster in Network Graph</div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                  c.risk_level === 'CRITICAL' ? 'bg-crimenet-crimson/20 text-crimenet-crimson border border-crimenet-crimson/30 shadow-[0_0_8px_rgba(255,23,68,0.3)]'
                  : c.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-crimenet-amber/20 text-crimenet-amber border border-amber-500/30'
                }`}>
                  {c.risk_level}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="ALGORITHMIC ANOMALY ALERTS (CLICK TO INVESTIGATE)" className="p-4 depth-3d-box border-white/10 hover:border-crimenet-crimson/30 transition-all">
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
                  a.severity === 'CRITICAL' ? 'bg-crimenet-crimson/15 border-crimenet-crimson/40 shadow-[0_0_12px_rgba(255,23,68,0.2)]'
                  : a.severity === 'HIGH' ? 'bg-crimenet-amber/15 border-crimenet-amber/30 shadow-[0_0_12px_rgba(255,179,0,0.2)]'
                  : 'bg-black/50 border-white/10 hover:bg-white/5'
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
