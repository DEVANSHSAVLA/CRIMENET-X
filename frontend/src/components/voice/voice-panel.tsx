'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Square, Sparkles, Check, X, AlertTriangle, 
  ShieldAlert, Layers, Network, Clock, BarChart3, Brain, MapPin, Send, 
  RefreshCw, CornerDownLeft, Languages, Activity
} from 'lucide-react';
import { api } from '@/lib/api';
import { useInvestigation } from '@/context/investigation-context';
import { BrowserSpeechProvider } from '@/lib/voice/voice-provider';
import { INDIAN_LANGUAGES_REGISTRY, type VoiceState, type LanguageOption, type DisambiguationOption } from '@/lib/voice/voice-types';
import type { VoiceCommandResult } from '@/lib/types';

const SIH_COMMAND_CHIPS = [
  { label: 'Show nearby cameras', category: 'MAP', hinglish: 'cameras dikhao', query: 'Show nearby cameras.' },
  { label: 'Is person ka network dikhao', category: 'NETWORK', hinglish: 'network dikhao', query: 'Is person ka network dikhao.' },
  { label: 'Ye person important kyu hai?', category: 'AI', hinglish: 'kyu important hai?', query: 'Why is this entity important?' },
  { label: 'Open timeline', category: 'TIMELINE', hinglish: 'timeline kholo', query: 'Open the timeline.' },
  { label: 'Play timeline', category: 'TIMELINE', hinglish: 'timeline chalao', query: 'Play the timeline.' },
  { label: 'Focus on Mumbai', category: 'MAP', hinglish: 'mumbai dikhao', query: 'Focus on Mumbai.' },
  { label: 'Show bridge nodes', category: 'NETWORK', hinglish: 'bridge nodes dikhao', query: 'Show bridge nodes.' },
  { label: 'Compare P-017 & P-032', category: 'NETWORK', hinglish: 'in dono ko compare karo', query: 'Compare P-017 and P-032.' },
  { label: 'Show countries breakdown', category: 'ANALYTICS', hinglish: 'desh dikhao', query: 'Show countries breakdown.' },
  { label: 'Show evidence for relationship', category: 'EVIDENCE', hinglish: 'saboot dikhao', query: 'Show evidence for this relationship.' },
  { label: 'Iska source kya hai?', category: 'AI', hinglish: 'source batao', query: 'What is the provenance source for this?' },
  { label: 'Show Rahul (Disambiguate)', category: 'DISAMBIGUATE', hinglish: 'Rahul ko dikhao', query: 'Show Rahul.' },
  { label: 'Delete case (Guarded)', category: 'SAFETY', hinglish: 'case delete karo', query: 'Delete this case.' },
  { label: 'Reset investigation', category: 'MAP', hinglish: 'reset karo', query: 'Reset the investigation.' },
];

export function VoicePanel() {
  const {
    isVoicePanelOpen,
    setIsVoicePanelOpen,
    selectedEntityId,
    dispatchAction,
    disambiguationState,
    setDisambiguationState,
    sensitiveConfirmation,
    setSensitiveConfirmation,
  } = useInvestigation();

  const [voiceState, setVoiceState] = useState<VoiceState>('READY');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSpeechMuted, setIsSpeechMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<Array<{ time: string; text: string; intent?: string }>>([]);
  const [activeChipCategory, setActiveChipCategory] = useState<string>('ALL');

  const providerRef = useRef<BrowserSpeechProvider | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Speech Provider
  useEffect(() => {
    providerRef.current = new BrowserSpeechProvider();
    return () => {
      providerRef.current?.abortListening();
    };
  }, []);

  // Keyboard shortcut listener: Alt+V to toggle Voice Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'v') || (e.ctrlKey && e.code === 'Space')) {
        e.preventDefault();
        setIsVoicePanelOpen(!isVoicePanelOpen);
      }
      if (e.key === 'Escape' && isVoicePanelOpen) {
        setIsVoicePanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVoicePanelOpen, setIsVoicePanelOpen]);

  // Audio Amplitude Waveform Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      phase += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const bars = 36;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        // Base sine wave modulation
        const wave = Math.sin(phase + i * 0.25);
        // Boost with real microphone audio level
        const scale = voiceState === 'LISTENING' ? Math.max(0.12, audioLevel * 2.8) : 0.08;
        const barHeight = Math.max(4, Math.abs(wave) * height * scale);

        const x = i * (barWidth + 2);
        const y = centerY - barHeight / 2;

        // Color based on voice state
        if (voiceState === 'LISTENING') {
          ctx.fillStyle = audioLevel > 0.2 ? '#00D4FF' : '#FF1744';
        } else if (voiceState === 'PROCESSING' || voiceState === 'UNDERSTANDING') {
          ctx.fillStyle = '#FFB300';
        } else if (voiceState === 'EXECUTING') {
          ctx.fillStyle = '#10B981';
        } else if (voiceState === 'RESPONDING') {
          ctx.fillStyle = '#A855F7';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceState, audioLevel]);

  // Interruption: Stop speech synthesis when user triggers microphone
  const stopSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakResponse = (text: string, langCode?: string) => {
    if (isSpeechMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 260);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.05;
      if (langCode === 'hi-IN') {
        utter.lang = 'hi-IN';
      }
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  };

  // Push-to-Talk / Click-to-Talk Handler
  const toggleListening = async () => {
    if (voiceState === 'LISTENING') {
      providerRef.current?.stopListening();
      setVoiceState('PROCESSING');
      return;
    }

    // Stop any ongoing speech synthesis to prevent voice collision
    stopSpeechSynthesis();
    setErrorMessage(null);
    setPartialTranscript('');
    setFinalTranscript('');
    setVoiceState('LISTENING');

    if (!providerRef.current) {
      providerRef.current = new BrowserSpeechProvider();
    }

    await providerRef.current.startListening(
      {
        onStart: () => {
          setVoiceState('LISTENING');
        },
        onPartialTranscript: (partial) => {
          setPartialTranscript(partial);
        },
        onFinalTranscript: async (final) => {
          setFinalTranscript(final);
          setPartialTranscript('');
          await executeCommand(final);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onError: (err) => {
          console.warn('Voice error callback:', err);
          setErrorMessage(err);
          setVoiceState('ERROR');
          setTimeout(() => setVoiceState('READY'), 4000);
        },
        onEnd: () => {
          setVoiceState((curr) => (curr === 'LISTENING' ? 'READY' : curr));
        },
      },
      selectedLanguage
    );
  };

  // Core Command Dispatcher
  const executeCommand = async (commandText: string) => {
    const trimmed = commandText.trim();
    if (!trimmed) {
      setVoiceState('READY');
      return;
    }

    setVoiceState('PROCESSING');

    // Add to history
    setCommandHistory((prev) => [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: trimmed },
      ...prev.slice(0, 7),
    ]);

    try {
      setVoiceState('UNDERSTANDING');
      const res = await api.sendVoiceCommand(
        trimmed,
        selectedEntityId || undefined,
        selectedLanguage,
        disambiguationState?.options
      );

      setLastResult(res);
      setVoiceState('EXECUTING');

      // Update history with recognized intent
      setCommandHistory((prev) => [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: trimmed, intent: res.intent },
        ...prev.slice(1, 8),
      ]);

      // Speak response aloud if available
      if (res.spoken_response) {
        setVoiceState('RESPONDING');
        speakResponse(res.spoken_response, res.language);
      }

      // If disambiguation required, update disambiguation state
      if (res.is_disambiguation && res.disambiguation_options) {
        setDisambiguationState({
          query: trimmed,
          options: res.disambiguation_options,
        });
      } else {
        // Clear disambiguation if resolving a chosen option
        setDisambiguationState(null);
      }

      // If sensitive confirmation required
      if (res.requires_confirmation) {
        setSensitiveConfirmation({
          message: res.confirmation_message || 'This action requires officer authorization.',
          action: res.action,
          payload: res.data,
        });
      }

      // Dispatch global action to investigation context
      dispatchAction(res.action, { ...res.data, feedback_notice: res.feedback_notice });

      setTimeout(() => {
        setVoiceState('READY');
      }, 2500);
    } catch (err: any) {
      console.warn('Voice command execution failed:', err);
      setErrorMessage(err?.message || 'Failed to process voice command. Please check server connectivity.');
      setVoiceState('ERROR');
      setTimeout(() => setVoiceState('READY'), 3500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setManualInput('');
    setFinalTranscript(text);
    executeCommand(text);
  };

  if (!isVoicePanelOpen) return null;

  const currentLangObj = INDIAN_LANGUAGES_REGISTRY.find((l) => l.code === selectedLanguage) || INDIAN_LANGUAGES_REGISTRY[0];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-crimenet-panel border border-crimenet-cyan/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5 overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-crimenet-cyan via-crimenet-crimson to-crimenet-amber" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-crimenet-cyan/10 border border-crimenet-cyan/30">
              <Sparkles className="w-5 h-5 text-crimenet-cyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-crimenet-cyan uppercase tracking-widest">
                  AETHERIUS VOICE INTELLIGENCE
                </span>
                <span className="text-[9px] px-2 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  FULL-PROJECT LAYER
                </span>
              </div>
              <div className="text-[11px] text-crimenet-muted mt-0.5">
                Speak naturally in 12 Indian Languages & Hinglish · Global Map, Graph, Timeline & AI Dispatch
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              stopSpeechSynthesis();
              providerRef.current?.stopListening();
              setIsVoicePanelOpen(false);
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selector Bar & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/50 border border-white/10 text-xs">
          <div className="flex items-center gap-1.5 text-crimenet-muted font-mono text-[11px]">
            <Languages className="w-4 h-4 text-crimenet-cyan" />
            <span>INPUT LANGUAGE:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-900 border border-crimenet-cyan/30 text-white rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-crimenet-cyan transition-colors cursor-pointer"
            >
              {INDIAN_LANGUAGES_REGISTRY.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.nativeName}) — [{l.status}]
                </option>
              ))}
            </select>

            <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
              currentLangObj.status === 'SUPPORTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              currentLangObj.status === 'LIMITED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {currentLangObj.status}
            </span>
          </div>
        </div>

        {/* Real-time Amplitude Waveform Canvas */}
        <div className="relative h-14 bg-black/70 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-2">
          <canvas ref={canvasRef} width={500} height={50} className="w-full h-full block" />
          <div className="absolute top-1.5 left-2 flex items-center gap-1.5 text-[9px] font-mono text-crimenet-muted">
            <Activity className="w-3 h-3 text-crimenet-cyan" />
            <span>LIVE MICROPHONE AUDIO ANALYZER</span>
          </div>
          <div className="absolute top-1.5 right-2 text-[9px] font-mono font-bold text-white/70">
            STATE: <span className="text-crimenet-cyan">{voiceState}</span>
          </div>
        </div>

        {/* Main Central Microphone Interaction Orb */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <button
            onClick={toggleListening}
            className={`relative p-5 rounded-full border-2 transition-all duration-300 shadow-2xl flex items-center justify-center ${
              voiceState === 'LISTENING'
                ? 'bg-crimenet-crimson text-white border-white scale-110 shadow-crimenet-crimson/50 animate-pulse'
                : voiceState === 'PROCESSING' || voiceState === 'UNDERSTANDING'
                ? 'bg-amber-500 text-black border-white animate-bounce'
                : voiceState === 'EXECUTING'
                ? 'bg-emerald-500 text-black border-white'
                : voiceState === 'RESPONDING'
                ? 'bg-purple-600 text-white border-white'
                : 'bg-crimenet-cyan/20 border-crimenet-cyan text-crimenet-cyan hover:scale-105 hover:bg-crimenet-cyan/30 shadow-crimenet-cyan/30'
            }`}
            title="Click to speak (Press again to stop)"
          >
            <Mic className="w-8 h-8" />
            {voiceState === 'LISTENING' && (
              <span className="absolute -inset-2 rounded-full border border-crimenet-crimson animate-ping" />
            )}
          </button>

          <div className="text-center">
            <div className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              {voiceState === 'READY' && 'CLICK MICROPHONE TO SPEAK'}
              {voiceState === 'LISTENING' && 'LISTENING TO NATURAL SPEECH...'}
              {voiceState === 'PROCESSING' && 'PROCESSING AUDIO BUFFER...'}
              {voiceState === 'UNDERSTANDING' && 'EXTRACTING INTENT & CONTEXT...'}
              {voiceState === 'EXECUTING' && 'DISPATCHING CANONICAL ACTION...'}
              {voiceState === 'RESPONDING' && 'SPEAKING INTELLIGENCE RESPONSE...'}
              {voiceState === 'ERROR' && 'VOICE ENGINE ERROR'}
            </div>
            <div className="text-[10px] text-crimenet-muted font-mono mt-0.5">
              Short commands, questions, or follow-ups ("Is person ka network dikhao", "Why is he important?")
            </div>
          </div>
        </div>

        {/* Streaming Partial / Final Transcript Box */}
        {(partialTranscript || finalTranscript) && (
          <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[10px] font-mono text-crimenet-muted uppercase">
              <span>LIVE TRANSCRIPT</span>
              {partialTranscript && <span className="text-crimenet-cyan animate-pulse">STREAMING...</span>}
              {finalTranscript && <span className="text-emerald-400">FINALIZED</span>}
            </div>
            <div className="text-sm text-white font-medium">
              &quot;{partialTranscript || finalTranscript}&quot;
            </div>
          </div>
        )}

        {/* Intent Recognition Gauge & Spoken Feedback */}
        {lastResult && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-black/80 to-slate-900/80 border border-crimenet-cyan/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-crimenet-cyan/20 text-crimenet-cyan border border-crimenet-cyan/40">
                  INTENT: {lastResult.intent || lastResult.action}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  CONFIDENCE: {Math.round((lastResult.confidence || 0.95) * 100)}%
                </span>
              </div>

              {/* TTS Controls */}
              <div className="flex items-center gap-1.5">
                {isSpeaking && (
                  <button
                    onClick={stopSpeechSynthesis}
                    className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[9px] font-mono flex items-center gap-1"
                    title="Stop Audio"
                  >
                    <Square className="w-3 h-3" /> STOP
                  </button>
                )}
                <button
                  onClick={() => setIsSpeechMuted(!isSpeechMuted)}
                  className="p-1 rounded hover:bg-white/10 text-crimenet-muted hover:text-white"
                  title={isSpeechMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
                >
                  {isSpeechMuted ? <VolumeX className="w-4 h-4 text-crimenet-crimson" /> : <Volume2 className="w-4 h-4 text-crimenet-cyan" />}
                </button>
              </div>
            </div>

            {lastResult.spoken_response && (
              <div className="text-xs text-white/90 leading-relaxed font-sans border-t border-white/5 pt-1.5 flex items-start gap-2">
                <span className="text-crimenet-cyan font-bold shrink-0 mt-0.5">AETHERIUS:</span>
                <span>{lastResult.spoken_response}</span>
              </div>
            )}
          </div>
        )}

        {/* Disambiguation Modal Selector if multiple options found */}
        {disambiguationState && disambiguationState.options.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              DISAMBIGUATION REQUIRED ({disambiguationState.options.length} Matches Found)
            </div>
            <div className="text-[11px] text-white/80">
              Multiple suspects matched your search for &quot;{disambiguationState.query}&quot;. Say &quot;Number 1&quot;, &quot;Number 2&quot;, or click below:
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {disambiguationState.options.map((opt: DisambiguationOption, idx: number) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    executeCommand(`Select ${opt.id}`);
                  }}
                  className="p-2 rounded-lg bg-black/60 border border-white/10 hover:border-amber-400/60 text-left transition-colors font-mono"
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>[{idx + 1}] {opt.label}</span>
                    <span className="text-[9px] text-amber-400">{opt.id}</span>
                  </div>
                  {opt.details && (
                    <div className="text-[10px] text-crimenet-muted truncate mt-0.5">
                      {opt.details}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sensitive Action Security Confirmation */}
        {sensitiveConfirmation && (
          <div className="p-4 rounded-xl bg-crimenet-crimson/10 border border-crimenet-crimson/40 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-sm font-bold text-crimenet-crimson font-mono">
              <ShieldAlert className="w-5 h-5" />
              SECURITY CONFIRMATION REQUIRED
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              {sensitiveConfirmation.message}
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setSensitiveConfirmation(null)}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSensitiveConfirmation(null);
                  dispatchAction('CONFIRMED_ACTION', sensitiveConfirmation.payload);
                }}
                className="px-3 py-1 rounded bg-crimenet-crimson hover:bg-red-700 text-xs font-semibold text-white"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-crimenet-crimson/20 border border-crimenet-crimson/40 text-xs text-crimenet-crimson font-mono flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-white hover:text-crimenet-muted">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SIH Demonstration Quick Command Chips */}
        <div className="space-y-2 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-crimenet-muted font-bold">
              SIH Interactive Voice Commands (English / Hindi / Hinglish)
            </span>
            <div className="flex gap-1 text-[9px] font-mono">
              {['ALL', 'MAP', 'NETWORK', 'TIMELINE', 'AI'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveChipCategory(cat)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    activeChipCategory === cat ? 'bg-crimenet-cyan text-black font-bold' : 'text-crimenet-muted hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-dark pr-1">
            {SIH_COMMAND_CHIPS.filter(
              (c) => activeChipCategory === 'ALL' || c.category === activeChipCategory
            ).map((chip, i) => (
              <button
                key={i}
                onClick={() => executeCommand(chip.query)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-crimenet-cyan/20 border border-white/10 hover:border-crimenet-cyan/40 text-left transition-all text-[11px] text-white/90 hover:text-crimenet-cyan flex items-center gap-1.5 group"
              >
                <span>{chip.label}</span>
                <span className="text-[9px] font-mono text-crimenet-muted group-hover:text-amber-300">
                  [{chip.hinglish}]
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Keyboard Text Input Fallback (Accessibility & No-Mic Environments) */}
        <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Type any natural voice question or command... (e.g. 'Show nearby cameras', 'Is person ka network dikhao')"
            className="flex-1 bg-black/80 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-crimenet-muted focus:outline-none focus:border-crimenet-cyan font-sans transition-colors"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-4 py-2 rounded-xl bg-crimenet-cyan hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Execute</span>
          </button>
        </form>

        {/* Bottom Bar: Status, Shortcut Hint & Clear */}
        <div className="flex items-center justify-between text-[10px] font-mono text-crimenet-muted border-t border-white/5 pt-2">
          <div>
            SHORTCUT: <code className="bg-black/50 px-1.5 py-0.5 rounded text-crimenet-cyan">Alt + V</code> or <code className="bg-black/50 px-1.5 py-0.5 rounded text-crimenet-cyan">Ctrl + Space</code>
          </div>
          <div>
            ACTIVE CONTEXT: <span className="text-white font-bold">{selectedEntityId || 'P-017'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
