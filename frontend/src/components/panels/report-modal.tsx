'use client';

import React, { useState } from 'react';
import { X, Printer, Download, ShieldCheck, FileText, CheckCircle } from 'lucide-react';
import type { InvestigationReport } from '@/lib/types';

interface ReportModalProps {
  report: InvestigationReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ report, isOpen, onClose }: ReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyHash = () => {
    navigator.clipboard.writeText(report.integrity_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-crimenet-bg border border-white/20 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                {report.title}
              </h3>
              <p className="text-[10px] text-crimenet-muted font-mono">
                REPORT ID: {report.report_id} · CLASSIFICATION: {report.security_classification}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs flex items-center gap-1 border border-white/10 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Dossier
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/10 text-crimenet-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-dark font-sans text-xs text-white/90">
          
          {/* Metadata Block */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px]">
            <div>
              <div className="text-crimenet-muted">ORGANIZATION:</div>
              <div className="font-bold text-white">TEAM AETHERIUS (SIH26189)</div>
              <div className="text-crimenet-muted mt-2">CASE FILE:</div>
              <div className="text-crimenet-cyan font-bold">{report.case_name}</div>
            </div>
            <div>
              <div className="text-crimenet-muted">GENERATED TIMESTAMP:</div>
              <div>{report.generated_at}</div>
              <div className="text-crimenet-muted mt-2">INTEGRITY SHA-256:</div>
              <div 
                onClick={copyHash} 
                className="truncate text-emerald-400 hover:underline cursor-pointer select-all"
                title="Click to copy SHA-256 hash"
              >
                {report.integrity_hash} {copied ? '(Copied!)' : ''}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-crimenet-cyan border-b border-white/10 pb-1">
              1. Executive Intelligence Summary
            </h4>
            <p className="leading-relaxed text-white/80">
              {report.executive_summary}
            </p>
          </div>

          {/* Focus Subject Record */}
          {report.focus_subject && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-widest text-crimenet-cyan border-b border-white/10 pb-1">
                2. Subject Analysis: {report.focus_subject.display_name}
              </h4>
              <div className="grid grid-cols-3 gap-3 p-3 rounded bg-white/5 border border-white/5">
                <div>
                  <span className="text-crimenet-muted block text-[10px]">NOTICE IDENTIFIER:</span>
                  <span className="font-mono font-bold">{report.focus_subject.notice_id}</span>
                </div>
                <div>
                  <span className="text-crimenet-muted block text-[10px]">NATIONALITY:</span>
                  <span>{report.focus_subject.nationalities ? report.focus_subject.nationalities.join(', ') : 'IN'}</span>
                </div>
                <div>
                  <span className="text-crimenet-muted block text-[10px]">RISK ASSESSMENT:</span>
                  <span className="font-bold text-crimenet-crimson">{report.focus_subject.risk_level}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Network Centrality Targets */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-crimenet-cyan border-b border-white/10 pb-1">
              3. High Centrality Graph Targets
            </h4>
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="border-b border-white/10 text-crimenet-muted">
                  <th className="py-2">SUSPECT</th>
                  <th className="py-2">CONNECTIONS</th>
                  <th className="py-2">BETWEENNESS</th>
                  <th className="py-2">CENTRALITY SCORE</th>
                </tr>
              </thead>
              <tbody>
                {report.top_targets_by_centrality.map((target, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 font-bold text-white">{target.name} ({target.entity_id})</td>
                    <td className="py-2">{target.degree}</td>
                    <td className="py-2 text-crimenet-cyan">{target.betweenness.toFixed(3)}</td>
                    <td className="py-2 font-bold text-emerald-400">{target.combined_score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Urban Context Monitoring */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-widest text-crimenet-cyan border-b border-white/10 pb-1">
              4. Urban Infrastructure & Sensor Coverage
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded bg-white/5 border border-white/5">
                <div className="text-lg font-bold font-mono text-crimenet-cyan">{report.urban_context.monitored_cameras}</div>
                <div className="text-[10px] text-crimenet-muted">Cameras Active</div>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/5">
                <div className="text-lg font-bold font-mono text-crimenet-amber">{report.urban_context.monitored_signals}</div>
                <div className="text-[10px] text-crimenet-muted">Traffic Signals</div>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/5">
                <div className="text-lg font-bold font-mono text-emerald-400">{report.urban_context.geographic_hubs}</div>
                <div className="text-[10px] text-crimenet-muted">Regional Hubs</div>
              </div>
            </div>
          </div>

          {/* Responsible AI Disclaimer */}
          <div className="p-4 rounded-lg bg-black/60 border border-crimenet-amber/30 text-crimenet-muted text-[10px] space-y-1">
            <div className="font-bold text-crimenet-amber uppercase flex items-center gap-1.5">
              RESPONSIBLE AI & EVIDENCE PROVENANCE NOTICE
            </div>
            <p>{report.responsible_ai_disclaimer}</p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black/40 text-[10px] text-crimenet-muted font-mono">
          <span>BLOCKCHAIN ANCHOR: {report.blockchain_anchor}</span>
          <span className="text-emerald-400 font-bold">DIGITALLY SIGNED DOSSIER</span>
        </div>
      </div>
    </div>
  );
}
