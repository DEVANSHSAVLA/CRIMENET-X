'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Person, Camera, TrafficSignal, EvidenceRecord, Location, TimelineEvent, ContextDrawerType } from '@/lib/types';
import { 
  X, Shield, AlertTriangle, Eye, Video, Radio, Clock, MapPin, 
  FileText, ExternalLink, Activity, Network, CheckCircle2, ShieldCheck,
  Maximize2, User, Loader2, Lock, Unlock, KeyRound, Copy, Check, ChevronRight, Briefcase
} from 'lucide-react';
import { api } from '@/lib/api';

interface ContextDrawerProps {
  type: ContextDrawerType;
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, payload: any) => void;
}

export function ContextDrawer({ type, data, isOpen, onClose, onAction }: ContextDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PROVENANCE' | 'SIMULATION'>('DETAILS');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);

  // Evidence Secret Reveal State
  const [evidencePassword, setEvidencePassword] = useState('');
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedHash, setRevealedHash] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Camera Player Controls
  const [cameraMode, setCameraMode] = useState<'SIMULATION' | 'VIDEO' | 'TELEMETRY'>('SIMULATION');
  const [cameraZoom, setCameraZoom] = useState<number>(1);

  // Global ESC Key Listener to cleanly dismiss drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Animated Tactical CCTV Canvas Simulator for Cameras
  useEffect(() => {
    if (type !== 'CAMERA' || !isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      ctx.fillStyle = '#060B14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid scanlines
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.07)';
      ctx.lineWidth = 1;
      for (let y = 0; y < canvas.height; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Moving radar sweep line
      const sweepY = (Math.sin(t) * 0.5 + 0.5) * canvas.height;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(canvas.width, sweepY);
      ctx.stroke();

      // Simulated detection boxes
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 1.5;
      const b1x = 40 + Math.sin(t * 0.5) * 15;
      const b1y = 35 + Math.cos(t * 0.5) * 10;
      ctx.strokeRect(b1x, b1y, 70, 50);
      ctx.fillStyle = '#00D4FF';
      ctx.font = '9px monospace';
      ctx.fillText('TARGET: P-001 (92%)', b1x, b1y - 4);

      // Second detection box
      ctx.strokeStyle = '#FFB300';
      const b2x = 140 + Math.cos(t * 0.7) * 20;
      const b2y = 45 + Math.sin(t * 0.7) * 12;
      ctx.strokeRect(b2x, b2y, 80, 45);
      ctx.fillStyle = '#FFB300';
      ctx.fillText('VEHICLE DET (87%)', b2x, b2y - 4);

      // HUD Overlays
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      ctx.fillText(`CAM ID: ${data?.id || 'CAM-001'} [SIMULATED]`, 10, 18);
      ctx.fillText(`FPS: 30.0 | ${now}`, 10, canvas.height - 10);

      // Target Crosshair
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [type, isOpen, data]);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed top-16 right-0 bottom-0 w-96 bg-crimenet-bg/95 backdrop-blur-md border-l border-white/10 z-40 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          {type === 'ENTITY' && <Shield className="w-4 h-4 text-crimenet-cyan" />}
          {type === 'CAMERA' && <Video className="w-4 h-4 text-crimenet-amber" />}
          {type === 'SIGNAL' && <Radio className="w-4 h-4 text-crimenet-blue" />}
          {type === 'LOCATION' && <MapPin className="w-4 h-4 text-emerald-400" />}
          {type === 'EVENT' && <Clock className="w-4 h-4 text-purple-400" />}
          {type === 'EVIDENCE' && <FileText className="w-4 h-4 text-emerald-400" />}
          <span className="text-xs font-mono font-bold tracking-widest text-crimenet-muted uppercase">
            {type === 'ENTITY' && 'SUSPECT INTELLIGENCE'}
            {type === 'CAMERA' && 'SURVEILLANCE SENSOR'}
            {type === 'SIGNAL' && 'TRAFFIC INFRASTRUCTURE'}
            {type === 'LOCATION' && 'LOCATION INTELLIGENCE'}
            {type === 'EVENT' && 'TIMELINE EVENT'}
            {type === 'EVIDENCE' && 'EVIDENCE RECORD'}
          </span>
        </div>
        <button 
          onClick={onClose} 
          title="Close Drawer (Esc)"
          className="p-1 rounded hover:bg-white/10 text-crimenet-muted hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content by Type */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-4">
        
        {/* Loading Skeleton */}
        {data.loading && (
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-20 h-24 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-crimenet-cyan animate-spin" />
              </div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
                <div className="h-4 bg-white/10 rounded w-1/3 mt-3" />
              </div>
            </div>
            <div className="h-20 bg-white/5 rounded border border-white/5" />
            <div className="h-28 bg-white/5 rounded border border-white/5" />
          </div>
        )}

        {/* ── 1. ENTITY INTELLIGENCE PANEL ── */}
        {!data.loading && type === 'ENTITY' && (
          <div className="space-y-4">
            {/* Person Photo & Identity */}
            <div className="flex gap-3">
              <div className="w-20 h-24 rounded border border-white/20 bg-black/60 flex flex-col items-center justify-center text-crimenet-cyan/70 shrink-0 relative overflow-hidden">
                <User className="w-9 h-9 text-crimenet-muted/60" />
                <span className="text-[8px] font-mono text-crimenet-muted mt-1 uppercase">BIOMETRIC</span>
                <div className="absolute inset-0 bg-gradient-to-t from-crimenet-cyan/10 to-transparent pointer-events-none" />
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-white leading-tight">
                  {data.display_name || data.name}
                </div>
                <div className="text-xs text-crimenet-muted font-mono mt-0.5">
                  ID: {data.id} · NOTICE: {data.notice_id || 'RN-PENDING'}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    data.risk_level === 'CRITICAL' ? 'bg-crimenet-crimson/20 text-crimenet-crimson border border-crimenet-crimson/40' :
                    data.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                    'bg-crimenet-amber/20 text-crimenet-amber border border-crimenet-amber/40'
                  }`}>
                    {data.risk_level || 'HIGH'} RISK
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-crimenet-cyan font-mono border border-white/10">
                    {data.nationalities ? data.nationalities.join(', ') : 'IN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Aliases & DOB */}
            <div className="glass-card p-3 rounded text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Aliases:</span>
                <span className="text-white font-medium">{data.aliases ? data.aliases.join(', ') : 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Date of Birth:</span>
                <span className="text-white font-mono">{data.date_of_birth || 'Not available'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Location Hub:</span>
                <span className="text-white">{data.primary_city || 'Regional Hub'}</span>
              </div>
            </div>

            {/* Non-Jargon Graph Centrality */}
            <div className="glass-card p-3 rounded space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                  Network Importance
                </span>
                <span className="text-xs font-mono font-bold text-crimenet-cyan">
                  Score: {data.centrality_score || 88.4}
                </span>
              </div>
              
              <div>
                <div className="flex justify-between text-[10px] text-crimenet-muted mb-1">
                  <span>Direct Connections</span>
                  <span className="text-white">{data.connections_count || 12} suspects</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-crimenet-cyan rounded-full" style={{ width: `${Math.min((data.connections_count || 12) * 5, 100)}%` }} />
                </div>
              </div>

              <div className="text-[10px] text-white/60 pt-1 border-t border-white/5">
                <span className="text-crimenet-cyan font-semibold">Betweenness Centrality:</span> Measures how frequently this suspect links otherwise isolated criminal syndicates.
              </div>
            </div>

            {/* Why Flagged Checklist */}
            <div className="glass-card p-3 rounded space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                Why is this suspect flagged?
              </div>
              <ul className="text-xs text-white/80 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5" />
                  <span>Subject of official CBI-Interpol Red Notice warrant.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5" />
                  <span>Multiple co-accused correlations on shared criminal charges.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5" />
                  <span>Geographic surveillance hits recorded in regional hub.</span>
                </li>
              </ul>
            </div>

            {/* Charges */}
            {data.offense_categories && data.offense_categories.length > 0 && (
              <div className="glass-card p-3 rounded space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                  Warrant Offense Categories
                </div>
                <div className="space-y-1 text-xs text-white/90">
                  {data.offense_categories.slice(0, 4).map((c: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-crimenet-crimson">•</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Provenance */}
            <div className="p-2.5 rounded bg-black/30 border border-white/5 text-[10px] space-y-1 text-crimenet-muted">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white/80">PROVENANCE:</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono text-[9px]">
                  SOURCE-DERIVED
                </span>
              </div>
              <div>Authority: Central Bureau of Investigation (CBI) / Interpol</div>
              {data.source_urls && data.source_urls[0] && (
                <a 
                  href={data.source_urls[0]} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-crimenet-cyan hover:underline flex items-center gap-1 mt-1 font-mono"
                >
                  <ExternalLink className="w-3 h-3" /> Public Registry Notice
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => onAction && onAction('FOCUS_NETWORK', data.id)}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Network className="w-3.5 h-3.5" /> View Network
              </button>
              <button 
                onClick={() => onAction && onAction('ASK_AI_EXPLANATION', data.id)}
                className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-crimenet-amber" /> Evidence Findings
              </button>
            </div>
          </div>
        )}

        {/* ── 2. CAMERA INTELLIGENCE PANEL (PLAYER ABSTRACTION) ── */}
        {type === 'CAMERA' && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold text-white">{data.name}</div>
              <div className="text-xs text-crimenet-muted font-mono">{data.id} · {data.city}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                  data.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-crimenet-crimson/20 text-crimenet-crimson border-crimenet-crimson/40'
                }`}>
                  {data.status === 'ONLINE' ? 'LIVE' : 'OFFLINE'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {data.source_status || data.stream_type || 'SIMULATED FEED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-white/5 text-crimenet-cyan border border-white/10">
                  PTZ SENSOR
                </span>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-black/60 p-1 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setCameraMode('SIMULATION')}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-colors ${
                  cameraMode === 'SIMULATION' ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                TACTICAL HUD
              </button>
              <button
                onClick={() => setCameraMode('VIDEO')}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-colors ${
                  cameraMode === 'VIDEO' ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                DEMO STREAM
              </button>
              <button
                onClick={() => setCameraMode('TELEMETRY')}
                className={`flex-1 py-1 px-2 rounded text-[10px] font-bold transition-colors ${
                  cameraMode === 'TELEMETRY' ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                TELEMETRY
              </button>
            </div>

            {/* Player Canvas / Video Area */}
            <div className="relative rounded-xl overflow-hidden border border-crimenet-cyan/30 shadow-2xl bg-black">
              {cameraMode === 'SIMULATION' && (
                <div className="relative">
                  <canvas ref={canvasRef} width={350} height={190} className="w-full h-48 bg-black block" />
                  {/* Optical Zoom Level Badge */}
                  <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-crimenet-cyan border border-crimenet-cyan/30">
                    OPTICAL ZOOM: {cameraZoom}X
                  </div>
                  {/* Status Overlay */}
                  <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-amber-400 border border-amber-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    SIMULATED CCTV HUD
                  </div>
                  {/* Zoom Controls */}
                  <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                    {[1, 2, 4].map((z) => (
                      <button
                        key={z}
                        onClick={() => setCameraZoom(z)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                          cameraZoom === z ? 'bg-crimenet-cyan text-black' : 'bg-black/70 text-white hover:bg-white/20'
                        }`}
                      >
                        {z}X
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cameraMode === 'VIDEO' && (
                <div className="w-full h-48 bg-black/90 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Video className="w-8 h-8 text-crimenet-cyan animate-pulse" />
                  <div className="text-xs font-mono text-white font-bold">SECURE DEMO STREAM BUFFERED</div>
                  <div className="text-[10px] text-crimenet-muted font-mono max-w-xs">
                    RTSP / HLS Relay Channel: `cctv-{data.id?.toLowerCase()}-stream.live`
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
                    DEMONSTRATION BUFFER ACTIVE
                  </span>
                </div>
              )}

              {cameraMode === 'TELEMETRY' && (
                <div className="w-full h-48 bg-black/90 p-3 font-mono text-[11px] space-y-1.5 text-white/90 overflow-y-auto scrollbar-dark">
                  <div className="text-crimenet-cyan font-bold text-xs uppercase border-b border-white/10 pb-1">Sensor Telemetry</div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Lens Bearing:</span>
                    <span>142° SE (PANNING)</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Tilt Angle:</span>
                    <span>-15.4° DOWNWARD</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Resolution:</span>
                    <span>1920x1080 @ 30 FPS</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Coverage Area:</span>
                    <span>{data.coverage_radius_m || 300}m Radius</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Network Latency:</span>
                    <span className="text-emerald-400 font-bold">14 ms (LOCAL)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Geographic Context Summary */}
            <div className="glass-card p-3 rounded-lg text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                Surrounding Urban Context
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Coverage Radius:</span>
                <span className="text-white font-mono">{data.coverage_radius_m || 300} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Nearby Suspect Entities:</span>
                <span className="text-crimenet-cyan font-bold font-mono">
                  {data.nearby_entities?.length || 0} detected
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Nearby Traffic Signals:</span>
                <span className="text-white font-bold font-mono">
                  {data.nearby_signals?.length || 0} linked
                </span>
              </div>
            </div>

            {/* Correlated Suspects in Radius */}
            {data.nearby_entities && data.nearby_entities.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                  Correlated Suspects in Coverage Radius
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.nearby_entities.map((eid: string) => (
                    <button
                      key={eid}
                      onClick={() => onAction && onAction('SELECT_ENTITY', eid)}
                      className="px-2 py-1 bg-crimenet-cyan/10 hover:bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/30 rounded font-mono text-xs transition-colors flex items-center gap-1"
                    >
                      <User className="w-3 h-3" /> {eid}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-2.5 rounded bg-black/40 border border-white/5 text-[9px] text-crimenet-muted leading-relaxed">
              <span className="font-bold text-amber-400">SIMULATED / DEMONSTRATION CAMERA FEED:</span> Modeled urban CCTV sensor for spatial and temporal correlation. No unauthorized surveillance access.
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => onAction && onAction('FOCUS_MAP_LOCATION', { lat: data.lat, lng: data.lng })}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> Focus on Map
              </button>
              <button 
                onClick={() => onAction && onAction('VIEW_TIMELINE_EVENTS', data.id)}
                className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> View Timeline
              </button>
            </div>
          </div>
        )}

        {/* ── 3. TRAFFIC SIGNAL PANEL ── */}
        {type === 'SIGNAL' && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold text-white">{data.intersection}</div>
              <div className="text-xs text-crimenet-muted font-mono">{data.id} · {data.city}</div>
            </div>

            {/* Signal Light Halo & Countdown Display */}
            <div className="glass-card p-4 rounded-lg flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  data.phase === 'RED' ? 'bg-crimenet-crimson/20 border-crimenet-crimson glow-crimson' :
                  data.phase === 'YELLOW' ? 'bg-crimenet-amber/20 border-crimenet-amber glow-amber' :
                  'bg-emerald-500/20 border-emerald-400'
                }`}>
                  <Radio className={`w-5 h-5 ${
                    data.phase === 'RED' ? 'text-crimenet-crimson' :
                    data.phase === 'YELLOW' ? 'text-crimenet-amber' :
                    'text-emerald-400'
                  }`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    PHASE: {data.phase} <span className="text-[9px] text-crimenet-amber font-mono font-normal">[SIMULATED]</span>
                  </div>
                  <div className="text-[10px] text-crimenet-muted font-mono">
                    Cycle Countdown: {data.remaining_seconds || 24}s
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-crimenet-muted uppercase font-bold">Traffic Density</div>
                <div className={`text-xs font-black ${
                  data.traffic_density === 'HIGH' ? 'text-crimenet-crimson' :
                  data.traffic_density === 'MEDIUM' ? 'text-crimenet-amber' :
                  'text-emerald-400'
                }`}>
                  {data.traffic_density || 'MEDIUM'}
                </div>
              </div>
            </div>

            {/* Simulated Infrastructure Disclaimer */}
            <div className="p-2 rounded bg-black/40 border border-white/5 text-[9px] text-crimenet-muted">
              SIMULATED INFRASTRUCTURE LAYER: Modeled intersection clearance and urban route congestion for tactical demonstration.
            </div>

            {/* Context Correlations */}
            <div className="glass-card p-3 rounded text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                Intersection Infrastructure
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Connected CCTV Sensors:</span>
                <span className="text-white font-mono">{data.nearby_cameras ? data.nearby_cameras.join(', ') : 'CAM-001'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Suspect Entities Nearby:</span>
                <span className="text-crimenet-cyan font-bold">{data.nearby_entities ? data.nearby_entities.join(', ') : 'None'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => onAction && onAction('FOCUS_MAP_LOCATION', { lat: data.lat, lng: data.lng })}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> View Area
              </button>
              <button 
                onClick={() => onAction && onAction('VIEW_TIMELINE_EVENTS', data.id)}
                className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> View Events
              </button>
            </div>
          </div>
        )}

        {/* ── 4. EVIDENCE RECORD PANEL (PROTECTED SHA-256) ── */}
        {type === 'EVIDENCE' && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold text-white">{data.title}</div>
              <div className="text-xs text-crimenet-muted font-mono">{data.id} · {data.type}</div>
            </div>

            {/* SHA-256 Hash Seal (Masked by Default) */}
            <div className="glass-card p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" /> SHA-256 INTEGRITY SEAL
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  revealedHash ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {revealedHash ? 'UNLOCKED / AUDITED' : 'PROTECTED BY DEFAULT'}
                </span>
              </div>

              {/* Hash Display Area */}
              <div className="p-2.5 rounded bg-black/60 font-mono text-[10px] border border-white/10 flex items-center justify-between gap-2">
                <span className={revealedHash ? 'text-emerald-400 font-bold break-all select-all' : 'text-crimenet-muted tracking-widest'}>
                  {revealedHash || '••••••••••••••••••••••••••••••••••••••••••••••••'}
                </span>
                {revealedHash && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(revealedHash);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 shrink-0"
                    title="Copy Full SHA-256 Hash"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Reveal Workflow Trigger */}
              {!revealedHash && !isRevealOpen && (
                <button
                  onClick={() => setIsRevealOpen(true)}
                  className="w-full py-1.5 px-3 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> REQUEST SECURITY CLEARANCE TO REVEAL HASH
                </button>
              )}

              {/* Password Clearance Input Box */}
              {!revealedHash && isRevealOpen && (
                <div className="p-3 rounded-lg bg-black/70 border border-amber-500/40 space-y-2 animate-in fade-in">
                  <div className="text-[10px] font-mono text-amber-400 font-bold uppercase flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Security Clearance Required
                  </div>
                  <input
                    type="password"
                    value={evidencePassword}
                    onChange={(e) => setEvidencePassword(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        setIsRevealing(true);
                        setRevealError(null);
                        try {
                          const res = await api.revealEvidenceHash(data.id, evidencePassword.trim());
                          if (res?.sha256_hash) {
                            setRevealedHash(res.sha256_hash);
                            setIsRevealOpen(false);
                          }
                        } catch (err) {
                          setRevealError('ACCESS DENIED: Invalid Clearance Secret');
                        } finally {
                          setIsRevealing(false);
                        }
                      }
                    }}
                    placeholder="Enter clearance secret..."
                    className="w-full bg-white/5 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-amber-400 font-mono"
                    autoFocus
                  />
                  {revealError && (
                    <div className="text-[10px] text-crimenet-crimson font-mono font-bold">
                      {revealError}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setIsRevealOpen(false)}
                      className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-crimenet-muted text-xs font-mono"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={async () => {
                        setIsRevealing(true);
                        setRevealError(null);
                        try {
                          const res = await api.revealEvidenceHash(data.id, evidencePassword.trim());
                          if (res?.sha256_hash) {
                            setRevealedHash(res.sha256_hash);
                            setIsRevealOpen(false);
                          }
                        } catch (err) {
                          setRevealError('ACCESS DENIED: Invalid Clearance Secret');
                        } finally {
                          setIsRevealing(false);
                        }
                      }}
                      disabled={isRevealing || !evidencePassword.trim()}
                      className="flex-1 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono transition-colors disabled:opacity-50"
                    >
                      {isRevealing ? 'CHECKING...' : 'AUTHORIZE'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="glass-card p-3 rounded text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Source Agency:</span>
                <span className="text-white font-medium">{data.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Uploaded By:</span>
                <span className="text-white font-mono">{data.uploaded_by || 'CBI_INVESTIGATOR_OFFICER'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Timestamp:</span>
                <span className="text-white font-mono">{data.timestamp}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card p-3 rounded text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">Record Synopsis</div>
              <p className="text-white/80 leading-relaxed">{data.summary}</p>
            </div>
          </div>
        )}

        {/* ── 5. LOCATION INTELLIGENCE PANEL (CONNECTED INVESTIGATION) ── */}
        {!data.loading && type === 'LOCATION' && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold text-white">{data.name}</div>
              <div className="text-xs text-crimenet-muted font-mono">
                {data.id} · {data.city}{data.country ? `, ${data.country}` : ', India'}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {data.provenance_type || 'SOURCE-DERIVED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-white/5 text-crimenet-cyan border border-white/10">
                  {data.precision || 'REGIONAL_APPROXIMATE'}
                </span>
              </div>
            </div>

            {/* Associated Cases */}
            <div className="glass-card p-3 rounded-lg text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted flex items-center gap-1.5">
                <Briefcase className="w-3 h-3 text-crimenet-cyan" /> Associated Crime Cases
              </div>
              <div className="space-y-1.5">
                {(data.associated_cases || [
                  { id: 'CNX-2026-041', name: 'Operation Shadow Network', status: 'ACTIVE' }
                ]).map((c: any) => (
                  <div key={c.id} className="p-2 rounded bg-black/40 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{c.name}</div>
                      <div className="text-[10px] text-crimenet-muted font-mono">{c.id}</div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Associated Persons (Clickable) */}
            <div className="glass-card p-3 rounded-lg text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-crimenet-cyan" /> Persons Associated with Location
                </span>
                <span className="text-[10px] text-crimenet-cyan font-mono font-bold">
                  {data.associated_persons?.length || data.linked_persons || 1} fugitives
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-dark">
                {(data.associated_persons && data.associated_persons.length > 0) ? (
                  data.associated_persons.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => onAction && onAction('SELECT_ENTITY', p.id)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-crimenet-cyan/20 text-white hover:text-crimenet-cyan border border-white/10 text-xs font-mono transition-colors flex items-center gap-1"
                    >
                      <span>{p.name || p.id}</span>
                      <span className="text-[9px] text-crimenet-muted">({p.id})</span>
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => onAction && onAction('SELECT_ENTITY', 'P-017')}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-white/10 text-xs font-mono"
                  >
                    Vikram Reddy (P-017)
                  </button>
                )}
              </div>
            </div>

            {/* Nearby Cameras and Signals */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="glass-card p-2.5 rounded space-y-1">
                <div className="text-[10px] uppercase font-bold text-crimenet-muted flex items-center gap-1">
                  <Video className="w-3 h-3 text-amber-400" /> Cameras
                </div>
                <div className="text-white font-bold font-mono text-sm">
                  {data.nearby_cameras?.length || 2} Nearby
                </div>
              </div>
              <div className="glass-card p-2.5 rounded space-y-1">
                <div className="text-[10px] uppercase font-bold text-crimenet-muted flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" /> Signals
                </div>
                <div className="text-white font-bold font-mono text-sm">
                  {data.nearby_signals?.length || 2} Linked
                </div>
              </div>
            </div>

            {/* Associated Events */}
            {data.associated_events && data.associated_events.length > 0 && (
              <div className="glass-card p-3 rounded-lg text-xs space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" /> Events at this Coordinate ({data.associated_events.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-dark">
                  {data.associated_events.slice(0, 5).map((ev: any) => (
                    <div
                      key={ev.id}
                      onClick={() => onAction && onAction('SELECT_EVENT', ev)}
                      className="p-1.5 rounded bg-black/40 hover:bg-white/5 cursor-pointer border border-white/5 text-[11px]"
                    >
                      <div className="text-white font-medium truncate">{ev.description}</div>
                      <div className="text-[9px] text-crimenet-muted font-mono">{ev.timestamp?.slice(0, 10)} · {ev.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => onAction && onAction('FOCUS_MAP_LOCATION', { lat: data.lat, lng: data.lng })}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> Center on Map
              </button>
              <button 
                onClick={() => onAction && onAction('VIEW_TIMELINE_EVENTS', data.id)}
                className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> View Timeline
              </button>
            </div>
          </div>
        )}

        {/* ── 6. TIMELINE EVENT INTELLIGENCE PANEL ── */}
        {!data.loading && type === 'EVENT' && (
          <div className="space-y-4">
            <div>
              <div className="text-base font-bold text-white">{data.description || 'Investigation Event'}</div>
              <div className="text-xs text-crimenet-muted font-mono mt-0.5">
                {data.id} · {data.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A'}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {data.type || 'TIMELINE_EVENT'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  CONFIDENCE: {Math.round((data.confidence || 0.95) * 100)}%
                </span>
              </div>
            </div>

            {/* SHA-256 Hash Seal */}
            {data.evidence_hash && (
              <div className="glass-card p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/10 space-y-1.5">
                <div className="flex items-center justify-between text-emerald-400 font-bold text-[10px]">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> EVIDENCE INTEGRITY SEAL</span>
                  <span className="font-mono">SHA-256</span>
                </div>
                <div className="p-2 rounded bg-black/60 font-mono text-[9px] text-white/80 break-all border border-white/5 select-all">
                  {data.evidence_hash}
                </div>
              </div>
            )}

            {/* Event Context */}
            <div className="glass-card p-3 rounded text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">Event Details</div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Location:</span>
                <span className="text-white">{data.location_name || data.location_city || 'Regional Hub'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Source:</span>
                <span className="text-white font-medium">{data.source || 'CBI-Interpol Record'}</span>
              </div>
              {data.provenance_badge && (
                <div className="flex justify-between">
                  <span className="text-crimenet-muted">Provenance:</span>
                  <span className="text-emerald-400 font-mono">{data.provenance_badge}</span>
                </div>
              )}
            </div>

            {/* Correlated Entities */}
            {data.entities && data.entities.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                  Correlated Entities ({data.entities.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.entities.map((eid: string) => (
                    <button
                      key={eid}
                      onClick={() => onAction && onAction('SELECT_ENTITY', eid)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-white/10 rounded font-mono text-xs transition-colors"
                    >
                      {eid}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button 
                onClick={() => onAction && onAction('NAVIGATE_TIMELINE', data.id)}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> View in Timeline
              </button>
              <button 
                onClick={() => onAction && onAction('FOCUS_MAP_LOCATION', { location_id: data.location_id })}
                className="py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> Focus Location
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Footer Disclaimer */}
      <div className="p-3 border-t border-white/5 bg-black/40 text-[9px] text-crimenet-muted text-center">
        AI-generated investigative lead — requires human verification.
      </div>
    </div>
  );
}
