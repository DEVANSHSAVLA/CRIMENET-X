'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { TiltCard3D } from '@/components/shared/tilt-card-3d';
import { SuspectPhoto } from '@/components/shared/suspect-photo';
import { 
  ShieldCheck, Search, Copy, Check, CheckCircle2, Lock, Unlock, 
  KeyRound, AlertCircle, X, ShieldAlert, FileText, History,
  RotateCw, Layers, Link2, Box, ArrowRight, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { EvidenceRecord } from '@/lib/types';

// Mock Blockchain Blocks for Chain-of-Custody Visualizer
interface ChainBlock {
  blockNumber: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  eventType: string;
  officer: string;
  custodyAction: string;
  evidenceId: string;
  verified: boolean;
}

const CHAIN_BLOCKS: ChainBlock[] = [
  {
    blockNumber: 1042,
    blockHash: '7b8f9a2e3d4c5b6a1e0f9876543210fedcba9876543210abcdef1234567890ab',
    previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: '2026-02-10T08:30:00Z',
    eventType: 'INTERPOL RED NOTICE ISSUANCE',
    officer: 'Devansh Savla (Level 5 Dir)',
    custodyAction: 'Initial Evidence Ingestion & SHA-256 Digest Mint',
    evidenceId: 'EV-001',
    verified: true,
  },
  {
    blockNumber: 1043,
    blockHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    previousHash: '7b8f9a2e3d4c5b6a1e0f9876543210fedcba9876543210abcdef1234567890ab',
    timestamp: '2026-02-12T14:15:22Z',
    eventType: 'SURVEILLANCE OPTICAL SEIZURE',
    officer: 'Ayaan Mukadam (Chief Inv)',
    custodyAction: 'CAM-004 CCTV Optical Stream Hashing & Time-Lock',
    evidenceId: 'EV-004',
    verified: true,
  },
  {
    blockNumber: 1044,
    blockHash: '9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
    previousHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    timestamp: '2026-02-14T19:45:10Z',
    eventType: 'FINANCIAL HAWALA LEDGER SEIZURE',
    officer: 'Enforcement Directorate (PMLA)',
    custodyAction: 'Shell Bank Account A-009 Hawala Transaction Ledger Ingestion',
    evidenceId: 'EV-012',
    verified: true,
  },
  {
    blockNumber: 1045,
    blockHash: '2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
    previousHash: '9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f',
    timestamp: '2026-02-15T11:20:00Z',
    eventType: 'SECTION 63 BSA COURT CERTIFICATION',
    officer: 'Devansh Savla & Ayaan Mukadam',
    custodyAction: 'Electronic Record Affidavit Export for Special Court Trial',
    evidenceId: 'EV-017',
    verified: true,
  },
];

export default function EvidencePage() {
  const { selectEvidence, selectEntity } = useInvestigation();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // View Mode: 3D Flip Cards vs 3D Blockchain vs Tabular Archive
  const [viewMode, setViewMode] = useState<'3D_CARDS' | '3D_BLOCKCHAIN' | 'TABLE'>('3D_CARDS');
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});

  // Hash Reveal State
  const [revealedHashes, setRevealedHashes] = useState<Record<string, string>>({});
  const [revealModalItem, setRevealModalItem] = useState<EvidenceRecord | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [revealError, setRevealError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Audit Logs Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvidence = async () => {
      try {
        const res = await api.getEvidence();
        setEvidenceList(res.evidence || []);
      } catch (err) {
        console.warn('Evidence fetch error', err);
      }
    };
    fetchEvidence();
  }, []);

  const handleOpenRevealModal = (item: EvidenceRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealModalItem(item);
    setPasswordInput('');
    setRevealError(null);
  };

  const handleVerifyPassword = async () => {
    if (!revealModalItem || !passwordInput.trim()) return;
    setIsRevealing(true);
    setRevealError(null);

    try {
      const res = await api.revealEvidenceHash(revealModalItem.id, passwordInput.trim());
      if (res && res.sha256_hash) {
        setRevealedHashes((prev) => ({
          ...prev,
          [revealModalItem.id]: res.sha256_hash,
        }));
        setRevealModalItem(null);
      }
    } catch (err: any) {
      setRevealError('ACCESS DENIED: Invalid Security Clearance Secret. Failed attempt logged.');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleOpenAuditLogs = async () => {
    setIsAuditModalOpen(true);
    try {
      const res = await api.getEvidenceAuditLogs();
      setAuditLogs(res.audit_logs || []);
    } catch (err) {
      console.warn('Audit logs fetch failed', err);
    }
  };

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'RED_NOTICES' | 'SURVEILLANCE' | 'SIGHTINGS' | 'REVEALED'>('ALL');

  const filtered = evidenceList.filter((e) => {
    const q = search.toLowerCase();
    const hashToTest = revealedHashes[e.id] || e.sha256_hash || '';
    const matchesSearch = (
      e.title.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      hashToTest.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;

    if (activeCategory === 'RED_NOTICES') {
      return e.title.toLowerCase().includes('notice') || e.source.toLowerCase().includes('interpol') || e.source.toLowerCase().includes('cbi');
    }
    if (activeCategory === 'SURVEILLANCE') {
      return e.source.toLowerCase().includes('cctv') || e.source.toLowerCase().includes('surveillance') || e.title.toLowerCase().includes('camera');
    }
    if (activeCategory === 'SIGHTINGS') {
      return e.source.toLowerCase().includes('sighting') || e.source.toLowerCase().includes('transit') || e.source.toLowerCase().includes('border');
    }
    if (activeCategory === 'REVEALED') {
      return Boolean(revealedHashes[e.id]);
    }
    return true;
  });

  const handleCopyHash = (id: string, hash: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCardFlip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden relative">
      
      {/* ── TOP HEADER BANNER (3D RIG) ── */}
      <TiltCard3D glowColor="emerald" maxTilt={2} className="rounded-2xl shrink-0">
        <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between border-l-4 border-emerald-500 gap-4 depth-3d-box neon-depth-emerald shadow-xl bg-[#060D1A]/90">
          <div>
            <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> SECTION 63 BSA 2023 EVIDENCE INTEGRITY REPOSITORY
            </h2>
            <p className="text-[11px] text-crimenet-muted font-mono mt-0.5">
              CRYPTOGRAPHIC SHA-256 PROVENANCE CHAIN · COURT-ADMISSIBLE FORENSIC CUSTODY BLOCKS
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex bg-black/60 rounded-xl p-1 border border-white/10 text-xs font-mono gap-1">
              <button
                onClick={() => setViewMode('3D_CARDS')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === '3D_CARDS'
                    ? 'bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>3D FLIP CARDS</span>
              </button>
              <button
                onClick={() => setViewMode('3D_BLOCKCHAIN')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === '3D_BLOCKCHAIN'
                    ? 'bg-crimenet-cyan text-black font-bold shadow-[0_0_12px_rgba(0,212,255,0.5)]'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>3D BLOCKCHAIN</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'TABLE'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <span>ARCHIVE TABLE</span>
              </button>
            </div>

            <button
              onClick={handleOpenAuditLogs}
              className="btn-3d flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/10 text-xs font-mono transition-all hover:border-crimenet-cyan/40"
            >
              <History className="w-3.5 h-3.5 text-crimenet-cyan" /> AUDIT TRAIL
            </button>
          </div>
        </div>
      </TiltCard3D>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <GlassPanel title="AUTHENTICATED INVESTIGATIVE DOSSIERS" className="flex-1 flex flex-col overflow-hidden depth-3d-box p-4 bg-[#050B14]/85">
        
        {/* Search & Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search evidence ID, subject, agency..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-emerald-400 font-sans transition-all focus:shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              />
            </div>

            {/* Dynamic Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'All Dossiers' },
                { id: 'RED_NOTICES', label: 'Red Notices' },
                { id: 'SURVEILLANCE', label: 'Surveillance' },
                { id: 'SIGHTINGS', label: 'Sightings' },
                { id: 'REVEALED', label: 'Unlocked Hashes' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`chip-3d px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    activeCategory === cat.id
                      ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                      : 'bg-black/40 text-crimenet-muted hover:text-white hover:bg-white/5 border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-crimenet-muted">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" /> LEVEL 5 CLEARANCE MASKED
            </span>
            <span>·</span>
            <span>Showing {filtered.length} verified dossiers</span>
          </div>
        </div>

        {/* ── MODE 1: 3D INTERACTIVE FLIP CARDS ── */}
        {viewMode === '3D_CARDS' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.slice(0, 30).map((item) => {
                const isFlipped = Boolean(flippedCardIds[item.id]);
                const isRevealed = Boolean(revealedHashes[item.id]);
                const displayHash = isRevealed 
                  ? revealedHashes[item.id] 
                  : (item.sha256_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

                return (
                  <div
                    key={item.id}
                    className="relative h-64 w-full cursor-pointer perspective-1000 select-none group"
                    onClick={() => selectEvidence(item)}
                  >
                    <div 
                      className={`flip-card-inner w-full h-full relative transition-transform duration-700 preserve-3d ${
                        isFlipped ? 'flip-card-flipped' : ''
                      }`}
                    >
                      {/* FRONT FACE OF CARD */}
                      <div className="absolute inset-0 backface-hidden rounded-2xl p-4 bg-gradient-to-b from-black/80 via-[#060D1A] to-black/90 border border-white/10 hover:border-emerald-500/50 transition-all flex flex-col justify-between depth-3d-box shadow-lg">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-bold text-emerald-400">{item.id}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {item.type || 'EVIDENCE'}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                            {item.title}
                          </h3>

                          <div className="text-xs text-white/60 font-mono mt-2">
                            Source: <span className="text-white">{item.source}</span>
                          </div>

                          <div className="text-[11px] text-crimenet-muted font-mono mt-1">
                            Officer: {item.uploaded_by || 'CBI Supervisory Unit'}
                          </div>
                        </div>

                        {/* Bottom Action Strip */}
                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                          <button
                            onClick={(e) => toggleCardFlip(item.id, e)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>FLIP FOR BSA §63 CERT</span>
                          </button>

                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> SECURE
                          </span>
                        </div>
                      </div>

                      {/* BACK FACE OF CARD (SECTION 63 BSA CERTIFICATE) */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-4 bg-gradient-to-b from-[#06141D] via-[#040A12] to-black border border-emerald-500/60 transition-all flex flex-col justify-between depth-3d-box shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                        <div>
                          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-2">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-xs">
                              <ShieldCheck className="w-4 h-4" /> BSA 2023 §63 CERTIFICATE
                            </div>
                            <button
                              onClick={(e) => toggleCardFlip(item.id, e)}
                              className="text-white/60 hover:text-white text-xs font-mono p-1"
                            >
                              ↩ FLIP
                            </button>
                          </div>

                          <div className="text-[10px] font-mono text-white/70 space-y-1">
                            <div><span className="text-white/40">RECORD:</span> {item.id}</div>
                            <div><span className="text-white/40">TIMESTAMP:</span> {item.timestamp || '2026-02-14 10:00:00 UTC'}</div>
                            <div><span className="text-white/40">ALGORITHM:</span> SHA-256 (FIPS 180-4)</div>
                          </div>

                          {/* Cryptographic Digest Box */}
                          <div className="mt-2.5 p-2 rounded-lg bg-black/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 break-all select-all flex items-center justify-between gap-1">
                            <span className="truncate">{displayHash}</span>
                            <button
                              onClick={(e) => handleCopyHash(item.id, displayHash, e)}
                              className="p-1 rounded hover:bg-white/10 text-emerald-400 shrink-0"
                              title="Copy SHA-256 Hash"
                            >
                              {copiedId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="text-[8px] font-mono text-white/50 mt-1.5">
                            Certified tamper-evident digital proof under Bharatiya Sakshya Adhiniyam, 2023.
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                          <button
                            onClick={(e) => handleOpenRevealModal(item, e)}
                            className="text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" /> AUTHENTICATE
                          </button>
                          <span className="text-emerald-400 font-bold">VERIFIED HASH</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MODE 2: 3D BLOCKCHAIN CHAIN-OF-CUSTODY VISUALIZER ── */}
        {viewMode === '3D_BLOCKCHAIN' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark pr-2 space-y-4">
            <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-crimenet-cyan" />
              <span>CRYPTOGRAPHIC IMMUTABLE CHAIN-OF-CUSTODY LEDGER · 4 MERKLE-LINKED BLOCKS</span>
            </div>

            <div className="space-y-4 relative">
              {CHAIN_BLOCKS.map((block, bIdx) => (
                <div key={block.blockNumber} className="relative">
                  <TiltCard3D glowColor="cyan" maxTilt={3} className="rounded-2xl">
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-black/90 via-[#060D1A] to-black/90 border border-crimenet-cyan/40 depth-3d-box shadow-xl">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-mono font-bold text-sm text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.4)]">
                            #{block.blockNumber}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{block.eventType}</span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                BLOCK CONFIRMED
                              </span>
                            </div>
                            <div className="text-xs text-crimenet-muted font-mono mt-0.5">
                              Custodian: <span className="text-white">{block.officer}</span> · {block.timestamp.replace('T', ' ').slice(0, 19)} UTC
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-mono text-cyan-300 font-bold">
                          REF: {block.evidenceId}
                        </span>
                      </div>

                      <p className="text-xs text-white/90 leading-relaxed font-sans mb-3">
                        {block.custodyAction}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono bg-black/60 p-2.5 rounded-xl border border-white/5">
                        <div>
                          <span className="text-white/40 block">PREVIOUS BLOCK HASH:</span>
                          <span className="text-white/70 truncate block">{block.previousHash}</span>
                        </div>
                        <div>
                          <span className="text-emerald-400 font-bold block">BLOCK SHA-256 HASH:</span>
                          <span className="text-emerald-300 truncate block select-all">{block.blockHash}</span>
                        </div>
                      </div>
                    </div>
                  </TiltCard3D>

                  {/* Blockchain Linker Line */}
                  {bIdx < CHAIN_BLOCKS.length - 1 && (
                    <div className="flex justify-center my-1">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-[0_0_8px_#00D4FF]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MODE 3: TABULAR ARCHIVE ── */}
        {viewMode === 'TABLE' && (
          <div className="flex-1 overflow-y-auto scrollbar-dark">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead className="sticky top-0 bg-[#060B14] z-10">
                <tr className="border-b border-white/10 text-crimenet-muted text-[10px] font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-3">RECORD ID</th>
                  <th className="py-2.5 px-3">SUBJECT DOSSIER</th>
                  <th className="py-2.5 px-3">SHA-256 HASH SEAL (PROTECTED)</th>
                  <th className="py-2.5 px-3">INTEGRITY</th>
                  <th className="py-2.5 px-3">SOURCE ATTRIBUTION</th>
                  <th className="py-2.5 px-3">PROVENANCE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((item) => {
                  const isRevealed = Boolean(revealedHashes[item.id]);
                  const displayHash = isRevealed 
                    ? revealedHashes[item.id] 
                    : '••••••••••••••••••••••••••••••••';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => selectEvidence(item)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-mono text-crimenet-cyan font-semibold">
                        {item.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className={`${isRevealed ? 'text-emerald-400 font-bold select-all' : 'text-crimenet-muted tracking-widest'}`}>
                            {isRevealed ? `${displayHash.slice(0, 20)}...` : displayHash}
                          </span>

                          {isRevealed ? (
                            <button
                              onClick={(e) => handleCopyHash(item.id, displayHash, e)}
                              className="p-1 rounded hover:bg-white/10 text-emerald-400 hover:text-emerald-300 shrink-0"
                              title="Copy Full SHA-256 Hash"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleOpenRevealModal(item, e)}
                              className="btn-3d-amber inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/35 text-amber-400 border border-amber-500/40 text-[9px] font-mono font-bold transition-all shadow-[0_0_8px_rgba(255,179,0,0.25)] shrink-0"
                              title="Authenticate to reveal full cryptographic hash"
                            >
                              <Lock className="w-2.5 h-2.5" /> REVEAL
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-2.5 h-2.5" /> {isRevealed ? 'UNLOCKED' : 'VERIFIED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-crimenet-muted font-mono text-[11px]">
                        {item.source}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-white/60">
                        {item.provenance_badge || 'FORENSIC'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      {/* ── HASH REVEAL SECURITY MODAL ── */}
      {revealModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <TiltCard3D glowColor="amber" maxTilt={3} className="w-full max-w-md">
            <div className="glass-panel p-6 rounded-2xl border border-crimenet-amber/40 shadow-2xl bg-[#070D18] space-y-4 depth-3d-box">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-crimenet-amber font-bold text-sm font-mono tracking-wider">
                  <KeyRound className="w-5 h-5" /> CLEARANCE LEVEL 5 AUTHORIZATION
                </div>
                <button
                  onClick={() => setRevealModalItem(null)}
                  className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-black/50 border border-white/10 space-y-1 font-mono">
                  <div className="text-[10px] text-crimenet-muted uppercase">Evidence Target ID</div>
                  <div className="text-white font-bold text-sm">{revealModalItem.id}</div>
                  <div className="text-crimenet-muted text-[11px] truncate">{revealModalItem.title}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/70 uppercase">
                    Enter Supervisory Secret Key (Devansh / Ayaan):
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    placeholder="Enter security key (e.g. crimenet2026)..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-amber font-mono"
                    autoFocus
                  />
                </div>

                {revealError && (
                  <div className="p-2.5 rounded-lg bg-crimenet-crimson/20 border border-crimenet-crimson/40 text-crimenet-crimson text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{revealError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  onClick={() => setRevealModalItem(null)}
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs font-mono transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleVerifyPassword}
                  disabled={isRevealing || !passwordInput.trim()}
                  className="btn-3d-amber px-4 py-1.5 rounded bg-crimenet-amber hover:bg-amber-400 text-black font-bold text-xs font-mono transition-colors disabled:opacity-40"
                >
                  {isRevealing ? 'AUTHENTICATING...' : 'AUTHORIZE & UNLOCK'}
                </button>
              </div>
            </div>
          </TiltCard3D>
        </div>
      )}

      {/* ── AUDIT LOGS MODAL ── */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-crimenet-cyan/40 shadow-2xl bg-[#070D18] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-crimenet-cyan font-bold text-sm font-mono tracking-wider">
                <History className="w-5 h-5" /> EVIDENCE CUSTODY AUDIT TRAIL
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-dark font-mono text-xs">
              {auditLogs.map((log: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-black/50 border border-white/5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-bold">{log.action || 'ACCESS_RECORD'}</div>
                    <div className="text-[10px] text-crimenet-muted mt-0.5">
                      Operator: <span className="text-crimenet-cyan">{log.user || 'Devansh Savla'}</span> · Target: {log.evidence_id || 'EV-001'}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-white/50">
                    {log.timestamp ? log.timestamp.replace('T', ' ').slice(0, 19) : '2026-02-14 11:20:00'}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-colors"
              >
                CLOSE AUDIT LOGS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
