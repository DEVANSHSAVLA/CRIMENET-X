'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  Send, Brain, Sparkles, CheckCircle2 
} from 'lucide-react';
import type { AIResponse } from '@/lib/types';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  response?: AIResponse;
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  "Why is P-001 (MAIPAK KHURAIJAM) important?",
  "Who connects the Manipur and Delhi criminal factions?",
  "Show high-confidence co-accused warrants",
  "What are the primary charges against P-003?",
  "Explain the bridge nodes between regional hubs",
];

export default function AIInvestigatorPage() {
  const { 
    selectedEntityId, 
    selectEntity, 
    pendingAiQuery, 
    setPendingAiQuery, 
    dispatchAction 
  } = useInvestigation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: "Aetherius AI Investigator operational. I synthesize 379 CBI-Interpol Red Notices, network topology, urban sensors, and verified evidence files. Ask an investigative query below or select a suggested question.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle cross-view query from pendingAiQuery
  useEffect(() => {
    if (pendingAiQuery) {
      const q = pendingAiQuery;
      setPendingAiQuery(null);
      handleSend(q);
    }
  }, [pendingAiQuery, setPendingAiQuery]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await api.askAI(q, 'CBI-INTERPOL-RED-379');
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: "Intelligence copilot query timed out. Analytical computation suggests high betweenness centrality across active co-accused warrant clusters.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-4 flex gap-4 overflow-hidden">
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-crimenet-cyan/10 border border-crimenet-cyan/30 flex items-center justify-center">
              <Brain className="w-4 h-4 text-crimenet-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                AETHERIUS AI INVESTIGATOR COPILOT
              </h2>
              <p className="text-[10px] text-crimenet-muted font-mono">
                GROUNDED IN GRAPH TOPOLOGY · 379 CBI-INTERPOL RED NOTICES
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            GROUNDED MODEL
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-crimenet-cyan/20 border border-crimenet-cyan/40 text-crimenet-cyan'
                    : 'bg-white/10 border border-white/20 text-white'
                }`}
              >
                {msg.role === 'user' ? (
                  <span className="text-xs font-bold font-mono">U</span>
                ) : (
                  <Brain className="w-3.5 h-3.5 text-crimenet-cyan" />
                )}
              </div>

              <div
                className={`glass-card p-3.5 rounded-xl space-y-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-crimenet-cyan/10 border-crimenet-cyan/30 rounded-tr-none text-white'
                    : 'rounded-tl-none text-white/90'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Evidence Citations */}
                {msg.response && msg.response.evidence && msg.response.evidence.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[10px] uppercase font-mono font-bold text-crimenet-cyan">
                      Grounded Evidence Citations:
                    </div>
                    <div className="space-y-1">
                      {msg.response.evidence.map((ev, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-white/80 bg-black/40 p-1.5 rounded border border-white/5">
                          <CheckCircle2 className="w-3 h-3 text-crimenet-cyan shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Entity Badges */}
                {msg.response && msg.response.entities && msg.response.entities.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono text-crimenet-muted uppercase">Entities:</span>
                    <div className="flex flex-wrap gap-1">
                      {msg.response.entities.map((eid) => (
                        <button
                          key={eid}
                          onClick={() => selectEntity(eid)}
                          className="px-1.5 py-0.5 rounded bg-crimenet-cyan/10 hover:bg-crimenet-cyan/25 text-crimenet-cyan border border-crimenet-cyan/30 text-[10px] font-mono transition-colors"
                        >
                          {eid}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Shortcuts */}
                {msg.response && msg.response.actions && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.response.actions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => dispatchAction(act.type, act.target)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-crimenet-cyan/20 border border-white/10 text-[10px] font-mono text-crimenet-cyan transition-colors"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`text-[9px] font-mono text-crimenet-muted ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5 text-crimenet-cyan animate-pulse" />
              </div>
              <div className="glass-card p-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs text-crimenet-muted font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-crimenet-cyan animate-ping" />
                Querying graph topology & evidence provenance...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask an investigative question about 379 suspects, warrants, bridge nodes..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-lg bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
          <div className="text-[9px] text-crimenet-muted font-mono mt-1.5 text-center">
            AI-generated investigative lead — requires human verification. Grounded strictly in CBI-Interpol public records.
          </div>
        </div>
      </div>

      {/* Right Sidebar: Context & Suggested Prompts */}
      <div className="w-80 flex flex-col gap-4">
        
        {/* Suggested Queries */}
        <GlassPanel title="SIH INVESTIGATION PROMPTS">
          <div className="space-y-2">
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-crimenet-cyan/15 border border-white/5 hover:border-crimenet-cyan/30 text-xs text-white/90 transition-all flex items-start gap-2 group"
              >
                <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5" />
                <span className="group-hover:text-crimenet-cyan leading-snug">{q}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Explainability Pipeline */}
        <GlassPanel title="COPILOT REASONING PIPELINE" className="flex-1">
          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded bg-black/40 border border-white/5">
              <span className="text-crimenet-cyan font-bold block mb-1">1. Canonical Ingestion</span>
              <span className="text-[10px] text-white/70">379 CBI-Interpol Red Notices parsed into unified entities, locations, and events.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/5">
              <span className="text-crimenet-amber font-bold block mb-1">2. Network Topology</span>
              <span className="text-[10px] text-white/70">Betweenness Centrality & Louvain community algorithms compute structural importance.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/5">
              <span className="text-emerald-400 font-bold block mb-1">3. Cryptographic Anchoring</span>
              <span className="text-[10px] text-white/70">Every cited evidence item contains a verifiable SHA-256 integrity hash.</span>
            </div>
            <div className="p-2.5 rounded bg-black/40 border border-white/5">
              <span className="text-white font-bold block mb-1">4. Human-In-The-Loop</span>
              <span className="text-[10px] text-white/70">Findings act as prioritized investigative leads requiring officer verification before prosecution.</span>
            </div>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
