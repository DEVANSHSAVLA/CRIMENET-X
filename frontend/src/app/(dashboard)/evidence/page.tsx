'use client';

import React, { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  ShieldCheck, Search, Copy, Check, CheckCircle2 
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { EvidenceRecord } from '@/lib/types';

export default function EvidencePage() {
  const { selectEvidence } = useInvestigation();
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filtered = evidenceList.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.sha256_hash.toLowerCase().includes(q) ||
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
    <div className="h-full p-6 flex flex-col space-y-4 overflow-hidden">
      
      {/* Header Banner */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-emerald-500">
        <div>
          <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> EVIDENCE INTEGRITY REPOSITORY
          </h2>
          <p className="text-[11px] text-crimenet-muted font-mono mt-0.5">
            CRYPTOGRAPHIC SHA-256 PROVENANCE HASHING · 379 OFFICIAL RED NOTICE DOSSIERS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right font-mono text-xs">
            <span className="text-crimenet-muted">TOTAL RECORDS:</span>{' '}
            <span className="text-emerald-400 font-bold">{evidenceList.length}</span>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <GlassPanel title="AUTHENTICATED DOSSIERS (CLICK ROW TO VIEW DRAWER)" className="flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="mb-3 flex items-center gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evidence ID, suspect, SHA-256..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-sans"
            />
          </div>
          <span className="text-[10px] font-mono text-crimenet-muted">
            Showing {filtered.length} verified items
          </span>
        </div>

        {/* Evidence Table */}
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead className="sticky top-0 bg-[#060B14] z-10">
              <tr className="border-b border-white/10 text-crimenet-muted text-[10px] font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3">RECORD ID</th>
                <th className="py-2.5 px-3">SUBJECT DOSSIER</th>
                <th className="py-2.5 px-3">SHA-256 HASH SEAL</th>
                <th className="py-2.5 px-3">INTEGRITY</th>
                <th className="py-2.5 px-3">SOURCE ATTRIBUTION</th>
                <th className="py-2.5 px-3">PROVENANCE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((item) => (
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
                  <td className="py-2.5 px-3 font-mono text-[10px] text-white/70 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{item.sha256_hash.slice(0, 24)}...</span>
                      <button
                        onClick={(e) => handleCopyHash(item.id, item.sha256_hash, e)}
                        className="p-1 rounded hover:bg-white/10 text-crimenet-muted hover:text-white shrink-0"
                        title="Copy SHA-256 Hash"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-crimenet-muted font-mono text-[11px]">
                    {item.source}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-white/60">
                    {item.provenance_badge || 'SOURCE-DERIVED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

    </div>
  );
}
