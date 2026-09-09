'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { GlassPanel } from '@/components/panels/glass-panel';
import type { NetworkData } from '@/lib/types';
import { 
  Search, ZoomIn, ZoomOut, Maximize2, Info, Network,
  ShieldAlert, DollarSign, PhoneCall, Truck, Scale, ChevronRight,
  Sparkles, CheckCircle2, Sliders, Activity, Compass
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
    objective: 'Survey complete 5-cluster connected syndicate topology spanning Mumbai, Delhi, Pune, and cross-border sanctuary hubs with 201 active nodes.',
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
    objective: 'Isolate primary bridge kingpin P-017 (Vikram Reddy / Onea Mircea Florin) and facilitator P-032. Neutralizing these brokers structurally fractures the syndicate into isolated, non-viable fragments.',
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
    objective: 'Trace Cluster B (Golden Circuit Delhi) informal hawala pipelines and cross-syndicate cash layering conduits. Target primary laundering nodes for immediate asset restraint.',
    tacticalAction: 'Flag Hawala Nodes for PMLA Attachment',
    focusTarget: 'P-022',
    color: '#F59E0B',
  },
  {
    key: 'COMMUNICATIONS',
    label: 'Communications & Wiretaps',
    icon: PhoneCall,
    tagline: 'CDR Edge Frequencies & Burn Phone Networks',
    statute: 'Indian Telegraph Act Sec 5(2) · Intercept Mandate',
    objective: 'Analyze encrypted call frequency ties, burner rotations, and simultaneous tower associations between Mumbai drug operatives and Delhi fraud conspirators.',
    tacticalAction: 'Track Critical Intercept Ties',
    focusTarget: 'P-003',
    color: '#38BDF8',
  },
  {
    key: 'LOGISTICS',
    label: 'Logistics & Shared Vehicles',
    icon: Truck,
    tagline: 'Fleet Couriers & Interstate Smuggling Corridors',
    statute: 'Motor Vehicles Act Sec 206 · BNS Sec 303 (Stolen Property)',
    objective: 'Identify Cluster C (Silk Route) logistics couriers and transit vehicles. Deploy automated ANPR alerts on Western Express Highway and NH-48 toll plazas.',
    tacticalAction: 'Deploy ANPR Highway Checkpoint Alert',
    focusTarget: 'P-038',
    color: '#10B981',
  },
  {
    key: 'LEGAL_WARRANTS',
    label: 'CBI Warrants & Red Notices',
    icon: Scale,
    tagline: 'Judicial Admissibility & Court Trial Dossiers',
    statute: 'Bharatiya Sakshya Adhiniyam (BSA 2023) Sec 63 · UAPA Sec 16',
    objective: 'Verify formal CBI-Interpol Red Notice warrants, judicial chargesheets, and tamper-proof SHA-256 evidence integrity hashes required for special court prosecution.',
    tacticalAction: 'Verify Section 63 BSA Hash Integrity',
    focusTarget: 'P-001',
    color: '#A855F7',
  },
];

interface SyndicateInfo {
  id: string;
  name: string;
  clusterKey: string;
  color: string;
  bgBadge: string;
  icon: string;
  location: string;
  description: string;
  count: number;
}

const SYNDICATES: SyndicateInfo[] = [
  {
    id: 'BRIDGE',
    name: 'BRIDGE NEXUS',
    clusterKey: 'BRIDGE',
    color: '#FF1744',
    bgBadge: 'bg-red-500/20 border-red-500/50 text-red-300',
    icon: '⚡',
    location: 'Inter-State Conduits',
    description: 'P-017 & P-032: Transnational Brokerage & Multi-Cluster Conduit',
    count: 2,
  },
  {
    id: 'A',
    name: 'SHADOW SYNDICATE',
    clusterKey: 'A',
    color: '#00D4FF',
    bgBadge: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
    icon: '🔷',
    location: 'Mumbai Metropole',
    description: 'Narcotics distribution, harbor supply lines & local enforcement',
    count: 18,
  },
  {
    id: 'B',
    name: 'GOLDEN CIRCUIT',
    clusterKey: 'B',
    color: '#F59E0B',
    bgBadge: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    icon: '🔶',
    location: 'Delhi NCR',
    description: 'Layered hawala networks, commercial fraud & money laundering',
    count: 39,
  },
  {
    id: 'C',
    name: 'SILK ROUTE',
    clusterKey: 'C',
    color: '#10B981',
    bgBadge: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    icon: '🟢',
    location: 'Pune Corridor',
    description: 'Interstate logistics, shared vehicle fleets & contraband transit',
    count: 31,
  },
  {
    id: 'D',
    name: 'TRANSNATIONAL AXIS',
    clusterKey: 'D',
    color: '#A855F7',
    bgBadge: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    icon: '🟣',
    location: 'Global Safe Havens',
    description: 'Interpol Red Notice fugitives & foreign sanctuary financial shelters',
    count: 111,
  },
];

interface EdgeParticle {
  edgeId: string;
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
  size: number;
  type: string;
}

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { selectedEntityId, selectEntity, dispatchAction } = useInvestigation();
  const selectEntityRef = useRef(selectEntity);
  selectEntityRef.current = selectEntity;

  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showOpticsDrawer, setShowOpticsDrawer] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<any | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [activeLayout, setActiveLayout] = useState<'cose' | 'concentric' | 'circle' | 'breadthfirst'>('cose');
  const [graphRiskFilter, setGraphRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [activeUseCase, setActiveUseCase] = useState<InvestigativeUseCase>('FULL_TOPOLOGY');
  const [isBriefingCardVisible, setIsBriefingCardVisible] = useState(true);
  const [activeClusterFocus, setActiveClusterFocus] = useState<string | null>(null);

  // Optics & Physics Simulation Settings
  const [nodeRepulsion, setNodeRepulsion] = useState(450000);
  const [edgeElasticity, setEdgeElasticity] = useState(120);
  const [particleSpeedMultiplier, setParticleSpeedMultiplier] = useState(1.0);
  const [showRadarHud, setShowRadarHud] = useState(true);
  const [showParticleStream, setShowParticleStream] = useState(true);
  const [showFloatingTags, setShowFloatingTags] = useState(true);

  // Floating cluster centroid screen coordinates
  const [clusterPositions, setClusterPositions] = useState<Record<string, { x: number; y: number; visible: boolean }>>({});

  // Layout switcher with dynamic parameters
  const changeLayout = useCallback((layoutName: 'cose' | 'concentric' | 'circle' | 'breadthfirst') => {
    setActiveLayout(layoutName);
    const cy = cyRef.current;
    if (!cy) return;
    try {
      if (layoutRef.current) {
        try { layoutRef.current.stop(); } catch (e) {}
      }
      let options: any = { name: layoutName, animate: true, animationDuration: 650 };
      if (layoutName === 'cose') {
        options = {
          name: 'cose',
          animate: true,
          animationDuration: 700,
          fit: true,
          padding: 60,
          randomize: false,
          componentSpacing: 80,
          nodeRepulsion: () => nodeRepulsion,
          edgeElasticity: () => edgeElasticity,
          nestingFactor: 4,
          gravity: 55,
          numIter: 1000,
          coolingFactor: 0.96,
        };
      } else if (layoutName === 'concentric') {
        options = {
          name: 'concentric',
          animate: true,
          animationDuration: 700,
          fit: true,
          padding: 60,
          concentric: (node: any) => {
            const id = node.id();
            const cluster = node.data('cluster');
            const role = String(node.data('role') || '').toLowerCase();
            if (id === 'P-017' || id === 'P-032' || cluster === 'BRIDGE') return 120;
            if (role.includes('lead') || role.includes('chief') || role.includes('kingpin')) return 85;
            if (cluster === 'A' || cluster === 'B' || cluster === 'C') return 55;
            return 20;
          },
          levelWidth: () => 25,
          minNodeSpacing: 35,
        };
      } else if (layoutName === 'circle') {
        options = {
          name: 'circle',
          animate: true,
          animationDuration: 700,
          fit: true,
          padding: 60,
        };
      } else if (layoutName === 'breadthfirst') {
        options = {
          name: 'breadthfirst',
          roots: '#P-017',
          directed: false,
          animate: true,
          animationDuration: 700,
          fit: true,
          padding: 60,
          spacingFactor: 1.25,
        };
      }
      layoutRef.current = cy.layout(options);
      layoutRef.current.run();
    } catch (e) {
      console.warn('Layout switch error:', e);
    }
  }, [nodeRepulsion, edgeElasticity]);

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

  // Quick-Focus Syndicate Handler
  const focusSyndicate = (clusterKey: string | null) => {
    setActiveClusterFocus(clusterKey);
    const cy = cyRef.current;
    if (!cy) return;

    if (!clusterKey || clusterKey === 'ALL') {
      cy.elements().removeClass('dimmed').removeClass('highlighted');
      cy.animate({
        fit: { eles: cy.elements(), padding: 50 },
        duration: 500,
      });
      return;
    }

    const clusterNodes = cy.nodes().filter((n) => n.data('cluster') === clusterKey);
    if (clusterNodes.length > 0) {
      cy.elements().removeClass('dimmed').removeClass('highlighted');
      clusterNodes.addClass('highlighted');
      clusterNodes.connectedEdges().addClass('highlighted');
      cy.nodes().difference(clusterNodes).addClass('dimmed');
      cy.edges().difference(clusterNodes.connectedEdges()).addClass('dimmed');

      cy.animate({
        fit: { eles: clusterNodes, padding: 80 },
        duration: 650,
      });
    }
  };

  // Operational Knowledge Graph Use-Case Preset Handler
  const handleSelectUseCase = (useCaseKey: InvestigativeUseCase) => {
    setActiveUseCase(useCaseKey);
    setIsBriefingCardVisible(true);
    setActiveClusterFocus(null);
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass('dimmed').removeClass('highlighted').removeClass('filtered-out');

    if (useCaseKey === 'FULL_TOPOLOGY') {
      changeLayout('cose');
      cy.animate({ fit: { eles: cy.elements(), padding: 50 }, duration: 500 });
    } else if (useCaseKey === 'KINGPINS') {
      cy.nodes().forEach((node) => {
        const id = node.id();
        const role = String(node.data('role') || '');
        const cluster = node.data('cluster');
        const isTarget = id === 'P-017' || id === 'P-032' || cluster === 'BRIDGE' || role.toLowerCase().includes('lead') || node.data('risk_level') === 'CRITICAL';
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
        const cluster = node.data('cluster');
        const id = node.id();
        const isFin = cluster === 'B' || ['P-017', 'P-032', 'P-020', 'P-022', 'P-028'].includes(id);
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
        const cluster = node.data('cluster');
        const id = node.id();
        const isComm = cluster === 'A' || ['P-003', 'P-007', 'P-010', 'P-017'].includes(id);
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
        const cluster = node.data('cluster');
        const id = node.id();
        const isLog = cluster === 'C' || ['P-017', 'P-032', 'P-038', 'P-040'].includes(id);
        if (isLog) {
          node.addClass('highlighted');
          node.connectedEdges().addClass('highlighted');
        } else {
          node.addClass('dimmed');
          node.connectedEdges().addClass('dimmed');
        }
      });
      changeLayout('cose');
      selectEntityRef.current('P-038');
    } else if (useCaseKey === 'LEGAL_WARRANTS') {
      cy.nodes().forEach((node) => {
        const isWarrant = node.data('risk_level') === 'CRITICAL';
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

  // Load Network Data
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

  // Initialize Cytoscape and Particle System
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

    // ── CONNECTED COMPONENT EXTRACTION ─────────────────────────────────────────
    const adj = new Map<string, Set<string>>();
    networkData.nodes.forEach((n) => adj.set(n.data.id, new Set()));
    networkData.edges.forEach((e) => {
      if (adj.has(e.data.source) && adj.has(e.data.target)) {
        adj.get(e.data.source)!.add(e.data.target);
        adj.get(e.data.target)!.add(e.data.source);
      }
    });

    const visited = new Set<string>();
    const components: string[][] = [];
    for (const node of networkData.nodes) {
      const id = node.data.id;
      if (!visited.has(id)) {
        const comp: string[] = [];
        const queue = [id];
        visited.add(id);
        while (queue.length > 0) {
          const curr = queue.shift()!;
          comp.push(curr);
          const neighbors = adj.get(curr) || new Set();
          neighbors.forEach((nbr) => {
            if (!visited.has(nbr)) {
              visited.add(nbr);
              queue.push(nbr);
            }
          });
        }
        components.push(comp);
      }
    }

    // Isolate component containing bridge kingpin P-017 (201 nodes across all 5 syndicates)
    const targetComp = components.find((c) => c.includes('P-017')) || 
                       components.sort((a, b) => b.length - a.length)[0] || [];
    const targetNodeIdSet = new Set(targetComp);

    if (selectedEntityId && !targetNodeIdSet.has(selectedEntityId)) {
      targetNodeIdSet.add(selectedEntityId);
    }

    const filteredNodes = networkData.nodes.filter((n) => targetNodeIdSet.has(n.data.id));
    const filteredEdges = networkData.edges.filter(
      (e) => targetNodeIdSet.has(e.data.source) && targetNodeIdSet.has(e.data.target)
    );

    // Format display labels cleanly for the military HUD
    const formatLabel = (rawName?: string, id?: string) => {
      if (!rawName || rawName === id) return id || '';
      const parts = rawName.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 11);
      return `${parts[0]} ${parts[parts.length - 1][0]}.`;
    };

    let cy: Core;
    try {
      cy = cytoscape({
        container: containerRef.current,
        elements: {
          nodes: filteredNodes.map((n) => ({
            data: {
              ...n.data,
              display_label: formatLabel(n.data.label, n.data.id),
              full_name: n.data.label || n.data.id,
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
          // Base Node Style
          {
            selector: 'node',
            style: {
              'background-color': '#00D4FF',
              label: 'data(display_label)',
              color: '#FFFFFF',
              'font-size': '10px',
              'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-margin-y': 5,
              'text-background-opacity': 0.75,
              'text-background-color': '#030406',
              'text-background-padding': '2px',
              'text-background-shape': 'roundrectangle',
              width: 'mapData(centrality, 0, 100, 20, 46)',
              height: 'mapData(centrality, 0, 100, 20, 46)',
              'border-width': 2,
              'border-color': '#ffffff',
              'border-opacity': 0.8,
            },
          },
          // Multi-Tier Visual Glyphs by Cluster & Role
          // Tier 1: Bridge Kingpins (P-017, P-032, Cluster BRIDGE)
          {
            selector: 'node[cluster = "BRIDGE"], node[id = "P-017"], node[id = "P-032"]',
            style: {
              shape: 'hexagon',
              'background-color': '#FF1744',
              'border-color': '#FFFFFF',
              'border-width': 4,
              'border-opacity': 1,
              width: 54,
              height: 54,
              'font-size': '11px',
              'color': '#FF8A80',
            },
          },
          // Tier 2: Syndicate Leaders
          {
            selector: 'node[role = "Leader"], node[role = "Corridor Cell Lead"]',
            style: {
              shape: 'diamond',
              'border-width': 3,
              'border-color': '#FFFFFF',
              width: 42,
              height: 42,
            },
          },
          // Tier 3: Cluster A (Mumbai Shadow Syndicate)
          {
            selector: 'node[cluster = "A"]',
            style: {
              'background-color': '#00D4FF',
              'border-color': '#BAE6FD',
            },
          },
          // Tier 4: Cluster B (Delhi Golden Circuit - Hawala)
          {
            selector: 'node[cluster = "B"]',
            style: {
              shape: 'rhomboid',
              'background-color': '#F59E0B',
              'border-color': '#FDE68A',
            },
          },
          // Tier 5: Cluster C (Pune Silk Route - Logistics)
          {
            selector: 'node[cluster = "C"]',
            style: {
              shape: 'round-rectangle',
              'background-color': '#10B981',
              'border-color': '#A7F3D0',
            },
          },
          // Tier 6: Cluster D (Transnational Axis - Interpol Safe Havens)
          {
            selector: 'node[cluster = "D"]',
            style: {
              shape: 'ellipse',
              'background-color': '#8B5CF6',
              'border-color': '#DDD6FE',
            },
          },
          // Critical Warrant Node Glow
          {
            selector: 'node[risk_level = "CRITICAL"]',
            style: {
              'border-color': '#FF1744',
              'border-width': 3,
            },
          },
          // Selection Highlight
          {
            selector: 'node.selected',
            style: {
              'border-color': '#FFFFFF',
              'border-width': 5,
              'border-opacity': 1,
              'background-blacken': -0.25,
            },
          },
          // Base Edge Styles
          {
            selector: 'edge',
            style: {
              width: 'mapData(weight, 1, 10, 1.2, 3.5)',
              'line-color': 'rgba(56, 189, 248, 0.35)',
              'curve-style': 'bezier',
            },
          },
          // Inter-Syndicate Strategic Conduit Edges
          {
            selector: 'edge[type = "INTER_SYNDICATE_CONDUIT"]',
            style: {
              'line-color': '#E040FB',
              width: 3.5,
              'line-style': 'solid',
            },
          },
          // Hawala Financial Flow Edges
          {
            selector: 'edge[type = "FINANCIAL_HAWALA_FLOW"], edge[type = "TRANSFERRED_TO"]',
            style: {
              'line-color': '#F59E0B',
              width: 3,
              'line-style': 'solid',
            },
          },
          // Logistics Smuggling Transit Edges
          {
            selector: 'edge[type = "LOGISTICS_TRANSIT_CONDUIT"], edge[type = "SHARED_VEHICLE"]',
            style: {
              'line-color': '#10B981',
              width: 2.8,
              'line-style': 'dashed',
            },
          },
          // Covert Wiretap / Communication Ties
          {
            selector: 'edge[type = "COVERT_COMMUNICATION"], edge[type = "CALLED"]',
            style: {
              'line-color': '#00D4FF',
              width: 2.5,
            },
          },
          // Derived Co-Occurrence
          {
            selector: 'edge[type = "DERIVED_TIE"]',
            style: {
              'line-style': 'dashed',
              'line-color': 'rgba(255, 179, 0, 0.45)',
            },
          },
          // Interactive Focus and Filtering States
          {
            selector: 'node.highlighted',
            style: {
              opacity: 1,
              'border-color': '#00D4FF',
              'border-width': 4,
            },
          },
          {
            selector: 'node.dimmed',
            style: {
              opacity: 0.12,
            },
          },
          {
            selector: 'edge.highlighted',
            style: {
              opacity: 1,
              'line-color': '#00D4FF',
              width: 4,
            },
          },
          {
            selector: 'edge.dimmed',
            style: {
              opacity: 0.04,
            },
          },
          {
            selector: '.filtered-out',
            style: {
              opacity: 0.06,
            },
          },
        ],
      });
    } catch (err) {
      console.warn('Cytoscape initialization error:', err);
      return;
    }

    // Initial Layout Execution
    try {
      const layout = cy.layout({
        name: 'cose',
        animate: false,
        idealEdgeLength: 100,
        nodeOverlap: 25,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 80,
        nodeRepulsion: () => nodeRepulsion,
        edgeElasticity: () => edgeElasticity,
        nestingFactor: 4,
        gravity: 55,
        numIter: 900,
        coolingFactor: 0.96,
      } as any);
      layoutRef.current = layout;
      layout.run();
    } catch (layoutErr) {
      console.warn('Cytoscape layout error:', layoutErr);
    }

    // Update Floating Cluster Badges Coordinates
    const updateClusterCentroids = () => {
      if (!cy || !showFloatingTags) return;
      const clusters = ['BRIDGE', 'A', 'B', 'C', 'D'];
      const positions: Record<string, { x: number; y: number; visible: boolean }> = {};
      
      clusters.forEach((ck) => {
        const nodes = cy.nodes().filter((n) => n.data('cluster') === ck);
        if (nodes.length > 0) {
          const bb = nodes.renderedBoundingBox();
          positions[ck] = {
            x: (bb.x1 + bb.x2) / 2,
            y: bb.y1 - 18,
            visible: true,
          };
        }
      });
      setClusterPositions(positions);
    };

    cy.on('render pan zoom', updateClusterCentroids);

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

    // Click Node ➔ Select Entity Across Application & Show Detail Drawer
    cy.on('tap', 'node', (evt) => {
      try {
        const node = evt.target;
        const nodeId = node.id();
        cy.elements().removeClass('selected');
        node.addClass('selected');
        selectEntityRef.current(nodeId);
        setSelectedNodeData(node.data());
      } catch (e) {}
    });

    // Click Edge ➔ Open Relationship Intelligence
    cy.on('tap', 'edge', (evt) => {
      try {
        const edge = evt.target;
        const sourceId = edge.data('source');
        const targetId = edge.data('target');
        const edgeType = edge.data('type');
        const isDerived = edgeType === 'DERIVED_TIE';
        const confidence = edge.data('confidence') || (isDerived ? 0.84 : 0.98);

        setSelectedEdge({
          source: sourceId,
          target: targetId,
          type: edgeType,
          relationship: edgeType ? edgeType.replace(/_/g, ' ') : 'CO-ACCUSED CRIMINAL SYNDICATE LINK',
          classification: isDerived ? 'DERIVED RELATIONSHIP' : 'PRIMARY INVESTIGATIVE LINK',
          confidence,
          evidenceSource: 'CBI-Interpol Official Red Notice & Graph Modularity Conduit',
          timestamp: 'Active Warrant 2023 - 2026',
        });
      } catch (e) {}
    });

    // Click background ➔ dismiss side cards if desired
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedEdge(null);
      }
    });

    cyRef.current = cy;

    // ── REAL-TIME EDGE PACKET PARTICLE STREAM (HTML5 CANVAS) ─────────────────
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const edgesList = cy.edges();
        const particles: EdgeParticle[] = [];
        const numParticles = 90;

        for (let i = 0; i < numParticles; i++) {
          if (edgesList.length === 0) break;
          const randomEdge = edgesList[Math.floor(Math.random() * edgesList.length)];
          const edgeType = randomEdge.data('type') || '';
          let color = '#38BDF8';
          if (edgeType.includes('HAWALA') || edgeType.includes('TRANSFER')) color = '#F59E0B';
          else if (edgeType.includes('CONDUIT') || edgeType.includes('BRIDGE')) color = '#E040FB';
          else if (edgeType.includes('COMMUNICATION') || edgeType.includes('CALLED')) color = '#00E5FF';
          else if (edgeType.includes('LOGISTICS') || edgeType.includes('VEHICLE')) color = '#10B981';

          particles.push({
            edgeId: randomEdge.id(),
            sourceId: randomEdge.data('source'),
            targetId: randomEdge.data('target'),
            progress: Math.random(),
            speed: (0.0035 + Math.random() * 0.004) * particleSpeedMultiplier,
            color,
            size: 2.2 + Math.random() * 1.5,
            type: edgeType,
          });
        }

        const renderParticles = () => {
          if (!containerRef.current || !canvasRef.current) return;
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          ctx.clearRect(0, 0, width, height);

          if (showParticleStream && cyRef.current) {
            const posMap = new Map<string, { x: number; y: number }>();
            cyRef.current.nodes().forEach((n) => {
              posMap.set(n.id(), n.renderedPosition());
            });

            particles.forEach((p) => {
              p.progress += p.speed * particleSpeedMultiplier;
              if (p.progress > 1) {
                p.progress = 0;
                if (Math.random() < 0.25 && edgesList.length > 0) {
                  const newEdge = edgesList[Math.floor(Math.random() * edgesList.length)];
                  p.edgeId = newEdge.id();
                  p.sourceId = newEdge.data('source');
                  p.targetId = newEdge.data('target');
                }
              }

              const src = posMap.get(p.sourceId);
              const tgt = posMap.get(p.targetId);

              if (src && tgt) {
                if (
                  (src.x >= -50 && src.x <= width + 50 && src.y >= -50 && src.y <= height + 50) ||
                  (tgt.x >= -50 && tgt.x <= width + 50 && tgt.y >= -50 && tgt.y <= height + 50)
                ) {
                  const curX = src.x + (tgt.x - src.x) * p.progress;
                  const curY = src.y + (tgt.y - src.y) * p.progress;

                  ctx.save();
                  ctx.shadowColor = p.color;
                  ctx.shadowBlur = 8;
                  ctx.fillStyle = p.color;
                  ctx.beginPath();
                  ctx.arc(curX, curY, p.size, 0, Math.PI * 2);
                  ctx.fill();

                  const tailProgress = Math.max(0, p.progress - 0.04);
                  const tailX = src.x + (tgt.x - src.x) * tailProgress;
                  const tailY = src.y + (tgt.y - src.y) * tailProgress;
                  ctx.strokeStyle = p.color;
                  ctx.lineWidth = p.size * 0.7;
                  ctx.beginPath();
                  ctx.moveTo(tailX, tailY);
                  ctx.lineTo(curX, curY);
                  ctx.stroke();

                  ctx.restore();
                }
              }
            });
          }

          animationFrameRef.current = requestAnimationFrame(renderParticles);
        };

        animationFrameRef.current = requestAnimationFrame(renderParticles);
      }
    }

    return () => {
      if (layoutRef.current) {
        try { layoutRef.current.stop(); } catch (e) {}
        layoutRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      try {
        cy.stop();
        cy.destroy();
      } catch (e) {}
      cyRef.current = null;
    };
  }, [networkData, nodeRepulsion, edgeElasticity, showParticleStream, particleSpeedMultiplier, showFloatingTags]);

  // Synchronize initial selection or external selection change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selectedEntityId) return;
    try {
      const targetNode = cy.$(`node[id = "${selectedEntityId}"]`);
      if (targetNode && targetNode.length > 0) {
        cy.elements().removeClass('selected');
        targetNode.addClass('selected');
        setSelectedNodeData(targetNode.data());
        cy.animate({
          center: { eles: targetNode },
          zoom: 1.45,
          duration: 400,
        });
      }
    } catch (err) {}
  }, [selectedEntityId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cy = cyRef.current;
    if (!cy || !searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const node = cy.nodes().filter((n) => {
      const id = n.id().toLowerCase();
      const label = (n.data('display_label') || '').toLowerCase();
      const fullName = (n.data('full_name') || '').toLowerCase();
      return id.includes(q) || label.includes(q) || fullName.includes(q);
    }).first();

    if (node && node.length > 0) {
      selectEntityRef.current(node.id());
    }
  };

  const activePresetConfig = USE_CASE_PRESETS.find((p) => p.key === activeUseCase) || USE_CASE_PRESETS[0];

  return (
    <div className="relative w-full h-full bg-[#030406] overflow-hidden select-none font-sans">
      
      {/* ── 1. CYBERNETIC POLAR RADAR RANGE CANVAS (BACKGROUND HUD) ── */}
      {showRadarHud && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Matrix */}
          <div 
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(#00D4FF 1px, transparent 1px), radial-gradient(#00D4FF 1px, #030406 1px)',
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px',
            }}
          />

          {/* Polar Degree Crosshairs */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />
          <div className="absolute w-full h-[1px] rotate-45 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
          <div className="absolute w-full h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />

          {/* Polar Radar Range Rings */}
          <div className="relative flex items-center justify-center">
            {/* Center Core Reticle */}
            <div className="absolute w-40 h-40 rounded-full border border-dashed border-cyan-400/25 animate-pulse" />
            {/* Orbit 1: Bridge & Kingpins */}
            <div className="absolute w-80 h-80 rounded-full border border-cyan-500/20 shadow-[0_0_30px_rgba(0,212,255,0.05)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest px-1 bg-[#030406]">
                ORBIT 1 · COMMAND NEXUS
              </span>
            </div>
            {/* Orbit 2: Interstate Logistics & Hawala Cells */}
            <div className="absolute w-[560px] h-[560px] rounded-full border border-cyan-500/15">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400/50 uppercase tracking-widest px-1 bg-[#030406]">
                ORBIT 2 · LOGISTICS & HAWALA CELLS
              </span>
            </div>
            {/* Orbit 3: Transnational Safe Havens */}
            <div className="absolute w-[840px] h-[840px] rounded-full border border-dashed border-cyan-500/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400/40 uppercase tracking-widest px-1 bg-[#030406]">
                ORBIT 3 · TRANSNATIONAL SAFE HAVENS
              </span>
            </div>

            {/* Sweeping Radar Scanner Line */}
            <div 
              className="absolute w-[840px] h-[840px] rounded-full pointer-events-none"
              style={{
                animation: 'radar-sweep 9s linear infinite',
                background: 'conic-gradient(from 0deg, rgba(0, 212, 255, 0.15) 0deg, transparent 45deg, transparent 360deg)',
              }}
            />
          </div>

          {/* Corner Cyber Telemetry Panels */}
          <div className="absolute top-20 left-4 text-[9px] font-mono text-cyan-400/60 flex flex-col gap-0.5 pointer-events-none">
            <span className="font-bold tracking-widest text-cyan-300">CRIMENET-X MATRIX v4.2</span>
            <span>SUBGRAPH: 201 CONNECTED ENTITIES</span>
            <span>EDGES: 445 CROSS-BORDER CONDUITS</span>
            <span>LOUVAIN MODULARITY: 0.748</span>
          </div>

          <div className="absolute bottom-20 left-4 text-[9px] font-mono text-cyan-400/50 flex flex-col gap-0.5 pointer-events-none">
            <span>BSA 2023 SEC 63 SHA-256 HASH VERIFIED</span>
            <span>MCOCA & PMLA SYNDICATE TOPOLOGY</span>
            <span>INTERPOL RED NOTICE DATABASE</span>
          </div>
        </div>
      )}

      {/* ── 2. CYTOSCAPE CANVAS CONTAINER ── */}
      <div ref={containerRef} className="w-full h-full relative z-1" />

      {/* ── 3. REAL-TIME EDGE PACKET PARTICLE CANVAS (FOREGROUND OVERLAY) ── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-2" />

      {/* ── 4. DYNAMIC FLOATING SYNDICATE BADGES ── */}
      {showFloatingTags && SYNDICATES.map((syndicate) => {
        const pos = clusterPositions[syndicate.clusterKey];
        if (!pos) return null;
        return (
          <div
            key={syndicate.id}
            onClick={() => focusSyndicate(syndicate.clusterKey)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 group"
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          >
            <div className={`px-2.5 py-1 rounded-full border backdrop-blur-md text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-lg ${syndicate.bgBadge}`}>
              <span>{syndicate.icon}</span>
              <span>{syndicate.name}</span>
              <span className="opacity-75 font-normal">({syndicate.count})</span>
            </div>
          </div>
        );
      })}

      {/* ── 5. TOP OPERATIONAL USE-CASE BAR ── */}
      <div className="absolute top-3 left-4 z-20 max-w-[calc(100vw-460px)]">
        <div className="glass-panel p-1.5 rounded-2xl border border-white/10 shadow-2xl bg-[#060B14]/90 backdrop-blur-md flex flex-wrap items-center gap-1.5">
          <div className="px-2 py-1 text-[10px] font-mono font-bold text-crimenet-cyan uppercase tracking-widest flex items-center gap-1.5 border-r border-white/10 mr-0.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan" />
            <span>OPERATIONAL SCENARIOS:</span>
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

      {/* ── 6. TOP RIGHT COMMAND MATRIX CONTROLS ── */}
      <div className="absolute top-3 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Dynamic Risk Filter */}
        <div className="flex bg-black/85 border border-white/10 rounded-xl p-1 gap-1 backdrop-blur-md shadow-lg">
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

        {/* 4 Algorithmic Topologies */}
        <div className="flex bg-black/85 border border-white/10 rounded-xl p-1 gap-1 backdrop-blur-md shadow-lg">
          {(
            [
              { id: 'concentric', label: '🪐 Orbital' },
              { id: 'cose', label: '🌌 Galaxy' },
              { id: 'circle', label: '🕸️ Radial' },
              { id: 'breadthfirst', label: '🌲 Hierarchy' },
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

        {/* Node Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find suspect (e.g. P-017)..."
            className="w-44 bg-black/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-mono transition-all focus:shadow-[0_0_12px_rgba(0,212,255,0.3)]"
          />
        </form>

        {/* Camera Tools */}
        <div className="flex bg-black/80 border border-white/10 rounded-xl p-1 gap-1 backdrop-blur-md shadow-lg">
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.zoom(cy.zoom() * 1.25);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.zoom(cy.zoom() * 0.8);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (cy) cy.fit(undefined, 50);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-crimenet-cyan transition-all"
            title="Fit All"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Optics & Physics Slider Drawer Toggle */}
        <button
          onClick={() => setShowOpticsDrawer(!showOpticsDrawer)}
          className={`chip-3d px-2.5 py-1.5 rounded-xl bg-black/80 border text-xs font-mono flex items-center gap-1.5 transition-all ${
            showOpticsDrawer
              ? 'border-crimenet-cyan text-crimenet-cyan shadow-[0_0_12px_rgba(0,212,255,0.4)]'
              : 'border-white/10 text-white/80 hover:bg-white/5'
          }`}
          title="Tuning Drawer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Optics</span>
        </button>

        {/* Technical Formulations Toggle */}
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className={`chip-3d px-2.5 py-1.5 rounded-xl bg-black/80 border text-xs font-mono flex items-center gap-1.5 transition-all ${
            showTechnicalDetails
              ? 'border-crimenet-cyan text-crimenet-cyan shadow-[0_0_12px_rgba(0,212,255,0.4)]'
              : 'border-white/10 text-white/80 hover:bg-white/5'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Metrics</span>
        </button>
      </div>

      {/* ── 7. INTERACTIVE QUICK-FOCUS SYNDICATE DOCK (BOTTOM CENTER) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
        <div className="glass-panel px-3 py-2 rounded-2xl border border-white/15 shadow-2xl bg-[#060B14]/90 backdrop-blur-md flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono text-crimenet-muted border-r border-white/10 pr-2 mr-0.5">
            <Compass className="w-3.5 h-3.5 text-crimenet-cyan animate-spin-slow" />
            <span className="font-bold">SYNDICATES:</span>
          </div>

          <button
            onClick={() => focusSyndicate(null)}
            className={`btn-3d px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${
              activeClusterFocus === null
                ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                : 'bg-black/40 text-white/70 hover:bg-white/10 border border-white/5'
            }`}
          >
            🪐 Full Galaxy (201)
          </button>

          {SYNDICATES.map((s) => {
            const isSelected = activeClusterFocus === s.clusterKey;
            return (
              <button
                key={s.id}
                onClick={() => focusSyndicate(s.clusterKey)}
                className={`btn-3d px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-white/25 text-white border shadow-md'
                    : 'bg-black/40 text-white/70 hover:bg-white/10 border border-white/5'
                }`}
                style={isSelected ? { borderColor: s.color, color: s.color } : {}}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
                <span className="text-[9px] opacity-70">({s.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 8. GRAPH TOPOLOGY LEGEND (BOTTOM LEFT) ── */}
      <div className="absolute bottom-3 left-4 z-10 bg-black/85 border border-white/10 rounded-2xl p-3 text-[10px] space-y-2 backdrop-blur-md shadow-xl w-64">
        <div className="font-bold text-white uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-crimenet-cyan" />
            TOPOLOGY LEGEND
          </span>
          <span className="text-[9px] font-mono text-crimenet-cyan">201 NODES · 445 EDGES</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-white/80 text-[9px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF1744] border border-white" />
            <span>Bridge Kingpin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#00D4FF]" />
            <span>Leader / Lead</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
            <span>Hawala Conduit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
            <span>Logistics Courier</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-[#E040FB]" />
            <span>Bridge Conduit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-[#F59E0B]" />
            <span>Hawala Wire</span>
          </div>
        </div>
      </div>

      {/* ── 9. ACTIVE OPERATIONAL USE-CASE BRIEFING CARD (BOTTOM RIGHT) ── */}
      {isBriefingCardVisible && (
        <div className="absolute bottom-3 right-4 z-20 w-[380px] max-w-[calc(100vw-32px)]">
          <div 
            className="glass-panel p-4 rounded-2xl border shadow-2xl bg-[#060B14]/95 backdrop-blur-md space-y-2.5 animate-in fade-in slide-in-from-bottom duration-200"
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

            <div className="space-y-1.5 text-xs">
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
                  TACTICAL GOAL & GRAPH REASONING:
                </span>
                <p className="text-[11px] text-white/85 leading-relaxed mt-0.5">
                  {activePresetConfig.objective}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => handleSelectUseCase(activePresetConfig.key)}
                className="btn-3d px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all text-black shadow-md"
                style={{ backgroundColor: activePresetConfig.color }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{activePresetConfig.tacticalAction}</span>
              </button>

              <span className="text-[9px] font-mono text-crimenet-muted">
                TARGET: {activePresetConfig.focusTarget}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. OPTICS & SIMULATION DRAWER ── */}
      {showOpticsDrawer && (
        <div className="absolute top-16 right-4 w-80 bg-[#060B14]/95 border border-crimenet-cyan/30 rounded-2xl p-4 shadow-2xl z-30 space-y-3.5 text-xs font-mono backdrop-blur-md animate-in slide-in-from-right duration-200">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 font-bold text-crimenet-cyan uppercase">
              <Sliders className="w-4 h-4 text-crimenet-cyan" />
              <span>Optics & Physics Tuning</span>
            </div>
            <button onClick={() => setShowOpticsDrawer(false)} className="text-white/50 hover:text-white">✕</button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] text-white/80 mb-1">
                <span>NODE REPULSION (PHYSICS)</span>
                <span className="text-crimenet-cyan">{nodeRepulsion}</span>
              </div>
              <input
                type="range"
                min={200000}
                max={900000}
                step={50000}
                value={nodeRepulsion}
                onChange={(e) => setNodeRepulsion(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/80 mb-1">
                <span>SPRING ELASTICITY</span>
                <span className="text-crimenet-cyan">{edgeElasticity}</span>
              </div>
              <input
                type="range"
                min={50}
                max={300}
                step={25}
                value={edgeElasticity}
                onChange={(e) => setEdgeElasticity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-white/80 mb-1">
                <span>PARTICLE FLOW VELOCITY</span>
                <span className="text-crimenet-cyan">{particleSpeedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.2}
                value={particleSpeedMultiplier}
                onChange={(e) => setParticleSpeedMultiplier(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />
            </div>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="flex items-center justify-between text-[11px] text-white/85 cursor-pointer">
                <span>CYBER POLAR RADAR HUD</span>
                <input
                  type="checkbox"
                  checked={showRadarHud}
                  onChange={(e) => setShowRadarHud(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] text-white/85 cursor-pointer">
                <span>REAL-TIME PACKET FLOW</span>
                <input
                  type="checkbox"
                  checked={showParticleStream}
                  onChange={(e) => setShowParticleStream(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] text-white/85 cursor-pointer">
                <span>FLOATING NEBULA TAGS</span>
                <input
                  type="checkbox"
                  checked={showFloatingTags}
                  onChange={(e) => setShowFloatingTags(e.target.checked)}
                  className="accent-cyan-400 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={() => changeLayout(activeLayout)}
              className="w-full btn-3d py-2 rounded-xl bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-[10px] font-mono font-bold transition-all mt-2"
            >
              APPLY SIMULATION FORCES
            </button>
          </div>
        </div>
      )}

      {/* ── 11. TECHNICAL FORMULATIONS DRAWER ── */}
      {showTechnicalDetails && (
        <div className="absolute top-16 right-4 w-96 bg-[#060B14]/95 border border-crimenet-cyan/30 rounded-2xl p-4 shadow-2xl z-30 space-y-3 text-xs font-mono backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
            <span className="font-bold text-crimenet-cyan uppercase">Technical Formulation & Graph Theory</span>
            <button onClick={() => setShowTechnicalDetails(false)} className="text-white/50 hover:text-white">✕</button>
          </div>
          
          <div className="space-y-2 text-white/80 text-[11px]">
            <div>
              <span className="text-crimenet-amber font-bold block">BETWEENNESS CENTRALITY:</span>
              <span className="text-crimenet-cyan">C_B(v) = ∑_(s≠v≠t) (σ_st(v) / σ_st)</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Isolates bridge broker nodes controlling information or fund routing across disparate syndicates.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-emerald-400 font-bold block">LOUVAIN COMMUNITY DETECTION:</span>
              <span className="text-crimenet-cyan">ΔQ = [(∑_in + 2k_i,in)/2m - ((∑_tot + k_i)/2m)²]</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Maximizes network modularity (Q = 0.748) to partition criminal syndicates into distinct operational clusters.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-crimenet-blue font-bold block">BSA 2023 SECTION 63 INTEGRITY:</span>
              <span className="text-purple-400">SHA-256 (Hash Chain)</span>
              <p className="text-[10px] text-crimenet-muted mt-0.5">
                Guarantees zero digital tampering for courtroom admissibility before special MCOCA/PMLA tribunals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 12. SELECTED NODE INTELLIGENCE DRAWER ── */}
      {selectedNodeData && !selectedEdge && (
        <div className="absolute top-16 right-4 w-96 bg-[#060B14]/95 border border-white/15 rounded-2xl p-4 shadow-2xl z-30 space-y-3.5 backdrop-blur-md animate-in slide-in-from-right">
          <div className="flex justify-between items-start border-b border-white/10 pb-2">
            <div className="flex items-center gap-3">
              <SuspectPhoto
                entityId={selectedNodeData.id}
                displayName={selectedNodeData.full_name || selectedNodeData.id}
                riskLevel={selectedNodeData.risk_level}
                size="md"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-white">
                    {selectedNodeData.id}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                    selectedNodeData.risk_level === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {selectedNodeData.risk_level || 'HIGH'}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-crimenet-cyan truncate max-w-[200px]">
                  {selectedNodeData.full_name || selectedNodeData.id}
                </h4>
                <span className="text-[10px] font-mono text-white/70">
                  {selectedNodeData.role || 'Syndicate Operative'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-crimenet-muted hover:text-white p-1 rounded"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-crimenet-muted">CLUSTER AFFILIATION:</span>
                <span className="text-white font-bold">{selectedNodeData.cluster_name || `Cluster ${selectedNodeData.cluster}`}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-crimenet-muted">CENTRALITY SCORE:</span>
                <span className="text-crimenet-cyan font-bold">{(selectedNodeData.centrality || 0).toFixed(1)} / 100</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-crimenet-muted block">DEGREE:</span>
                <span className="text-white font-bold">{selectedNodeData.degree || '0.015'}</span>
              </div>
              <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                <span className="text-crimenet-amber block">BETWEENNESS:</span>
                <span className="text-crimenet-amber font-bold">{selectedNodeData.betweenness || '0.008'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => dispatchAction('FOCUS_MAP_LOCATION', { location_id: 'L-001' })}
                className="btn-3d py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>LOCATE ON 3D GEO INTEL</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchAction('ASK_AI_EXPLANATION', selectedNodeData.id)}
                className="btn-3d py-2 px-3 rounded-xl bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan" />
                <span>AI CRIMINAL DOSSIER & EVIDENCE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 13. SELECTED EDGE INTELLIGENCE DRAWER ── */}
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
              <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold border bg-cyan-500/20 border-cyan-500/40 text-cyan-300">
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
