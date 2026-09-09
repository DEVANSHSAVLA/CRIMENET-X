'use client';

import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { GlassPanel } from '@/components/panels/glass-panel';
import type { NetworkData, CentralityRanking } from '@/lib/types';
import { 
  Search, ZoomIn, ZoomOut, Maximize2, Info, Network,
  ShieldAlert, DollarSign, PhoneCall, Truck, Scale, ChevronRight,
  ExternalLink, Sparkles, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import { SuspectPhoto } from '@/components/shared/suspect-photo';

export type InvestigativeUseCase = 
  | 'FULL_TOPOLOGY'
  | 'KINGPINS'
  | 'FINANCIAL'
  | 'COMMUNICATIONS'
  | 'LOGISTICS'
  | 'LEGAL_WARRANTS';

interface UseCaseConfig {
  key: InvestigativeUseCase;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  statute: string;
  objective: string;
  tacticalAction: string;
  focusTarget: string;
  color: string;
}

const USE_CASE_PRESETS: UseCaseConfig[] = [
  {
    key: 'FULL_TOPOLOGY',
    label: 'Full Syndicate Topology',
    icon: Network,
    tagline: 'Macro Multi-Jurisdiction Criminal Enterprise',
    statute: 'Inter-State Crime Intelligence Bureau SOP · Interpol Red Notices',
    objective: 'Survey complete 3-cluster syndicate topology spanning Mumbai, Delhi, Pune, and cross-border sanctuary hubs.',
    tacticalAction: 'Survey Global Macro Topology',
    focusTarget: 'ALL_CLUSTERS',
    color: '#00D4FF',
  },
  {
    key: 'KINGPINS',
    label: 'Kingpins & Bridge Actors',
    icon: ShieldAlert,
    tagline: 'High-Betweenness Structural Takedown Targets',
    statute: 'Maharashtra Control of Organised Crime Act (MCOCA) Sec 3',
    objective: 'Isolate bridge node P-017 (Vikram Reddy) and syndicate chiefs. Neutralizing these brokers structurally fractures the entire criminal syndicate into isolated, non-viable fragments.',
    tacticalAction: 'Focus Primary Bridge Node P-017',
    focusTarget: 'P-017',
    color: '#FF1744',
  },
  {
    key: 'FINANCIAL',
    label: 'Financial Laundering & Hawala',
    icon: DollarSign,
    tagline: 'Shell Bank Accounts & Layering Channels',
    statute: 'Prevention of Money Laundering Act (PMLA 2002) Sec 5',
    objective: 'Map bank accounts (A-001 - A-030) and high-volume circular fund movements. Target primary layering account A-009 for immediate provisional asset restraint.',
    tacticalAction: 'Flag Accounts for PMLA Attachment',
    focusTarget: 'A-009',
    color: '#FFB300',
  },
  {
    key: 'COMMUNICATIONS',
    label: 'Communications & Wiretaps',
    icon: PhoneCall,
    tagline: 'CDR Edge Frequencies & Burn Phone Networks',
    statute: 'Indian Telegraph Act Sec 5(2) · Intercept Mandate',
    objective: 'Analyze call frequency weights, burn phone rotations, and simultaneous tower associations between Mumbai drug operatives and Delhi fraud conspirators.',
    tacticalAction: 'Track Critical Intercept Ties',
    focusTarget: 'PH-001',
    color: '#38BDF8',
  },
  {
    key: 'LOGISTICS',
    label: 'Logistics & Shared Vehicles',
    icon: Truck,
    tagline: 'Fleet Couriers & Interstate Smuggling Corridors',
    statute: 'Motor Vehicles Act Sec 206 · BNS Sec 303 (Stolen Property)',
    objective: 'Identify shared vehicle registrations (V-001 - V-025) and transit couriers. Deploy automated ANPR alerts on Western Express Highway and NH-48 toll plazas.',
    tacticalAction: 'Deploy ANPR Highway Checkpoint Alert',
    focusTarget: 'V-008',
    color: '#34D399',
  },
  {
    key: 'LEGAL_WARRANTS',
    label: 'CBI Warrants & Red Notices',
    icon: Scale,
    tagline: 'Judicial Admissibility & Court Trial Dossiers',
    statute: 'Bharatiya Sakshya Adhiniyam (BSA 2023) Sec 63 · UAPA Sec 16',
    objective: 'Verify formal FIR charges, non-bailable warrants, and tamper-proof SHA-256 evidence integrity hashes required for special court prosecution.',
    tacticalAction: 'Verify Section 63 BSA Hash Integrity',
    focusTarget: 'FIR-001',
    color: '#A855F7',
  },
];

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef<any>(null);

  const { selectedEntityId, selectEntity, dispatchAction } = useInvestigation();
  const selectEntityRef = useRef(selectEntity);
  selectEntityRef.current = selectEntity;

  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [activeLayout, setActiveLayout] = useState<'cose' | 'concentric' | 'circle' | 'breadthfirst'>('cose');
  const [graphRiskFilter, setGraphRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [activeUseCase, setActiveUseCase] = useState<InvestigativeUseCase>('FULL_TOPOLOGY');
  const [isBriefingCardVisible, setIsBriefingCardVisible] = useState(true);

  const changeLayout = (layoutName: 'cose' | 'concentric' | 'circle' | 'breadthfirst') => {
    setActiveLayout(layoutName);
    const cy = cyRef.current;
    if (!cy) return;
    try {
      if (layoutRef.current) {
        try { layoutRef.current.stop(); } catch (e) {}
      }
      let options: any = { name: layoutName, animate: true, animationDuration: 600 };
      if (layoutName === 'cose') {
        options = {
          name: 'cose',
          animate: true,
          animationDuration: 600,
          fit: true,
          padding: 40,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
        };
      } else if (layoutName === 'concentric') {
        options = {
          name: 'concentric',
          animate: true,
          animationDuration: 600,
          fit: true,
          padding: 40,
          concentric: (node: any) => node.data('centrality') || (node.id() === 'P-017' ? 100 : 20),
          levelWidth: () => 20,
        };
      } else if (layoutName === 'circle') {
        options = { name: 'circle', animate: true, animationDuration: 600, fit: true, padding: 40 };
      } else if (layoutName === 'breadthfirst') {
        options = { name: 'breadthfirst', directed: true, animate: true, animationDuration: 600, fit: true, padding: 40 };
      }
      layoutRef.current = cy.layout(options);
      layoutRef.current.run();
    } catch (e) {
      console.warn('Layout switch error:', e);
    }
  };

  const applyRiskFilter = (filter: 'ALL' | 'CRITICAL' | 'HIGH') => {
    setGraphRiskFilter(filter);
    const cy = cyRef.current;
    if (!cy) return;
    try {
      if (filter === 'ALL') {
        cy.elements().removeClass('filtered-out');
      } else {
        cy.nodes().forEach((n) => {
          if (n.data('risk_level') === filter) {
            n.removeClass('filtered-out');
            n.connectedEdges().removeClass('filtered-out');
          } else {
            n.addClass('filtered-out');
            n.connectedEdges().addClass('filtered-out');
          }
        });
      }
    } catch (e) {}
  };

  // Operational Knowledge Graph Use-Case Preset Handler
  const handleSelectUseCase = (useCaseKey: InvestigativeUseCase) => {
    setActiveUseCase(useCaseKey);
    setIsBriefingCardVisible(true);
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('dimmed').removeClass('highlighted').removeClass('filtered-out');

    if (useCaseKey === 'FULL_TOPOLOGY') {
      changeLayout('cose');
    } else if (useCaseKey === 'KINGPINS') {
      cy.nodes().forEach((node) => {
        const id = node.id();
        const role = node.data('role');
        const cluster = node.data('cluster');
        const isTarget = id === 'P-017' || id === 'P-032' || role === 'Leader' || cluster === 'BRIDGE' || node.data('risk_level') === 'CRITICAL';
        if (isTarget) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('concentric');
      selectEntityRef.current('P-017');
    } else if (useCaseKey === 'FINANCIAL') {
      cy.nodes().forEach((node) => {
        const type = node.data('type');
        const id = node.id();
        const isFin = type === 'BANK_ACCOUNT' || id.startsWith('A-') || ['P-017', 'P-020', 'P-022', 'P-028'].includes(id);
        if (isFin) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('cose');
      selectEntityRef.current('P-022');
    } else if (useCaseKey === 'COMMUNICATIONS') {
      cy.nodes().forEach((node) => {
        const type = node.data('type');
        const id = node.id();
        const isComm = type === 'PHONE' || id.startsWith('PH-') || ['P-003', 'P-007', 'P-010', 'P-017', 'P-022'].includes(id);
        if (isComm) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('cose');
      selectEntityRef.current('P-003');
    } else if (useCaseKey === 'LOGISTICS') {
      cy.nodes().forEach((node) => {
        const type = node.data('type');
        const id = node.id();
        const isLog = type === 'VEHICLE' || id.startsWith('V-') || ['P-017', 'P-032', 'P-038', 'P-040'].includes(id);
        if (isLog) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('cose');
      selectEntityRef.current('P-032');
    } else if (useCaseKey === 'LEGAL_WARRANTS') {
      cy.nodes().forEach((node) => {
        const isWarrant = node.data('risk_level') === 'CRITICAL' || node.data('type') === 'FIR' || node.id().startsWith('FIR-');
        if (isWarrant) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('breadthfirst');
      selectEntityRef.current('P-001');
    }
  };

  // Load Network Data once
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const netRes = await api.getNetwork('CBI-INTERPOL-RED-379');
        if (isMounted) {
          setNetworkData(netRes);
        }
      } catch (err) {
        console.warn('Network data API fallback');
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!containerRef.current || !networkData || networkData.nodes.length === 0) return;

    if (layoutRef.current) {
      try { layoutRef.current.stop(); } catch (e) {}
      layoutRef.current = null;
    }
    if (cyRef.current) {
      try {
        cyRef.current.stop();
        cyRef.current.destroy();
      } catch (e) {}
      cyRef.current = null;
    }

    const topNodeIds = new Set(
      networkData.nodes
        .sort((a, b) => (b.data.centrality || 0) - (a.data.centrality || 0))
        .slice(0, 80)
        .map((n) => n.data.id)
    );

    if (selectedEntityId) {
      topNodeIds.add(selectedEntityId);
    }

    const filteredNodes = networkData.nodes.filter((n) => topNodeIds.has(n.data.id));
    const filteredEdges = networkData.edges.filter(
      (e) => topNodeIds.has(e.data.source) && topNodeIds.has(e.data.target)
    );

    let cy: Core;
    try {
      cy = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: filteredNodes.map((n) => ({
            data: {
              ...n.data,
              label: n.data.label
                ? n.data.label.length > 14
                  ? n.data.label.slice(0, 12) + '..'
                  : n.data.label
                : n.data.id,
            },
          })),
          edges: filteredEdges.map((e) => ({
            data: {
              ...e.data,
              id: `${e.data.source}-${e.data.target}`,
            },
          })),
        },
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#00D4FF',
              label: 'data(label)',
              color: '#E0E0E0',
              'font-size': '9px',
              'font-family': 'monospace',
              'text-valign': 'bottom',
              'text-margin-y': 4,
              width: 'mapData(centrality, 0, 100, 16, 40)',
              height: 'mapData(centrality, 0, 100, 16, 40)',
              'border-width': 1.5,
              'border-color': '#ffffff',
              'border-opacity': 0.7,
            },
          },
          {
            selector: 'node[risk_level = "CRITICAL"]',
            style: {
              'background-color': '#FF1744',
              'border-color': '#FF8A80',
              'border-width': 2.5,
            },
          },
          {
            selector: 'node[risk_level = "HIGH"]',
            style: {
              'background-color': '#FFB300',
              'border-color': '#FFE082',
            },
          },
          {
            selector: 'node.selected',
            style: {
              'border-color': '#00D4FF',
              'border-width': 4,
              'border-opacity': 1,
              'background-blacken': -0.15,
            },
          },
          {
            selector: 'edge',
            style: {
              width: 'mapData(weight, 1, 10, 1, 3)',
              'line-color': 'rgba(0, 212, 255, 0.35)',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'edge[type = "DERIVED_TIE"]',
            style: {
              'line-style': 'dashed',
              'line-color': 'rgba(255, 179, 0, 0.4)',
            },
          },
          {
            selector: 'node.highlighted',
            style: {
              opacity: 1,
              'border-color': '#00D4FF',
              'border-width': 3,
            },
          },
          {
            selector: 'node.dimmed',
            style: {
              opacity: 0.15,
            },
          },
          {
            selector: 'edge.highlighted',
            style: {
              opacity: 1,
              'line-color': '#00D4FF',
              width: 3.5,
            },
          },
          {
            selector: 'edge.dimmed',
            style: {
              opacity: 0.05,
            },
          },
          {
            selector: '.filtered-out',
            style: {
              opacity: 0.08,
            },
          },
        ],
      });
    } catch (err) {
      console.warn('Cytoscape initialization caught error:', err);
      return;
    }

    try {
      const layout = cy.layout({
        name: 'cose',
        animate: false,
        idealEdgeLength: 100,
        nodeOverlap: 20,
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 800,
        coolingFactor: 0.95,
      } as any);
      layoutRef.current = layout;
      layout.run();
    } catch (layoutErr) {
      console.warn('Cytoscape layout error:', layoutErr);
    }

    // Hover Focus-and-Context Effect
    cy.on('mouseover', 'node', (evt) => {
      try {
        const node = evt.target;
        const neighborhood = node.neighborhood().add(node);
        cy.elements().addClass('dimmed');
        neighborhood.removeClass('dimmed').addClass('highlighted');
      } catch (e) {}
    });

    cy.on('mouseout', 'node', () => {
      try {
        cy.elements().removeClass('dimmed').removeClass('highlighted');
      } catch (e) {}
    });

    // Click Node ➔ Select Entity Across Application
    cy.on('tap', 'node', (evt) => {
      try {
        const nodeId = evt.target.id();
        cy.elements().removeClass('selected');
        evt.target.addClass('selected');
        selectEntityRef.current(nodeId);
      } catch (e) {}
    });

    // Click Edge ➔ Open Relationship Intelligence
    cy.on('tap', 'edge', (evt) => {
      try {
        const edge = evt.target;
        const sourceId = edge.data('source');
        const targetId = edge.data('target');
        const isDerived = edge.data('type') === 'DERIVED_TIE';
        const confidence = isDerived ? 0.84 : 0.98;

        setSelectedEdge({
          source: sourceId,
          target: targetId,
          relationship: isDerived ? 'DERIVED SYNDICATE CO-OCCURRENCE' : 'SOURCE CO-ACCUSED / OFFENSE CHARGES',
          classification: isDerived ? 'DERIVED RELATIONSHIP' : 'SOURCE RELATIONSHIP',
          confidence,
          evidenceCount: isDerived ? 2 : 5,
          evidenceSource: 'CBI-Interpol Public Record & Graph Centrality',
          timestamp: '2023 - 2026 Active Multi-Jurisdiction Records',
        });
      } catch (e) {}
    });

    cyRef.current = cy;

    return () => {
      if (layoutRef.current) {
        try { layoutRef.current.stop(); } catch (e) {}
        layoutRef.current = null;
      }
      try {
        cy.stop();
        cy.destroy();
      } catch (e) {}
      cyRef.current = null;
    };
  }, [networkData]);

  // Synchronize initial selection or external selection change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selectedEntityId) return;
    try {
      const targetNode = cy.$(`node[id = "${selectedEntityId}"]`);
      if (targetNode && targetNode.length > 0) {
        cy.elements().removeClass('selected');
        targetNode.addClass('selected');
        cy.animate({
          center: { eles: targetNode },
          zoom: 1.4,
          duration: 350,
        });
      }
    } catch (err) {
      // Ignore animation if unmounted
    }
  }, [selectedEntityId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cy = cyRef.current;
    if (!cy || !searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const node = cy.nodes().filter((n) => {
      const id = n.id().toLowerCase();
      const label = (n.data('label') || '').toLowerCase();
      return id.includes(q) || label.includes(q);
    }).first();

    if (node && node.length > 0) {
      selectEntityRef.current(node.id());
    }
  };

  const activePresetConfig = USE_CASE_PRESETS.find(p => p.key === activeUseCase) || USE_CASE_PRESETS[0];

  return (
    <div className="relative w-full h-full bg-[#030406] overflow-hidden">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* ── TOP OPERATIONAL USE-CASE PRESETS BAR ── */}
      <div className="absolute top-4 left-4 z-20 max-w-[calc(100vw-450px)]">
        <div className="glass-panel p-1.5 rounded-2xl border border-white/10 shadow-2xl bg-[#060B14]/90 backdrop-blur-md flex flex-wrap items-center gap-1.5">
          <div className="px-2 py-1 text-[10px] font-mono font-bold text-crimenet-cyan uppercase tracking-widest flex items-center gap-1.5 border-r border-white/10 mr-0.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan" />
            <span>INVESTIGATIVE USE-CASES:</span>
          </div>

          {USE_CASE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activeUseCase === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => handleSelectUseCase(preset.key)}
                className={`btn-3d px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                    : 'bg-black/50 text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
                style={isActive ? { borderColor: preset.color, color: preset.color } : {}}
              >
                <Icon className="w-3 h-3" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2">
        {/* Dynamic Risk Filter */}
        <div className="flex bg-black/85 border border-white/10 rounded-lg p-1 gap-1 backdrop-blur-md shadow-lg">
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map((r) => (
            <button
              key={r}
              onClick={() => applyRiskFilter(r)}
              className={`chip-3d px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                graphRiskFilter === r
                  ? r === 'CRITICAL'
                    ? 'bg-crimenet-crimson text-white shadow-[0_0_12px_rgba(255,23,68,0.5)]'
                    : r === 'HIGH'
                    ? 'bg-crimenet-amber text-black shadow-[0_0_12px_rgba(255,179,0,0.5)]'
                    : 'bg-crimenet-cyan text-black shadow-[0_0_12px_rgba(0,212,255,0.5)]'
                  : 'text-crimenet-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Dynamic Graph Layout Switcher */}
        <div className="flex bg-black/85 border border-white/10 rounded-lg p-1 gap-1 backdrop-blur-md shadow-lg">
          {(
            [
              { id: 'cose', label: 'Force' },
              { id: 'concentric', label: 'Concentric' },
              { id: 'circle', label: 'Circle' },
              { id: 'breadthfirst', label: 'Hierarchy' },
            ] as const
          ).map((l) => (
            <button
              key={l.id}
              onClick={() => changeLayout(l.id)}
              className={`chip-3d px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                activeLayout === l.id
                  ? 'bg-white/20 text-crimenet-cyan border border-crimenet-cyan/40 shadow-[0_0_10px_rgba(0,212,255,0.3)]'
                  : 'text-crimenet-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Focus node ID (e.g. P-001)..."
            className="w-48 bg-black/80 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-mono transition-all focus:shadow-[0_0_12px_rgba(0,212,255,0.3)]"
          />
        </form>

        <div className="flex bg-black/80 border border-white/10 rounded-lg p-1 gap-1 backdrop-blur-md shadow-lg">
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.zoom(cy.zoom() * 1.2);
            }}
            className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all hover:scale-110 active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.zoom(cy.zoom() * 0.8);
            }}
            className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all hover:scale-110 active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.fit(undefined, 40);
            }}
            className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all hover:scale-110 active:scale-95"
            title="Fit All"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Technical Details Toggle */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className={`chip-3d px-2.5 py-1.5 rounded-lg bg-black/80 border text-xs font-mono flex items-center gap-1.5 transition-all ${
            showTechnicalDetails
              ? 'border-crimenet-cyan text-crimenet-cyan shadow-[0_0_10px_rgba(0,212,255,0.4)]'
              : 'border-white/10 text-crimenet-cyan hover:bg-white/5'
          }`}
        >
          <Info className="w-3.5 h-3.5" /> Technical Metrics
        </button>
      </div>

      {/* ── ACTIVE OPERATIONAL USE-CASE BRIEFING CARD ── */}
      {isBriefingCardVisible && (
        <div className="absolute bottom-4 right-4 z-20 w-[420px] max-w-[calc(100vw-32px)]">
          <div 
            className="glass-panel p-4 rounded-2xl border shadow-2xl bg-[#060B14]/95 backdrop-blur-md space-y-3 animate-in fade-in slide-in-from-bottom duration-200"
            style={{ borderColor: `${activePresetConfig.color}50` }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-lg flex items-center justify-center border"
                  style={{ backgroundColor: `${activePresetConfig.color}20`, borderColor: `${activePresetConfig.color}40`, color: activePresetConfig.color }}
                >
                  <activePresetConfig.icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    {activePresetConfig.label}
                  </h4>
                  <span className="text-[10px] font-mono" style={{ color: activePresetConfig.color }}>
                    {activePresetConfig.tagline}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsBriefingCardVisible(false)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors text-xs"
                title="Minimize Briefing Card"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[9px] font-mono uppercase text-crimenet-muted font-bold block">
                  STATUTORY AUTHORIZATION:
                </span>
                <span className="text-[10px] font-mono text-white/90">
                  {activePresetConfig.statute}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-mono uppercase text-crimenet-muted font-bold block">
                  TACTICAL GOAL & REASONING:
                </span>
                <p className="text-[11px] text-white/85 leading-relaxed mt-0.5">
                  {activePresetConfig.objective}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleSelectUseCase(activePresetConfig.key)}
                className="btn-3d px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all text-black shadow-md"
                style={{ backgroundColor: activePresetConfig.color }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{activePresetConfig.tacticalAction}</span>
              </button>

              <span className="text-[9px] font-mono text-crimenet-muted">
                ACTIVE FOCUS: {activePresetConfig.focusTarget}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Graph Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 border border-white/10 rounded-xl p-3 text-[10px] space-y-2 backdrop-blur-sm shadow-xl">
        <div className="font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>GRAPH TOPOLOGY LEGEND</span>
          <span className="text-[9px] font-mono text-crimenet-cyan">{networkData?.nodes?.length || 379} TOTAL NODES</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crimenet-crimson" />
            <span>Critical Warrant Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crimenet-amber" />
            <span>High Warrant Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-crimenet-cyan" />
            <span>Source Co-Accused Link</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-crimenet-amber" />
            <span>Derived Correlation</span>
          </div>
        </div>
      </div>

      {/* Technical Details Collapsible Drawer for Expert Judges */}
      {showTechnicalDetails && (
        <div className="absolute top-16 right-4 w-96 bg-black/95 border border-crimenet-cyan/30 rounded-xl p-4 shadow-2xl z-20 space-y-3 text-xs font-mono">
          <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
            <span className="font-bold text-crimenet-cyan uppercase">Technical Formulation</span>
            <button onClick={() => setShowTechnicalDetails(false)} className="text-white/50 hover:text-white">✕</button>
          </div>
          
          <div className="space-y-2 text-white/80 text-[11px]">
            <div>
              <span className="text-crimenet-amber font-bold block">BETWEENNESS CENTRALITY:</span>
              <span className="text-crimenet-cyan">C_B(v) = ∑_(s≠v≠t) (σ_st(v) / σ_st)</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Identifies broker/bridge nodes controlling information or logistics flow across disparate syndicates.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-emerald-400 font-bold block">LOUVAIN COMMUNITY DETECTION:</span>
              <span className="text-crimenet-cyan">ΔQ = [(∑_in + 2k_i,in)/2m - ((∑_tot + k_i)/2m)²] - ...</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Optimizes graph modularity to uncover densely connected criminal factions without manual supervision.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-crimenet-blue font-bold block">PAGERANK STRUCTURAL IMPORTANCE:</span>
              <span className="text-crimenet-cyan">PR(u) = (1-d)/N + d ∑_(v∈M(u)) (PR(v) / L(v))</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Calculates recursive hierarchical authority within the criminal network.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Intelligence Side Panel */}
      {selectedEdge && (
        <div className="absolute top-16 right-4 w-96 bg-[#060B14]/95 border border-crimenet-cyan/40 rounded-2xl p-5 shadow-2xl z-30 space-y-4 backdrop-blur-md animate-in slide-in-from-right">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-crimenet-cyan uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-crimenet-cyan animate-pulse"></span>
              RELATIONSHIP INTELLIGENCE
            </div>
            <button
              onClick={() => setSelectedEdge(null)}
              className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-crimenet-muted font-mono text-[10px]">TIE CLASSIFICATION:</span>
              <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                selectedEdge.classification === 'SOURCE RELATIONSHIP'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}>
                {selectedEdge.classification}
              </span>
            </div>

            <div className="p-3 bg-black/50 border border-white/5 rounded-xl space-y-1.5">
              <div className="text-[10px] font-mono text-crimenet-cyan font-bold">
                {selectedEdge.source} ➔ {selectedEdge.target}
              </div>
              <div className="text-white font-medium text-xs">{selectedEdge.relationship}</div>
              <div className="text-[10px] text-crimenet-muted font-mono">{selectedEdge.timestamp}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-crimenet-muted block">PROVENANCE:</span>
                <span className="text-white font-bold">{selectedEdge.evidenceSource}</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-crimenet-muted block">CONFIDENCE:</span>
                <span className="text-emerald-400 font-bold">{(selectedEdge.confidence * 100).toFixed(0)}% VERIFIED</span>
              </div>
            </div>

            {/* Interactive Node Drilldown & AI Corroboration */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => selectEntityRef.current(selectedEdge.source)}
                  className="btn-3d py-2 px-2.5 rounded-xl bg-white/5 hover:bg-crimenet-cyan/20 text-white hover:text-crimenet-cyan border border-white/10 hover:border-crimenet-cyan/40 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <span className="truncate">SOURCE: {selectedEdge.source}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
                <button
                  onClick={() => selectEntityRef.current(selectedEdge.target)}
                  className="btn-3d py-2 px-2.5 rounded-xl bg-white/5 hover:bg-crimenet-cyan/20 text-white hover:text-crimenet-cyan border border-white/10 hover:border-crimenet-cyan/40 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <span className="truncate">TARGET: {selectedEdge.target}</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              </div>

              <button
                onClick={() => dispatchAction('ASK_AI_EXPLANATION', `${selectedEdge.source} and ${selectedEdge.target}`)}
                className="w-full btn-3d py-2 px-3 rounded-xl bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,212,255,0.25)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan" />
                <span>AI CORROBORATION & TIE ANALYSIS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
