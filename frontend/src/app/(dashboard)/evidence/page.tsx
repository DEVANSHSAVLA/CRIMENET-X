'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  ShieldCheck, Search, Copy, Check, CheckCircle2, Lock, Unlock, 
  KeyRound, AlertCircle, X, ShieldAlert, FileText, History
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { EvidenceRecord } from '@/lib/types';

export default function EvidencePage() {
  const { selectEvidence } = useInvestigation();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filtered = evidenceList.filter((e) => {
    const q = search.toLowerCase();
    const hashToTest = revealedHashes[e.id] || e.sha256_hash || '';
    return (
      e.title.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      hashToTest.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
    );
  });

  const handleCopyHash = (id: string, hash: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden relative">
      
      {/* Header Banner */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-emerald-500">
        <div>
          <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> EVIDENCE INTEGRITY REPOSITORY
          </h2>
          <p className="text-[11px] text-crimenet-muted font-mono mt-0.5">
            CRYPTOGRAPHIC SHA-256 PROVENANCE HASHING · PROTECTED ARCHIVAL DOSSIERS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAuditLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-mono transition-colors"
          >
            <History className="w-3.5 h-3.5 text-crimenet-cyan" /> AUDIT TRAIL
          </button>
          <div className="text-right font-mono text-xs">
            <span className="text-crimenet-muted">TOTAL RECORDS:</span>{' '}
            <span className="text-emerald-400 font-bold">{evidenceList.length}</span>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <GlassPanel title="AUTHENTICATED DOSSIERS (CLICK ROW TO VIEW DRAWER)" className="flex-1 flex flex-col overflow-hidden">
        {/* Search & Metadata Bar */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evidence ID, subject, agency..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-sans"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-crimenet-muted">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" /> HASHES MASKED BY DEFAULT
            </span>
            <span>·</span>
            <span>Showing {filtered.length} verified dossiers</span>
          </div>
        </div>

        {/* Evidence Table */}
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
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-semibold transition-colors shrink-0"
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
                      {item.provenance_badge || 'SOURCE-DERIVED'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* ── SECURITY CLEARANCE PASSWORD MODAL ── */}
      {revealModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-amber-500/40 shadow-2xl bg-[#070D18] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono tracking-wider">
                <ShieldAlert className="w-5 h-5" /> SECURITY CLEARANCE REQUIRED
              </div>
              <button
                onClick={() => setRevealModalItem(null)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-white/80">
              <p>
                Accessing the cryptographic SHA-256 root hash for evidence record{' '}
                <span className="text-crimenet-cyan font-mono font-bold">{revealModalItem.id}</span> requires authorization.
              </p>
              <div className="p-2.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-crimenet-muted">
                Dossier: <span className="text-white">{revealModalItem.title}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-crimenet-muted tracking-wider">
                Clearance Secret Key
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-crimenet-muted absolute left-3 top-3" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  placeholder="Enter authorized clearance password..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-amber-400 font-mono"
                  autoFocus
                />
              </div>
            </div>

            {revealError && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-crimenet-crimson/20 border border-crimenet-crimson/40 text-xs text-crimenet-crimson animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{revealError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setRevealModalItem(null)}
                className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white text-xs font-mono transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleVerifyPassword}
                disabled={isRevealing || !passwordInput.trim()}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                {isRevealing ? 'VERIFYING...' : 'AUTHORIZE & REVEAL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG MODAL ── */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-white/20 shadow-2xl bg-[#070D18] space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-crimenet-cyan font-bold text-sm font-mono tracking-wider">
                <History className="w-5 h-5" /> EVIDENCE ACCESS & HASH REVEAL AUDIT LOG
              </div>
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="text-crimenet-muted hover:text-white p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-dark space-y-2">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-crimenet-muted">
                  No evidence hash reveal events recorded yet in current operational session.
                </div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs font-mono flex items-start justify-between gap-4 ${
                      log.status === 'APPROVED'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-crimson-950/20 border-crimenet-crimson/30 text-crimenet-crimson'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <span>[{log.event}]</span>
                        <span className="text-white">{log.evidence_id}</span>
                      </div>
                      <div className="text-[11px] text-white/70">{log.title}</div>
                      <div className="text-[10px] text-crimenet-muted">Officer: {log.user}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-crimenet-crimson/20 text-crimenet-crimson'
                      }`}>
                        {log.status}
                      </span>
                      <div className="text-[10px] text-crimenet-muted mt-1">{log.timestamp?.slice(0, 19)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
