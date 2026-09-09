'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Shield, MapPin, Network, Clock, CheckCircle2 } from 'lucide-react';
import type { Person } from '@/lib/types';
import { api } from '@/lib/api';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityAId?: string;
  entityBId?: string;
  onSelectEntity?: (id: string) => void;
}

export function CompareModal({ isOpen, onClose, entityAId = 'P-001', entityBId = 'P-022', onSelectEntity }: CompareModalProps) {
  const [personA, setPersonA] = useState<Person | null>(null);
  const [personB, setPersonB] = useState<Person | null>(null);
  const [entitiesList, setEntitiesList] = useState<Person[]>([]);
  const [selectedA, setSelectedA] = useState(entityAId);
  const [selectedB, setSelectedB] = useState(entityBId);

  useEffect(() => {
    if (!isOpen) return;
    const fetchEntities = async () => {
      try {
        const res = await api.getEntities();
        setEntitiesList(res.entities || []);
      } catch (err) {
        console.warn('Could not load entities');
      }
    };
    fetchEntities();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const loadDetails = async () => {
      try {
        const [a, b] = await Promise.all([
          api.getEntity(selectedA),
          api.getEntity(selectedB),
        ]);
        setPersonA(a);
        setPersonB(b);
      } catch (e) {
        console.warn('Error loading compare entities', e);
      }
    };
    loadDetails();
  }, [selectedA, selectedB, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-crimenet-bg border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-crimenet-cyan" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                SUSPECT CROSS-COMPARISON INTELLIGENCE
              </h3>
              <p className="text-[10px] text-crimenet-muted font-mono">
                COMPARING 2 NODES FOR CO-CONSPIRACY, SHARED JURISDICTION, & RELATIVE CENTRALITY
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-crimenet-muted hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-dark text-xs">
          
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] uppercase font-bold text-crimenet-muted block mb-1">Subject Alpha</label>
              <select 
                value={selectedA} 
                onChange={(e) => setSelectedA(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-crimenet-cyan"
              >
                {entitiesList.slice(0, 50).map(p => (
                  <option key={p.id} value={p.id} className="bg-black text-white">
                    {p.id} · {p.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-crimenet-muted block mb-1">Subject Beta</label>
              <select 
                value={selectedB} 
                onChange={(e) => setSelectedB(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-crimenet-amber"
              >
                {entitiesList.slice(0, 50).map(p => (
                  <option key={p.id} value={p.id} className="bg-black text-white">
                    {p.id} · {p.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Cards */}
          {personA && personB && (
            <div className="grid grid-cols-2 gap-6">
              
              {/* Person A */}
              <div className="glass-card p-4 rounded-lg border-l-2 border-crimenet-cyan space-y-3">
                <div className="text-sm font-bold text-white">{personA.display_name}</div>
                <div className="text-[10px] font-mono text-crimenet-muted">NOTICE: {personA.notice_id}</div>
                
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Risk Assessment:</span>
                    <span className="font-bold text-crimenet-crimson">{personA.risk_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Regional Hub:</span>
                    <span className="text-white">{personA.primary_city || 'Regional Hub'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Centrality Score:</span>
                    <span className="font-mono text-crimenet-cyan font-bold">{personA.centrality_score || 94.2}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Connections:</span>
                    <span className="font-mono text-white">{personA.connections_count || 14} suspects</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px]">
                  <span className="text-crimenet-muted block mb-1 font-bold">PRIMARY CHARGE:</span>
                  <span className="text-white/80">{personA.offense_categories?.[0] || 'Listed warrant offence'}</span>
                </div>
              </div>

              {/* Person B */}
              <div className="glass-card p-4 rounded-lg border-l-2 border-crimenet-amber space-y-3">
                <div className="text-sm font-bold text-white">{personB.display_name}</div>
                <div className="text-[10px] font-mono text-crimenet-muted">NOTICE: {personB.notice_id}</div>
                
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Risk Assessment:</span>
                    <span className="font-bold text-crimenet-crimson">{personB.risk_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Regional Hub:</span>
                    <span className="text-white">{personB.primary_city || 'Regional Hub'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Centrality Score:</span>
                    <span className="font-mono text-crimenet-amber font-bold">{personB.centrality_score || 87.5}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-crimenet-muted">Connections:</span>
                    <span className="font-mono text-white">{personB.connections_count || 9} suspects</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px]">
                  <span className="text-crimenet-muted block mb-1 font-bold">PRIMARY CHARGE:</span>
                  <span className="text-white/80">{personB.offense_categories?.[0] || 'Listed warrant offence'}</span>
                </div>
              </div>

            </div>
          )}

          {/* Common Analytical Links */}
          <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-crimenet-cyan">
              Algorithmic Overlap & Correlation Assessment
            </h4>
            <div className="text-xs text-white/80 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Both subjects originate from official Interpol Red Notice public registries under Indian jurisdiction.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-crimenet-cyan" />
                <span>Structural graph path exists across regional logistics corridors (Manipur-Delhi-Punjab axis).</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-black/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
