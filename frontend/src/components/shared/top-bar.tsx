'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { VoiceControl } from '@/components/voice/voice-control';
import { ReportModal } from '@/components/panels/report-modal';
import { CompareModal } from '@/components/panels/compare-modal';
import { Search, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import type { InvestigationReport, InvestigationMode } from '@/lib/types';

export function TopBar() {
  const pathname = usePathname();
  const pageTitle = pathname.split('/').pop()?.replace('-', ' ').toUpperCase() || 'COMMAND CENTER';

  const {
    selectedEntityId,
    mode,
    setMode,
    selectEntity,
    isReportOpen,
    setIsReportOpen,
    isCompareOpen,
    setIsCompareOpen,
    dispatchAction,
  } = useInvestigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const rep = await api.generateReport('CBI-INTERPOL-RED-379');
      setReport(rep);
      setIsReportOpen(true);
    } catch (e) {
      console.warn('Report generation fallback', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    try {
      // Search entity list
      const res = await api.getEntities();
      const match = res.entities.find(
        (ent: any) =>
          ent.id.toLowerCase() === q.toLowerCase() ||
          ent.name?.toLowerCase().includes(q.toLowerCase()) ||
          ent.display_name?.toLowerCase().includes(q.toLowerCase())
      );
      if (match) {
        await selectEntity(match.id);
      } else {
        // Default to query as ID
        await selectEntity(q.toUpperCase());
      }
    } catch (err) {
      await selectEntity(q.toUpperCase());
    }
  };

  return (
    <>
      <div className="h-16 glass-panel border-b border-x-0 border-t-0 rounded-none flex items-center justify-between px-6 z-30 relative bg-crimenet-bg/90">
        
        {/* Left: Branding & Case ID */}
        <div className="flex items-center gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-crimenet-cyan tracking-wider">AETHERIUS</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 rounded font-mono text-white/70">SIH26189</span>
            </div>
            <h2 className="text-sm font-bold tracking-widest text-white mt-0.5">
              {pageTitle}
            </h2>
          </div>

          <div className="h-6 w-px bg-white/10" />

          {/* Global Suspect Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-56">
            <Search className="w-3.5 h-3.5 text-crimenet-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 379 suspects, cities..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan transition-colors font-sans"
            />
          </form>
        </div>

        {/* Center: Investigation Mode Toggle */}
        <div className="flex items-center p-1 bg-black/50 border border-white/10 rounded-xl gap-1">
          {(['EXPLORE', 'INVESTIGATE', 'COMPARE'] as InvestigationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                if (m === 'COMPARE') setIsCompareOpen(true);
              }}
              className={`chip-3d px-3.5 py-1.5 text-[10px] font-bold rounded-lg tracking-wider transition-all select-none ${
                mode === m
                  ? 'bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/50 shadow-md shadow-cyan-500/20 scale-[1.03]'
                  : 'text-crimenet-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Right: Controls & Voice */}
        <div className="flex items-center gap-3">
          
          {/* Report Button */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="btn-3d hologram-shimmer px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{isGenerating ? 'Generating...' : 'Report Dossier'}</span>
          </button>

          {/* Voice Intelligence Control */}
          <VoiceControl
            contextEntityId={selectedEntityId || undefined}
            onAction={(action, payload) => dispatchAction(action, payload)}
          />

          {/* Environment Status Badge - Interactive */}
          <button
            onClick={() => dispatchAction('OPEN_ADMIN', null)}
            className="chip-3d flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer group"
            title="Click to inspect Live System Operations & Telemetry"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">SYSTEM TELEMETRY</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        report={report}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => {
          setIsCompareOpen(false);
          setMode('EXPLORE');
        }}
        onSelectEntity={(id) => selectEntity(id)}
      />
    </>
  );
}
