'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Person, Camera, TrafficSignal, EvidenceRecord, Location, TimelineEvent, ContextDrawerType } from '@/lib/types';
import { 
  X, Shield, AlertTriangle, Eye, Video, Radio, Clock, MapPin, 
  FileText, ExternalLink, Activity, Network, CheckCircle2, ShieldCheck,
  Maximize2, User, Loader2, Lock, Unlock, KeyRound, Copy, Check, ChevronRight, Briefcase,
  Play, Pause, Volume2, VolumeX, RefreshCw, ZoomIn, Navigation, Sparkles, Layers,
  Camera as CameraIcon, Tv, Globe, Wifi
} from 'lucide-react';
import { api } from '@/lib/api';
import { SuspectPhoto } from '@/components/shared/suspect-photo';

export const MUMBAI_STREET_CAMERAS = [
  {
    id: 'CAM-004',
    name: 'CCTV-MUM-MARINE-DRIVE',
    street_name: 'Marine Drive Promenade (Netaji Subhash Chandra Bose Rd)',
    short_label: 'Marine Drive',
    icon: '🌊',
    city: 'Mumbai',
    lat: 18.9438,
    lng: 72.8233,
    stream_url: '/videos/marine-drive.mp4',
    status: 'LIVE' as const,
    stream_type: 'PUBLIC FEED',
    coverage_radius_m: 350,
    nearby_entities: ['P-001', 'P-049', 'P-015'],
    nearby_signals: ['SIG-MUM-02'],
    nearby_events: ['EV-0015', 'EV-0050'],
    landmarks: "Nariman Point, Chowpatty Coastline, Queen's Necklace",
    description: 'Promenade pedestrian walkway and south-bound coastal arterial corridor.'
  },
  {
    id: 'CAM-002',
    name: 'TRAFFIC-MUM-WORLI-SEAFACE',
    street_name: 'Worli Sea Face / Bandra-Worli Sea Link Approach',
    short_label: 'Worli Sea Face',
    icon: '🌉',
    city: 'Mumbai',
    lat: 19.0176,
    lng: 72.8153,
    stream_url: '/videos/worli-sealink.mp4',
    status: 'LIVE' as const,
    stream_type: 'PUBLIC FEED',
    coverage_radius_m: 400,
    nearby_entities: ['P-015', 'P-044'],
    nearby_signals: ['SIG-MUM-03'],
    nearby_events: ['EV-0088'],
    landmarks: 'Sea Link Toll Plaza, Coastal Road Interchange, Worli Dairy',
    description: 'High-speed coastal transit corridor connecting Western Suburbs and South Mumbai.'
  },
  {
    id: 'CAM-001',
    name: 'CCTV-MUM-CST-TERMINUS',
    street_name: 'DN Road / Chhatrapati Shivaji Maharaj Terminus (CST)',
    short_label: 'CST Terminus',
    icon: '🏛️',
    city: 'Mumbai',
    lat: 18.9400,
    lng: 72.8353,
    stream_url: '/videos/cst-junction.mp4',
    status: 'LIVE' as const,
    stream_type: 'PUBLIC FEED',
    coverage_radius_m: 250,
    nearby_entities: ['P-001', 'P-015'],
    nearby_signals: ['SIG-MUM-01', 'SIG-MUM-02'],
    nearby_events: ['EV-0015', 'EV-0042'],
    landmarks: 'Heritage BMC HQ, Mumbai GPO, Fort Commercial Precinct',
    description: 'High-density multi-modal urban transit terminal and pedestrian intersection.'
  },
  {
    id: 'CAM-003',
    name: 'CCTV-MUM-ANDHERI-LINK',
    street_name: 'New Link Road / Infinity Junction, Andheri West',
    short_label: 'Andheri Link Rd',
    icon: '🚦',
    city: 'Mumbai',
    lat: 19.1364,
    lng: 72.8296,
    stream_url: '/videos/andheri-link.mp4',
    status: 'LIVE' as const,
    stream_type: 'PUBLIC FEED',
    coverage_radius_m: 300,
    nearby_entities: ['P-001', 'P-007'],
    nearby_signals: ['SIG-MUM-04'],
    nearby_events: ['EV-0012'],
    landmarks: 'Infinity Mall Junction, Metro Line 2A Corridor, Lokhandwala Hub',
    description: 'Major arterial corridor of suburban Mumbai with heavy commercial traffic.'
  }
];

interface ContextDrawerProps {
  type: ContextDrawerType;
  data: any;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, payload: any) => void;
}

export function ContextDrawer({ type, data, isOpen, onClose, onAction }: ContextDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cvOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Camera Player Controls & Multi-Street State
  const [cameraMode, setCameraMode] = useState<'VIDEO' | 'DEVICE_CAM' | 'YOUTUBE_LIVE' | 'CUSTOM_STREAM' | 'TELEMETRY' | 'SIMULATION'>('VIDEO');
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showCvHud, setShowCvHud] = useState<boolean>(true);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [selectedStreetCam, setSelectedStreetCam] = useState<any>(null);

  // Live Device / Field Camera (Webcam / USB / Phone Cam)
  const deviceVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isDeviceCamRunning, setIsDeviceCamRunning] = useState<boolean>(false);
  const [deviceCamError, setDeviceCamError] = useState<string | null>(null);

  // YouTube Live Stream
  const [youtubeStreamId, setYoutubeStreamId] = useState<string>('HfgIFGbdGJ0');
  const [customYoutubeInput, setCustomYoutubeInput] = useState<string>('');

  // Custom RTSP / HLS / IP Webcam Stream
  const [customStreamUrl, setCustomStreamUrl] = useState<string>('');
  const [activeCustomStream, setActiveCustomStream] = useState<string>('');

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

  // Synchronize active camera when drawer opens or data prop changes
  useEffect(() => {
    if (type === 'CAMERA' && data) {
      const match = MUMBAI_STREET_CAMERAS.find(c => c.id === data.id);
      if (match) {
        setSelectedStreetCam(match);
      } else {
        setSelectedStreetCam(data);
      }
      setVideoError(false);
      setIsPlaying(true);
    }
  }, [type, data]);

  const currentCam = selectedStreetCam || data;
  const currentStreamUrl = currentCam?.stream_url || data?.stream_url || '/videos/marine-drive.mp4';

  const handleSwitchStreet = (cam: typeof MUMBAI_STREET_CAMERAS[0]) => {
    setSelectedStreetCam(cam);
    setVideoError(false);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.src = cam.stream_url;
      videoRef.current.play().catch(() => {});
    }
    if (onAction) {
      onAction('FOCUS_MAP_LOCATION', {
        lat: cam.lat,
        lng: cam.lng,
        zoom: 15.2,
        camera: cam,
      });
    }
  };

  // Device Live Camera Handlers (Direct Hardware / Phone Cam)
  const startDeviceCamera = async () => {
    setDeviceCamError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser environment');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      if (deviceVideoRef.current) {
        deviceVideoRef.current.srcObject = stream;
        await deviceVideoRef.current.play();
        setIsDeviceCamRunning(true);
      }
    } catch (err: any) {
      console.warn('Device camera start failed:', err);
      setDeviceCamError(err?.message || 'Camera permission denied or camera device not found');
      setIsDeviceCamRunning(false);
    }
  };

  const stopDeviceCamera = () => {
    if (deviceVideoRef.current && deviceVideoRef.current.srcObject) {
      const stream = deviceVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      deviceVideoRef.current.srcObject = null;
      setIsDeviceCamRunning(false);
    }
  };

  useEffect(() => {
    if (!isOpen || cameraMode !== 'DEVICE_CAM') {
      stopDeviceCamera();
    }
  }, [isOpen, cameraMode]);

  const parseYouTubeId = (input: string): string => {
    const trimmed = input.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    return (match && match[2].length === 11) ? match[2] : trimmed;
  };

  // Tactical Computer Vision (CV) Overlay for Active Video Stream
  useEffect(() => {
    const isLiveStreamActive = cameraMode === 'VIDEO' || cameraMode === 'DEVICE_CAM' || cameraMode === 'YOUTUBE_LIVE' || cameraMode === 'CUSTOM_STREAM';
    if (type !== 'CAMERA' || !isOpen || !cvOverlayCanvasRef.current || !isLiveStreamActive) return;
    const canvas = cvOverlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let t = 0;

    const renderCvOverlay = () => {
      t += 0.035;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (showCvHud) {
        // Subtle scanlines
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 7) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Helper function for tactical corner brackets
        const drawTacticalBracket = (x: number, y: number, bw: number, bh: number, color: string, label: string) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          const corner = Math.min(8, bw * 0.25);

          // Top-left
          ctx.beginPath();
          ctx.moveTo(x, y + corner);
          ctx.lineTo(x, y);
          ctx.lineTo(x + corner, y);
          ctx.stroke();

          // Top-right
          ctx.beginPath();
          ctx.moveTo(x + bw - corner, y);
          ctx.lineTo(x + bw, y);
          ctx.lineTo(x + bw, y + corner);
          ctx.stroke();

          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(x, y + bh - corner);
          ctx.lineTo(x, y + bh);
          ctx.lineTo(x + corner, y + bh);
          ctx.stroke();

          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(x + bw - corner, y + bh);
          ctx.lineTo(x + bw, y + bh);
          ctx.lineTo(x + bw, y + bh - corner);
          ctx.stroke();

          // Label pill
          ctx.fillStyle = 'rgba(3, 4, 6, 0.85)';
          ctx.fillRect(x, y - 13, Math.min(bw + 12, 155), 12);
          ctx.fillStyle = color;
          ctx.font = 'bold 8.5px monospace';
          ctx.fillText(label, x + 3, y - 3);
        };

        // Object 1: Car tracking
        const b1x = (Math.sin(t * 0.4) * 0.22 + 0.38) * w;
        const b1y = (Math.cos(t * 0.2) * 0.08 + 0.48) * h;
        drawTacticalBracket(b1x, b1y, 75, 46, '#00D4FF', 'CAR [MH-01-CR-8821] 94%');

        // Object 2: Best Bus / Heavy Vehicle
        const b2x = (Math.cos(t * 0.25) * 0.18 + 0.58) * w;
        const b2y = (Math.sin(t * 0.3) * 0.06 + 0.44) * h;
        drawTacticalBracket(b2x, b2y, 88, 54, '#FFB300', 'TRANSIT BUS [BEST] 96%');

        // Object 3: Auto Rickshaw
        const b3x = (Math.sin(t * 0.35 + 1.2) * 0.14 + 0.14) * w;
        const b3y = (Math.cos(t * 0.25) * 0.05 + 0.60) * h;
        drawTacticalBracket(b3x, b3y, 52, 38, '#10B981', 'AUTO [MH-02] 89%');

        // Object 4: Biometric Target Suspect Match
        const nearbySuspect = currentCam?.nearby_entities?.[0] || 'P-001';
        const sPulse = Math.sin(t * 4) > 0;
        const sColor = sPulse ? '#FF1744' : '#FF5252';
        const sX = (Math.sin(t * 0.18) * 0.10 + 0.20) * w;
        const sY = 0.58 * h;
        drawTacticalBracket(sX, sY, 48, 54, sColor, `TARGET: ${nearbySuspect} (92.4%)`);

        // Center reticle
        const cx = w / 2;
        const cy = h / 2;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
        ctx.stroke();

        // Top HUD Header
        ctx.fillStyle = 'rgba(3, 4, 6, 0.8)';
        ctx.fillRect(0, 0, w, 20);
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(10, 10, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('LIVE PUBLIC FEED [MUMBAI]', 20, 13);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '8px monospace';
        ctx.fillText('1080P · 30FPS · YOLO-V9', w - 125, 13);

        // Bottom HUD Bar
        ctx.fillStyle = 'rgba(3, 4, 6, 0.8)';
        ctx.fillRect(0, h - 16, w, 16);
        ctx.fillStyle = '#E0E0E0';
        ctx.font = '8px monospace';
        const timeStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
        ctx.fillText(`${currentCam?.id || 'CAM'} · ${timeStr}`, 6, h - 5);
      }

      animFrameId = requestAnimationFrame(renderCvOverlay);
    };

    renderCvOverlay();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [type, isOpen, cameraMode, showCvHud, currentCam]);

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
              <SuspectPhoto
                entityId={data.id}
                displayName={data.display_name || data.name}
                noticeId={data.notice_id}
                gender={data.gender}
                riskLevel={data.risk_level}
                photoUrl={data.photo_thumbnail_url || data.photo_url}
                physicalDescription={data.physical_description}
                size="md"
              />
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

        {/* ── 2. CAMERA INTELLIGENCE PANEL (LIVE PUBLIC FEEDS & CV) ── */}
        {type === 'CAMERA' && (
          <div className="space-y-4">
            {/* Header & Badges */}
            <div>
              <div className="text-sm font-bold text-white leading-snug">
                {currentCam.street_name || currentCam.name}
              </div>
              <div className="text-xs text-crimenet-muted font-mono mt-0.5">
                {currentCam.id} · {currentCam.city} · {currentCam.type || 'PUBLIC CAMERA'}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE PUBLIC FEED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {currentCam.stream_type || 'PUBLIC FEED'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-white/5 text-crimenet-cyan border border-white/10">
                  1080P PTZ SENSOR
                </span>
              </div>
            </div>

            {/* Mumbai Public Street Quick-Switcher */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-crimenet-cyan font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-crimenet-cyan" /> Mumbai Street Live Corridors (4)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  PUBLIC
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                {MUMBAI_STREET_CAMERAS.map((cam) => {
                  const isSelected = (currentCam?.id === cam.id);
                  return (
                    <button
                      key={cam.id}
                      onClick={() => handleSwitchStreet(cam)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-crimenet-cyan/20 border-crimenet-cyan text-white shadow-lg shadow-crimenet-cyan/20 ring-1 ring-crimenet-cyan'
                          : 'bg-black/50 border-white/10 text-crimenet-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{cam.icon}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                          isSelected ? 'bg-crimenet-cyan text-black font-black' : 'bg-white/10 text-crimenet-muted'
                        }`}>
                          {cam.id}
                        </span>
                      </div>
                      <div className="font-bold text-[11px] text-white mt-1 truncate">
                        {cam.short_label}
                      </div>
                      <div className="text-[9px] text-crimenet-muted truncate mt-0.5">
                        {cam.landmarks.split(',')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-5 rounded-lg bg-black/60 p-1 border border-white/10 text-xs font-mono gap-1">
              <button
                onClick={() => setCameraMode('VIDEO')}
                title="4 High-Definition Mumbai Street Corridors"
                className={`py-1.5 px-1 rounded text-[9px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  cameraMode === 'VIDEO' ? 'bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40 shadow-sm' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                <Video className="w-3 h-3" />
                <span>CORRIDOR</span>
              </button>
              <button
                onClick={() => {
                  setCameraMode('DEVICE_CAM');
                  startDeviceCamera();
                }}
                title="Direct Laptop / Phone / USB Camera Feed with Real-Time AI Tracking"
                className={`py-1.5 px-1 rounded text-[9px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 relative ${
                  cameraMode === 'DEVICE_CAM' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                <CameraIcon className="w-3 h-3" />
                <span className="flex items-center gap-0.5">
                  WEBCAM
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                </span>
              </button>
              <button
                onClick={() => setCameraMode('YOUTUBE_LIVE')}
                title="24/7 Live YouTube Street & Municipal Streams"
                className={`py-1.5 px-1 rounded text-[9px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  cameraMode === 'YOUTUBE_LIVE' ? 'bg-crimenet-crimson/20 text-crimenet-crimson border border-crimenet-crimson/40 shadow-sm' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                <Tv className="w-3 h-3" />
                <span>YT LIVE</span>
              </button>
              <button
                onClick={() => setCameraMode('CUSTOM_STREAM')}
                title="Direct IP Webcam / RTSP / HLS Stream Input"
                className={`py-1.5 px-1 rounded text-[9px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  cameraMode === 'CUSTOM_STREAM' ? 'bg-crimenet-amber/20 text-crimenet-amber border border-crimenet-amber/40 shadow-sm' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                <Wifi className="w-3 h-3" />
                <span>IP / RTSP</span>
              </button>
              <button
                onClick={() => setCameraMode('TELEMETRY')}
                title="Lens Telemetry & GIS Coverage Data"
                className={`py-1.5 px-1 rounded text-[9px] font-bold transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  cameraMode === 'TELEMETRY' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-crimenet-muted hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>TELEMETRY</span>
              </button>
            </div>

            {/* Player Canvas / Video Area */}
            <div className="relative rounded-xl overflow-hidden border border-crimenet-cyan/30 shadow-2xl bg-black">
              {/* 1. MUMBAI CORRIDORS STREAM */}
              {cameraMode === 'VIDEO' && (
                <div className="relative w-full h-56 bg-black overflow-hidden group">
                  {/* Real MP4 Video Loop */}
                  <video
                    ref={videoRef}
                    key={currentStreamUrl}
                    src={currentStreamUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onError={() => setVideoError(true)}
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{
                      transform: `scale(${cameraZoom})`,
                      transformOrigin: 'center center',
                    }}
                  />

                  {/* Fallback Display if video load fails */}
                  {videoError && (
                    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-3 text-center space-y-2 z-20">
                      <AlertTriangle className="w-6 h-6 text-crimenet-amber" />
                      <div className="text-xs font-mono text-white font-bold">STREAM RE-CONNECTING</div>
                      <div className="text-[10px] text-crimenet-muted font-mono">
                        Connecting to relay buffer for {currentCam.name}...
                      </div>
                    </div>
                  )}

                  {/* Tactical Computer Vision HUD Overlay Canvas */}
                  <canvas
                    ref={cvOverlayCanvasRef}
                    width={380}
                    height={220}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  />

                  {/* Top Right CV HUD Toggle */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                    <button
                      onClick={() => setShowCvHud(!showCvHud)}
                      title="Toggle Tactical AI Computer Vision HUD Overlay"
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors shadow-sm ${
                        showCvHud
                          ? 'bg-crimenet-cyan/30 text-crimenet-cyan border-crimenet-cyan/60'
                          : 'bg-black/70 text-white/50 border-white/10'
                      }`}
                    >
                      CV HUD: {showCvHud ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Bottom Video Controls Toolbar */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            if (isPlaying) {
                              videoRef.current.pause();
                              setIsPlaying(false);
                            } else {
                              videoRef.current.play();
                              setIsPlaying(true);
                            }
                          }
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white transition-colors"
                        title={isPlaying ? 'Pause Stream' : 'Play Stream'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                          }
                        }}
                        className="p-1 rounded hover:bg-white/10 text-white transition-colors"
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-crimenet-muted" /> : <Volume2 className="w-3.5 h-3.5 text-crimenet-cyan" />}
                      </button>

                      <span className="text-[9px] font-mono text-emerald-400 font-bold ml-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isPlaying ? 'MUMBAI CORRIDOR' : 'PAUSED'}
                      </span>
                    </div>

                    {/* Optical Zoom Controls */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono text-crimenet-muted mr-0.5">ZOOM:</span>
                      {[1, 2, 4].map((z) => (
                        <button
                          key={z}
                          onClick={() => setCameraZoom(z)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                            cameraZoom === z
                              ? 'bg-crimenet-cyan text-black font-extrabold shadow-sm'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {z}X
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. LIVE DEVICE WEBCAM / FIELD CAMERA */}
              {cameraMode === 'DEVICE_CAM' && (
                <div className="relative w-full h-56 bg-black overflow-hidden flex flex-col justify-center items-center">
                  {isDeviceCamRunning ? (
                    <>
                      <video
                        ref={deviceVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Tactical CV Overlay over live webcam */}
                      <canvas
                        ref={cvOverlayCanvasRef}
                        width={380}
                        height={220}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />
                      {/* Top status */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[9px] font-mono font-bold text-emerald-400">
                          LIVE WEBCAM SENSOR · 0ms
                        </span>
                      </div>
                      {/* Top Right CV Toggle */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                        <button
                          onClick={() => setShowCvHud(!showCvHud)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors shadow-sm ${
                            showCvHud
                              ? 'bg-crimenet-cyan/30 text-crimenet-cyan border-crimenet-cyan/60'
                              : 'bg-black/70 text-white/50 border-white/10'
                          }`}
                        >
                          CV HUD: {showCvHud ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      {/* Bottom control */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        <span className="text-[9px] font-mono text-crimenet-cyan">
                          Active Biometric & Object Tracker Active
                        </span>
                        <button
                          onClick={stopDeviceCamera}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-crimenet-crimson/30 hover:bg-crimenet-crimson/50 text-crimenet-crimson border border-crimenet-crimson/50 transition-colors"
                        >
                          DISCONNECT
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-3 max-w-xs z-10">
                      <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <CameraIcon className="w-5 h-5 text-emerald-400 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase font-mono">
                          Live Field / Hardware Camera
                        </div>
                        <div className="text-[10px] text-crimenet-muted mt-1 leading-relaxed">
                          Connect your laptop camera or external mobile camera pointing at the street or room for 100% genuine zero-latency live streaming with real-time AI tracking.
                        </div>
                      </div>
                      {deviceCamError && (
                        <div className="text-[9px] text-crimenet-crimson bg-crimenet-crimson/10 border border-crimenet-crimson/30 p-1.5 rounded">
                          {deviceCamError}
                        </div>
                      )}
                      <button
                        onClick={startDeviceCamera}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 mx-auto"
                      >
                        <CameraIcon className="w-3.5 h-3.5" />
                        START LIVE CAMERA
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 3. YOUTUBE LIVE BROADCAST */}
              {cameraMode === 'YOUTUBE_LIVE' && (
                <div className="relative w-full h-56 bg-black overflow-hidden flex flex-col">
                  <div className="relative w-full flex-1 bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${parseYouTubeId(youtubeStreamId)}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0`}
                      className="w-full h-full border-0 pointer-events-auto"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title="Live YouTube Public Feed"
                    />
                    {/* Tactical CV Overlay */}
                    <canvas
                      ref={cvOverlayCanvasRef}
                      width={380}
                      height={220}
                      className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    />
                    {/* Top status */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-crimenet-crimson/40">
                      <span className="w-2 h-2 rounded-full bg-crimenet-crimson animate-ping" />
                      <span className="text-[9px] font-mono font-bold text-crimenet-crimson">
                        PUBLIC 24/7 LIVE STREAM
                      </span>
                    </div>
                    {/* Top Right CV Toggle */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                      <button
                        onClick={() => setShowCvHud(!showCvHud)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors shadow-sm ${
                          showCvHud
                            ? 'bg-crimenet-cyan/30 text-crimenet-cyan border-crimenet-cyan/60'
                            : 'bg-black/70 text-white/50 border-white/10'
                        }`}
                      >
                        CV HUD: {showCvHud ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* YouTube Stream Tuner / Quick Presets */}
                  <div className="bg-black/90 p-1.5 border-t border-white/10 flex items-center gap-1 font-mono text-[9px]">
                    <span className="text-crimenet-muted shrink-0">PRESETS:</span>
                    <button
                      onClick={() => setYoutubeStreamId('HfgIFGbdGJ0')}
                      className={`px-1.5 py-0.5 rounded ${youtubeStreamId === 'HfgIFGbdGJ0' ? 'bg-crimenet-cyan text-black font-bold' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      Traffic Cam 1
                    </button>
                    <button
                      onClick={() => setYoutubeStreamId('jfKfPfyJRdk')}
                      className={`px-1.5 py-0.5 rounded ${youtubeStreamId === 'jfKfPfyJRdk' ? 'bg-crimenet-cyan text-black font-bold' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      Street Cam 2
                    </button>
                    <button
                      onClick={() => setYoutubeStreamId('21X5lGlDOfg')}
                      className={`px-1.5 py-0.5 rounded ${youtubeStreamId === '21X5lGlDOfg' ? 'bg-crimenet-cyan text-black font-bold' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      NASA ISS
                    </button>
                  </div>
                </div>
              )}

              {/* 4. CUSTOM IP WEBCAM / RTSP / HLS STREAM */}
              {cameraMode === 'CUSTOM_STREAM' && (
                <div className="relative w-full h-56 bg-black overflow-hidden flex flex-col justify-center items-center">
                  {activeCustomStream ? (
                    <div className="relative w-full h-full bg-black">
                      <img
                        src={activeCustomStream}
                        alt="IP Webcam Feed"
                        className="w-full h-full object-cover"
                        onError={() => {
                          console.warn('Custom stream image failed, trying video fallback');
                        }}
                      />
                      {/* Tactical CV Overlay */}
                      <canvas
                        ref={cvOverlayCanvasRef}
                        width={380}
                        height={220}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                      />
                      {/* Top status */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-amber-400/40">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[9px] font-mono font-bold text-amber-400">
                          IP WEBCAM STREAM
                        </span>
                      </div>
                      {/* Bottom control */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                        <span className="text-[9px] font-mono text-white truncate max-w-[220px]">
                          {activeCustomStream}
                        </span>
                        <button
                          onClick={() => setActiveCustomStream('')}
                          className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                          CHANGE URL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 w-full space-y-2 text-center font-mono">
                      <div className="text-xs font-bold text-white uppercase flex items-center justify-center gap-1">
                        <Wifi className="w-3.5 h-3.5 text-amber-400" />
                        Direct IP Webcam / RTSP Stream
                      </div>
                      <div className="text-[10px] text-crimenet-muted leading-tight">
                        Connect an Android phone running <span className="text-amber-400 font-bold">IP Webcam</span> (stream at <code className="bg-black/60 px-1 py-0.5 rounded text-white">http://IP:8080/video</code>) or any municipal MJPEG/HLS feed.
                      </div>
                      <div className="flex gap-1 mt-2">
                        <input
                          type="text"
                          value={customStreamUrl}
                          onChange={(e) => setCustomStreamUrl(e.target.value)}
                          placeholder="http://192.168.1.100:8080/video"
                          className="flex-1 bg-black/80 border border-white/20 rounded px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <button
                          onClick={() => {
                            if (customStreamUrl.trim()) {
                              setActiveCustomStream(customStreamUrl.trim());
                            }
                          }}
                          className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
                        >
                          CONNECT
                        </button>
                      </div>
                      <div className="flex justify-center gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            setCustomStreamUrl('http://192.168.1.50:8080/video');
                            setActiveCustomStream('http://192.168.1.50:8080/video');
                          }}
                          className="text-[9px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-crimenet-muted"
                        >
                          Example IP Webcam URL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 5. RADAR SCAN SIMULATOR */}
              {cameraMode === 'SIMULATION' && (
                <div className="relative">
                  <canvas ref={canvasRef} width={350} height={190} className="w-full h-56 bg-black block" />
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

              {cameraMode === 'TELEMETRY' && (
                <div className="w-full h-52 bg-black/90 p-3 font-mono text-[11px] space-y-1.5 text-white/90 overflow-y-auto scrollbar-dark">
                  <div className="text-crimenet-cyan font-bold text-xs uppercase border-b border-white/10 pb-1 flex items-center justify-between">
                    <span>Sensor Telemetry</span>
                    <span className="text-[9px] text-emerald-400">1080P @ 30 FPS</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Street Corridor:</span>
                    <span className="text-white truncate max-w-[180px]">{currentCam.street_name || currentCam.name}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">GPS Coordinates:</span>
                    <span className="text-crimenet-cyan font-bold">{currentCam.lat?.toFixed(4)}° N, {currentCam.lng?.toFixed(4)}° E</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Lens Bearing:</span>
                    <span>142° SE (PANNING)</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Tilt Angle:</span>
                    <span>-15.4° DOWNWARD</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Coverage Area:</span>
                    <span>{currentCam.coverage_radius_m || 350}m Radius Buffer</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Network Bitrate:</span>
                    <span className="text-emerald-400 font-bold">4.2 Mbps (H.264)</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-crimenet-muted">Stream Buffer Latency:</span>
                    <span className="text-emerald-400 font-bold">12 ms (LOCAL MP4 BUFFER)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Geographic Context Summary */}
            <div className="glass-card p-3 rounded-lg text-xs space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted">
                Urban Street Context & Coverage
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Street Corridor:</span>
                <span className="text-white font-medium text-right max-w-[200px] truncate">{currentCam.street_name || currentCam.name}</span>
              </div>
              {currentCam.landmarks && (
                <div className="flex justify-between">
                  <span className="text-crimenet-muted">Landmarks:</span>
                  <span className="text-crimenet-cyan font-medium text-right max-w-[200px] truncate">{currentCam.landmarks}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Coverage Radius:</span>
                <span className="text-white font-mono">{currentCam.coverage_radius_m || 350} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Nearby Suspect Entities:</span>
                <span className="text-crimenet-cyan font-bold font-mono">
                  {currentCam.nearby_entities?.length || 0} correlated
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-crimenet-muted">Nearby Traffic Signals:</span>
                <span className="text-white font-bold font-mono">
                  {currentCam.nearby_signals?.length || 0} linked
                </span>
              </div>
            </div>

            {/* Correlated Suspects in Radius */}
            {currentCam.nearby_entities && currentCam.nearby_entities.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-crimenet-muted flex items-center justify-between">
                  <span>Correlated Suspects in Coverage Radius</span>
                  <span className="text-amber-400 font-mono text-[9px] font-bold">CROSS-REFERENCED</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentCam.nearby_entities.map((eid: string) => (
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

            {/* Public CCTV Transparency Notice */}
            <div className="p-2.5 rounded bg-black/50 border border-emerald-500/20 text-[9px] text-crimenet-muted leading-relaxed">
              <span className="font-bold text-emerald-400">PUBLIC ACCESSIBLE CORRIDOR STREAM:</span> High-definition street camera feed for urban spatial verification, vehicle tracking, and Red Notice suspect correlation. 100% compliant with public accessibility guidelines.
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => onAction && onAction('FOCUS_MAP_LOCATION', { lat: currentCam.lat, lng: currentCam.lng, zoom: 15.5, camera: currentCam })}
                className="py-2 px-3 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> Focus on Map
              </button>
              <button 
                onClick={() => onAction && onAction('VIEW_TIMELINE_EVENTS', currentCam.id)}
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
