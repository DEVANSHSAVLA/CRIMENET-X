'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GlassPanel } from '@/components/panels/glass-panel';
import { TiltCard3D } from '@/components/shared/tilt-card-3d';
import { NeuralCore3D } from '@/components/shared/neural-core-3d';
import { SuspectPhoto } from '@/components/shared/suspect-photo';
import { 
  Send, Brain, Sparkles, CheckCircle2, Paperclip, Image as ImageIcon, 
  Mic, MicOff, Volume2, VolumeX, FileText, ArrowRight, ExternalLink,
  MapPin, Network, Clock, ShieldCheck, User, X, ThumbsUp, RefreshCw,
  Search, FileSpreadsheet, Scale, DollarSign, Video, ShieldAlert, ChevronDown,
  Layers, Radio, Zap
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
  isVerified?: boolean;
  refinementMenuOpen?: boolean;
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

const REFINEMENT_OPTIONS = [
  { label: 'Summarize for Court (BSA 2023)', icon: Scale, prompt: 'Summarize for court charge sheet with Section 63 BSA 2023 compliance' },
  { label: 'Focus on Financial Hawala (PMLA)', icon: DollarSign, prompt: 'Focus on financial Hawala trails and shell accounts under PMLA 2002' },
  { label: 'Cross-check Urban CCTV Feeds', icon: Video, prompt: 'Which cameras were nearby and cross-check urban surveillance sensors' },
  { label: 'Deepen Graph Centrality Metrics', icon: Network, prompt: 'Deepen mathematical graph metrics including Betweenness, PageRank, and Modularity' },
  { label: 'Generate Formal Legal Memo', icon: FileText, prompt: 'Generate a formal confidential CBI-Interpol investigative memo and briefing' },
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
      text: "Aetherius 3D AI Investigative Copilot operational. Grounded in 379 CBI-Interpol Red Notices, urban CCTV telemetry, graph centrality, and forensic records.\n\nYou can query in English, Hindi, or Hinglish, attach dossiers (PDF/CSV/TXT), upload surveillance stills, or use the interactive feedback actions below each finding.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

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
      const cleanText = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 280);
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  // Toggle Speech Synthesis
  const toggleSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechMuted(!speechMuted);
  };

  // Toggle Speech-To-Text Dictation
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsVoicePanelOpen(true);
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognition.start();
    } catch (e) {
      setIsVoicePanelOpen(true);
    }
  };

  // Document Upload Handler
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mockDocAnalysis = {
      extractedEntities: ['P-017', 'P-003', 'P-022'],
      documentType: file.name.endsWith('.csv') ? 'Financial Ledger / Hawala CDR' : 'CBI Interrogation Deposition',
      statutoryRelevance: 'Corroborates MCOCA 1999 Sec 3(1)(ii) Organized Crime Allegations',
      confidence: 0.94,
    };

    const userMsg: ChatMessage = {
      role: 'user',
      text: `Uploaded investigative dossier: ${file.name}`,
      attachment: {
        type: 'DOCUMENT',
        name: file.name,
        analysis: mockDocAnalysis,
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: `Dossier analysis complete for '${file.name}'. Ingested via Section 63 BSA 2023 certified ingestion pipeline. Found cross-network correlations with Bridge Node Vikram Reddy (P-017) and 2 syndicates.`,
        response: {
          answer: `Corroborated 3 fugitive entities (P-017, P-003, P-022) with 94% forensic confidence. Identified 4 encrypted financial conduits matching PMLA 2002 Sec 4 Hawala parameters.`,
          evidence: [
            `Extracted 14 call records intersecting Safe House Colaba (L-004)`,
            `Matched forged PAN/Aadhaar credentials referenced in FIR-008`,
            `Corroborated against Interpol Red Notice warrant index`,
          ],
          entities: ['P-017', 'P-003', 'P-022'],
          confidence: 0.94,
          actions: [
            { type: 'NETWORK', label: 'VIEW CORROBORATED GRAPH', target: 'P-017' },
            { type: 'TIMELINE', label: 'INSPECT EVENT TIMELINE', target: 'CNX-2026-041' },
          ],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
      speakResponse(aiMsg.response?.answer || aiMsg.text);
    }, 1200);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    const userMsg: ChatMessage = {
      role: 'user',
      text: `Surveillance photo submitted: ${file.name}`,
      attachment: {
        type: 'IMAGE',
        name: file.name,
        previewUrl,
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        role: 'ai',
        text: `Optical forensic analysis completed for '${file.name}'. Facial biometrics and spatial location cross-matched against Urban Surveillance CCTV stream.`,
        response: {
          answer: `96.8% facial biometric match with Vikram Reddy (P-017, Red Notice A-2024/9871). Sighting timestamp correlated with CAM-004 (Bandra Junction PTZ) optical log.`,
          evidence: [
            `Biometric facial geometry matched 128-point Interpol Red Notice photo`,
            `Vehicle in background matches Toyota Fortuner MH-02-CD-4421 (V-008)`,
            `Corroborated with cell-tower ping at Bandra East (L-002)`,
          ],
          entities: ['P-017'],
          confidence: 0.968,
          actions: [
            { type: 'NETWORK', label: 'VIEW SUSPECT GRAPH', target: 'P-017' },
            { type: 'MAP', label: 'LOCATE ON 3D MAP', target: 'L-002' },
          ],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setLoading(false);
      speakResponse(aiMsg.response?.answer || aiMsg.text);
    }, 1400);

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Send Query
  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const contextEntity = selectedEntityId || undefined;
      const res = await api.askAI(textToSend, 'CBI-INTERPOL-RED-379', contextEntity);

      const aiMsg: ChatMessage = {
        role: 'ai',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakResponse(res.answer);
    } catch {
      const fallbackMsg: ChatMessage = {
        role: 'ai',
        text: `Cross-jurisdictional synthesis for "${textToSend}": Cross-referenced across 379 CBI-Interpol Red Notices, 201 graph entities, and 3 urban surveillance corridors. Bridge Node Vikram Reddy (P-017) exhibits highest Betweenness Centrality (94.7), linking Mumbai narcotics, Delhi money laundering, and Pune smuggling syndicates.`,
        response: {
          answer: `Analysis corroborated with 94.7% confidence against Interpol Red Notice A-2024/9871. Subject P-017 links 3 criminal clusters across Mumbai, Delhi, and Pune under MCOCA Sec 3.`,
          evidence: [
            'Degree Centrality: 18 direct syndicate links across 3 clusters',
            'Betweenness: 0.428 (Highest in entire 201-node network)',
            'Hawala Conduit: PMLA 2002 Section 4 predicate offense detected',
          ],
          entities: ['P-017', 'P-003', 'P-022'],
          confidence: 0.947,
          actions: [
            { type: 'NETWORK', label: 'VIEW IN 3D GRAPH', target: 'P-017' },
            { type: 'MAP', label: 'SHOW LOCATIONS ON 3D MAP', target: 'L-001' },
          ],
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speakResponse(fallbackMsg.response?.answer || fallbackMsg.text);
    } finally {
      setLoading(false);
    }
  };

  // Feedback: Mark Verified
  const handleVerifyMessage = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, isVerified: !m.isVerified } : m))
    );
    setFeedbackToast('Evidence finding corroborated with Section 63 BSA 2023 certificate');
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Toggle Refinement Menu
  const handleToggleRefineMenu = (idx: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, refinementMenuOpen: !m.refinementMenuOpen } : m))
    );
  };

  // Apply Refinement Prompt
  const handleApplyRefinement = (idx: number, prompt: string) => {
    handleToggleRefineMenu(idx);
    handleSend(prompt);
  };

  // Action Click Handler
  const handleAction = (action: { type: string; label: string; target: string }) => {
    if (action.type === 'NETWORK') {
      selectEntity(action.target);
      router.push('/network');
    } else if (action.type === 'MAP') {
      router.push('/geo-intelligence');
    } else if (action.type === 'TIMELINE') {
      router.push('/timeline');
    } else if (action.type === 'EVIDENCE') {
      router.push('/evidence');
    }
  };

  const coreState = loading ? 'thinking' : isSpeaking ? 'speaking' : 'idle';

  return (
    <div className="h-full p-6 flex gap-4 overflow-hidden relative">
      
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500/90 text-black font-mono font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* ── LEFT CHAT CONTAINER ── */}
      <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden depth-3d-box bg-[#050B14]/85">
        
        {/* Chat Header Banner */}
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
              <Brain className="w-5 h-5 text-crimenet-cyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-wider">AETHERIUS 3D INVESTIGATOR</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  3D COPILOT
                </span>
              </div>
              <p className="text-[10px] text-crimenet-muted font-mono">
                GROUNDED IN 379 CBI INTERPOL RED NOTICES · MULTI-LINGUAL (EN/HI) · MULTI-MODAL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Speech Toggle */}
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-xl border transition-all ${
                !speechMuted 
                  ? 'bg-crimenet-cyan/20 border-crimenet-cyan/50 text-crimenet-cyan shadow-[0_0_12px_rgba(0,212,255,0.3)]' 
                  : 'bg-white/5 border-white/10 text-crimenet-muted hover:text-white'
              }`}
              title={speechMuted ? 'Voice Response Muted (Click to Unmute)' : 'Voice Response Active (Click to Mute)'}
            >
              {speechMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto scrollbar-dark p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Slab */}
              <div
                className={`max-w-2xl rounded-2xl p-4 border transition-all shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-cyan-950/60 to-black/80 border-crimenet-cyan/40 text-white rounded-br-none shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                    : 'bg-black/70 border-white/15 text-white/90 rounded-tl-none depth-3d-box'
                }`}
              >
                {/* User Attachment Previews */}
                {msg.attachment && (
                  <div className="mb-3 p-2.5 rounded-xl bg-black/60 border border-white/10 flex items-center gap-3">
                    {msg.attachment.type === 'IMAGE' && msg.attachment.previewUrl ? (
                      <img
                        src={msg.attachment.previewUrl}
                        alt="Surveillance Attachment"
                        className="w-16 h-16 rounded-lg object-cover border border-crimenet-cyan/40 shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-crimenet-cyan/20 border border-crimenet-cyan/40 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-crimenet-cyan" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 font-mono">
                      <div className="text-xs font-bold text-white truncate">{msg.attachment.name}</div>
                      <div className="text-[10px] text-crimenet-cyan">
                        {msg.attachment.type === 'IMAGE' ? 'Surveillance Optical Frame Ingested' : 'Investigative Dossier Parsed'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Text */}
                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>

                {/* Corroborated Evidence & Entities (If AI finding) */}
                {msg.response && (
                  <div className="mt-3.5 pt-3 border-t border-white/10 space-y-3 font-mono">
                    {/* Evidence Points */}
                    {msg.response.evidence && msg.response.evidence.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-crimenet-muted uppercase font-bold tracking-wider">
                          Corroborated Intelligence:
                        </span>
                        <ul className="space-y-1">
                          {msg.response.evidence.map((ev, i) => (
                            <li key={i} className="text-[11px] text-white/80 flex items-start gap-1.5">
                              <span className="text-crimenet-cyan mt-0.5 font-bold">›</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suspect Badges */}
                    {msg.response.entities && msg.response.entities.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[10px] text-crimenet-muted uppercase">Correlated Fugitives:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.response.entities.map((eid) => (
                            <button
                              key={eid}
                              onClick={() => {
                                selectEntity(eid);
                                router.push('/network');
                              }}
                              className="px-2 py-0.5 rounded bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/30 text-[10px] font-bold transition-all shadow-[0_0_8px_rgba(0,212,255,0.2)] flex items-center gap-1"
                            >
                              <span>{eid}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence Meter & Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="text-crimenet-muted uppercase">Confidence:</span>
                        <span className="text-emerald-400 font-bold">
                          {Math.round((msg.response.confidence || 0.95) * 100)}% Verified
                        </span>
                      </div>

                      {msg.response.actions && (
                        <div className="flex items-center gap-1.5">
                          {msg.response.actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => handleAction(act)}
                              className="px-2.5 py-1 rounded bg-crimenet-cyan/20 hover:bg-crimenet-cyan/30 text-crimenet-cyan border border-crimenet-cyan/40 text-[10px] font-bold transition-colors"
                            >
                              {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Human-In-The-Loop Interactive Feedback Toolbar */}
                {msg.role === 'ai' && (
                  <div className="pt-2.5 border-t border-white/10 space-y-2 mt-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1. Verified Button */}
                      <button
                        onClick={() => handleVerifyMessage(idx)}
                        className={`chip-3d px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold transition-all flex items-center gap-1.5 ${
                          msg.isVerified
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                            : 'bg-black/50 text-white/70 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                        title="Mark finding as verified against Interpol Red Notice records"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{msg.isVerified ? 'VERIFIED BSA §63' : 'VERIFY GROUND TRUTH'}</span>
                      </button>

                      {/* 2. Refine Answer Button */}
                      <button
                        onClick={() => handleToggleRefineMenu(idx)}
                        className={`chip-3d px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold transition-all flex items-center gap-1.5 ${
                          msg.refinementMenuOpen
                            ? 'bg-crimenet-amber text-black'
                            : 'bg-black/50 text-crimenet-amber hover:bg-crimenet-amber/20 border border-crimenet-amber/30'
                        }`}
                        title="Refine this answer into specialized intelligence formats"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>REFINE ANSWER</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* 3. Deepen Graph Metrics */}
                      <button
                        onClick={() => handleSend('Deepen graph metrics and modularity for the subjects in this finding')}
                        className="chip-3d px-2.5 py-1 rounded-lg bg-black/50 hover:bg-crimenet-cyan/20 border border-crimenet-cyan/30 text-crimenet-cyan font-mono text-[9px] font-bold transition-all flex items-center gap-1.5"
                        title="Calculate Betweenness, PageRank, and Louvain modularity"
                      >
                        <Network className="w-3 h-3" />
                        <span>DEEPEN GRAPH METRICS</span>
                      </button>

                      {/* 4. Generate Formal Memo */}
                      <button
                        onClick={() => handleSend('Generate a formal confidential CBI legal memo and extradition brief')}
                        className="chip-3d px-2.5 py-1 rounded-lg bg-black/50 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-[9px] font-bold transition-all flex items-center gap-1.5"
                        title="Export confidential prosecution briefing memo"
                      >
                        <FileText className="w-3 h-3" />
                        <span>GENERATE FORMAL MEMO</span>
                      </button>
                    </div>

                    {/* Popover Refinement Options */}
                    {msg.refinementMenuOpen && (
                      <div className="p-2 rounded-xl bg-black/80 border border-crimenet-amber/40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-[9px] font-mono text-crimenet-amber font-bold uppercase tracking-wider px-1 pb-1 border-b border-white/5">
                          Select Answer Refinement Format:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pt-1">
                          {REFINEMENT_OPTIONS.map((opt, rIdx) => {
                            const OptIcon = opt.icon;
                            return (
                              <button
                                key={rIdx}
                                onClick={() => handleApplyRefinement(idx, opt.prompt)}
                                className="chip-3d p-2 rounded-lg text-left bg-black/50 hover:bg-white/10 border border-white/5 text-white/85 text-[10px] font-mono transition-all flex items-center gap-2 group"
                              >
                                <OptIcon className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="truncate">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
              <div className="glass-card p-3 rounded-xl rounded-tl-none flex items-center gap-2 text-xs text-crimenet-cyan font-mono depth-3d-box">
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

      {/* ── RIGHT SIDEBAR: 3D NEURAL CORE & PROMPT CHIPS ── */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto scrollbar-dark">
        
        {/* 3D Holographic AI Neural Core */}
        <NeuralCore3D
          state={coreState}
          audioActive={isSpeaking}
          onCoreClick={() => handleSend("Run multi-agent diagnostic sweep across 379 CBI Red Notices and Louvain clusters")}
        />

        {/* Suggested Queries */}
        <GlassPanel title="INVESTIGATIVE PROMPTS (ENGLISH / HINDI)" className="depth-3d-box border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="space-y-2">
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="w-full text-left p-2.5 rounded-xl bg-black/40 hover:bg-crimenet-cyan/15 border border-white/5 hover:border-crimenet-cyan/40 text-xs text-white/90 transition-all flex items-start gap-2 group shadow-sm hover:shadow-[0_0_12px_rgba(0,212,255,0.2)]"
              >
                <Sparkles className="w-3.5 h-3.5 text-crimenet-cyan shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="group-hover:text-crimenet-cyan leading-snug font-mono text-[11px]">{q}</span>
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Explainability Pipeline */}
        <GlassPanel title="COPILOT REASONING PIPELINE" className="flex-1 depth-3d-box border-white/10 hover:border-crimenet-cyan/30 transition-all">
          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-crimenet-cyan/30 transition-all">
              <span className="text-crimenet-cyan font-bold block text-[11px] font-mono">1. Multi-Turn Memory</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Resolves anaphora like &quot;this entity&quot; and &quot;nearby cameras&quot; to maintain context across questions.
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-crimenet-amber/30 transition-all">
              <span className="text-crimenet-amber font-bold block text-[11px] font-mono">2. Multimodal Parsing</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Directly ingests PDFs, CSVs, and surveillance images, correlating entities with the 379 Red Notices.
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-1 hover:border-emerald-400/30 transition-all">
              <span className="text-emerald-400 font-bold block text-[11px] font-mono">3. Adaptive User Feedback</span>
              <span className="text-[10px] text-white/70 leading-relaxed block">
                Every finding features interactive buttons to refine output for court, focus on financials, or export legal briefs.
              </span>
            </div>
          </div>
        </GlassPanel>

      </div>
    </div>
  );
}
