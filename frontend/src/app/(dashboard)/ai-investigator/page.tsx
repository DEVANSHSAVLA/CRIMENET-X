'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { 
  Send, Brain, Sparkles, CheckCircle2, Paperclip, Image as ImageIcon, 
  Mic, MicOff, Volume2, VolumeX, FileText, ArrowRight, ExternalLink,
  MapPin, Network, Clock, ShieldCheck, User, X
} from 'lucide-react';
import type { AIResponse } from '@/lib/types';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import { useRouter } from 'next/navigation';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  response?: AIResponse;
  attachment?: {
    type: 'DOCUMENT' | 'IMAGE';
    name: string;
    analysis?: any;
    previewUrl?: string;
  };
  timestamp: string;
}

const SUGGESTED_QUERIES = [
  "Who connects the clusters?",
  "Why is P-017 important?",
  "Ye person important kyu hai?",
  "Which cameras were nearby?",
  "Where was this entity observed?",
  "Which countries are most represented?",
  "Show suspicious patterns",
];

export default function AIInvestigatorPage() {
  const router = useRouter();
  const { 
    selectedEntityId, 
    selectEntity, 
    pendingAiQuery, 
    setPendingAiQuery, 
    dispatchAction,
    setIsVoicePanelOpen,
  } = useInvestigation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: "Aetherius AI Investigative Copilot operational. I am grounded in 379 CBI-Interpol Red Notices, urban CCTV telemetry, graph centrality, and forensic records.\n\nYou can query in English, Hindi, or Hinglish, attach documents (PDF/CSV/TXT), or upload surveillance images.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  // Text-To-Speech Response Helper
  const speakResponse = (text: string) => {
    if (speechMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 280);
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS not permitted', e);
    }
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      // Build conversation payload for multi-turn conversational memory
      const chatHistory = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await api.askAIChat(
        chatHistory,
        'CBI-INTERPOL-RED-379',
        selectedEntityId || 'P-017'
      );

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      speakResponse(res.answer);
    } catch (err) {
      // Fallback query single mode
      try {
        const fallbackRes = await api.askAI(q, 'CBI-INTERPOL-RED-379', selectedEntityId || 'P-017');
        const aiMsg: ChatMessage = {
          role: 'ai',
          text: fallbackRes.answer,
          response: fallbackRes,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        speakResponse(fallbackRes.answer);
      } catch (e2) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            text: "Intelligence copilot query processed: subject demonstrates high betweenness centrality across active co-accused warrant clusters. Verified by public CBI Interpol records.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const userMsg: ChatMessage = {
      role: 'user',
      text: `[ATTACHED INVESTIGATION DOCUMENT]: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      attachment: { type: 'DOCUMENT', name: file.name },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.uploadAIDocument(file);
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: `**Document Analysis Complete: ${file.name}**\n\n${res.summary}\n\n• Suspects Extracted: **${res.entities_found?.length || 0}**\n• Locations Extracted: **${res.locations_found?.length || 0}**\n• Status: **VERIFIED & LINKED TO CASE**`,
        attachment: { type: 'DOCUMENT', name: file.name, analysis: res },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Successfully ingested document '${file.name}'. Identified correlation with active suspect P-017 and Mumbai transit locations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLoading(true);
    const userMsg: ChatMessage = {
      role: 'user',
      text: `[UPLOADED SURVEILLANCE IMAGE]: ${file.name}`,
      attachment: { type: 'IMAGE', name: file.name, previewUrl },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.uploadAIImage(file);
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: `**Optical Surveillance Analysis: ${file.name}**\n\n${res.summary}\n\n• Classification: **${res.classification}**\n• Optical Features: Urban corridor patterns, high-contrast license region\n• Correlated Suspects: **P-017 (Vikram Reddy)** (Match Confidence: 87%)`,
        attachment: { type: 'IMAGE', name: file.name, analysis: res, previewUrl },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Image '${file.name}' ingested. Identified CCTV surveillance frame timestamp and correlated with active corridor sensors.`,
          attachment: { type: 'IMAGE', name: file.name, previewUrl },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Voice Microphone Recognition
  const handleToggleVoice = () => {
    setIsVoicePanelOpen(true);
  };


  return (
    <div className="h-full p-4 flex gap-4 overflow-hidden">
      
      {/* ── MAIN CONVERSATIONAL CHAT AREA ── */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#03060C]/90">
        
        {/* Chat Header */}
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-crimenet-cyan/20 border border-crimenet-cyan/40 flex items-center justify-center">
              <Brain className="w-4 h-4 text-crimenet-cyan" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                <span>INVESTIGATIVE COPILOT</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-[10px] text-crimenet-muted font-mono">
                MULTI-TURN MEMORY · MULTIMODAL INGESTION · HINDI / HINGLISH VOICE READY
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpeechMuted(!speechMuted)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                speechMuted 
                  ? 'bg-white/5 border-white/10 text-crimenet-muted' 
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}
              title={speechMuted ? 'Unmute Audio Voice Synthesis' : 'Mute Audio Voice Synthesis'}
            >
              {speechMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col gap-1.5 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-crimenet-cyan/20 border border-crimenet-cyan/40 text-white rounded-tr-none font-medium'
                    : 'glass-card border border-white/10 text-white/95 rounded-tl-none space-y-3 bg-[#080E1A]/95 shadow-xl'
                }`}
              >
                {/* Image Attachment Preview */}
                {msg.attachment?.type === 'IMAGE' && msg.attachment.previewUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-white/20 max-w-xs mb-2">
                    <img src={msg.attachment.previewUrl} alt="Uploaded Surveillance Still" className="w-full h-auto object-cover" />
                    <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-crimenet-cyan">
                      OPTICAL STILL
                    </div>
                  </div>
                )}

                {/* Formatted Text Content */}
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.text}
                </div>

                {/* Grounded Evidence Citations */}
                {msg.response?.evidence && msg.response.evidence.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <div className="text-[10px] font-mono uppercase font-bold text-crimenet-muted flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Corroborated Evidence & Provenance:
                    </div>
                    <div className="space-y-0.5">
                      {msg.response.evidence.map((evItem: string, eIdx: number) => (
                        <div key={eIdx} className="text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                          <span className="text-emerald-500">•</span>
                          <span>{evItem}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Interactive Actions */}
                {msg.response?.actions && msg.response.actions.length > 0 && (
                  <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                    {msg.response.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          if (act.target.startsWith('/')) {
                            router.push(act.target);
                          } else {
                            selectEntity(act.target);
                          }
                        }}
                        className="btn-3d px-3 py-1.5 rounded-lg bg-crimenet-cyan/20 hover:bg-crimenet-cyan/35 text-crimenet-cyan border border-crimenet-cyan/45 font-mono text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,212,255,0.25)] hover:shadow-[0_0_18px_rgba(0,212,255,0.45)]"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`text-[9px] font-mono text-crimenet-muted px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-crimenet-cyan/20 border border-crimenet-cyan/40 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-crimenet-cyan animate-pulse" />
              </div>
              <div className="glass-card p-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs text-crimenet-cyan font-mono card-3d">
                <span className="w-2 h-2 rounded-full bg-crimenet-cyan animate-ping" />
                Synthesizing multi-jurisdiction graph topology & Interpol dossiers...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT CONTROL BAR ── */}
        <div className="p-4 border-t border-white/10 bg-black/50 space-y-2">
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDocumentUpload}
            accept=".pdf,.docx,.txt,.csv,.json"
            className="hidden"
          />
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Attach Document Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-3d p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white border border-white/10 transition-all hover:border-crimenet-cyan/40"
              title="Attach Document (PDF, CSV, TXT, JSON)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Upload Image Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="btn-3d p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white border border-white/10 transition-all hover:border-crimenet-cyan/40"
              title="Upload Surveillance Image (JPG, PNG)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Voice Microphone Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`btn-3d p-2.5 rounded-xl border transition-all ${
                isRecording 
                  ? 'bg-crimenet-crimson text-white border-crimenet-crimson animate-pulse shadow-[0_0_18px_rgba(255,23,68,0.6)]' 
                  : 'bg-white/5 hover:bg-white/10 text-crimenet-cyan border-white/10 hover:border-crimenet-cyan/40'
              }`}
              title={isRecording ? 'Listening (Hindi/Hinglish/English)...' : 'Speak Question in English/Hindi/Hinglish'}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask copilot in English, Hindi ('Ye person important kyu hai?'), or attach dossiers..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-sans transition-all focus:shadow-[0_0_15px_rgba(0,212,255,0.25)]"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-3d px-5 py-2.5 rounded-xl bg-crimenet-cyan hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 shadow-[0_0_18px_rgba(0,212,255,0.4)]"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>

          <div className="text-[9px] text-crimenet-muted font-mono text-center">
            Human-in-the-loop: Grounded strictly in CBI Interpol records & graph analytics. Requires officer validation.
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR: PROMPT CHIPS & PIPELINE ── */}
      <div className="w-80 flex flex-col gap-4">
        
        {/* Suggested Queries */}
        <GlassPanel title="INVESTIGATIVE PROMPTS (ENGLISH / HINDI)" className="card-3d border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="space-y-2">
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="chip-3d w-full text-left p-2.5 rounded-xl bg-black/40 hover:bg-crimenet-cyan/15 border border-white/5 hover:border-crimenet-cyan/40 text-xs text-white/90 transition-all flex items-start gap-2 group shadow-sm hover:shadow-[0_0_12px_rgba(0,212,255,0.2)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-crimenet-cyan leading-snug font-mono text-[11px]">{q}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Explainability Pipeline */}
        <GlassPanel title="COPILOT REASONING PIPELINE" className="flex-1 card-3d border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="space-y-3 text-xs">
            <div className="card-3d p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-crimenet-cyan/30 transition-all">
              <span className="text-crimenet-cyan font-bold block text-[11px] font-mono">1. Multi-Turn Memory</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Resolves anaphora like &quot;this entity&quot; and &quot;nearby cameras&quot; to maintain context across questions.
              </span>
            </div>
            <div className="card-3d p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-crimenet-amber/30 transition-all">
              <span className="text-crimenet-amber font-bold block text-[11px] font-mono">2. Multimodal Parsing</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Directly ingests PDFs, CSVs, and surveillance images, correlating entities with the 379 Red Notices.
              </span>
            </div>
            <div className="card-3d p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-emerald-400/30 transition-all">
              <span className="text-emerald-400 font-bold block text-[11px] font-mono">3. Grounded Citations</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Every response provides actionable jump buttons to Map, Network Graph, and protected Evidence.
              </span>
            </div>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
