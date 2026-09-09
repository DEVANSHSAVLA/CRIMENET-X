'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, Sparkles, Check, X, Globe, Languages } from 'lucide-react';
import { api } from '@/lib/api';

interface VoiceControlProps {
  contextEntityId?: string;
  onAction?: (action: string, payload: any) => void;
}

const INDIAN_LANGUAGES = [
  { code: 'auto', label: 'Auto Detect', bcp47: 'en-IN', badge: 'AUTO' },
  { code: 'en-IN', label: 'English (India)', bcp47: 'en-IN', badge: 'EN-IN' },
  { code: 'hi-IN', label: 'हिंदी / Hinglish', bcp47: 'hi-IN', badge: 'HI-IN' },
  { code: 'mr-IN', label: 'मराठी (Marathi)', bcp47: 'mr-IN', badge: 'MR-IN' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)', bcp47: 'gu-IN', badge: 'GU-IN' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)', bcp47: 'bn-IN', badge: 'BN-IN' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)', bcp47: 'ta-IN', badge: 'TA-IN' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)', bcp47: 'te-IN', badge: 'TE-IN' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', bcp47: 'kn-IN', badge: 'KN-IN' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)', bcp47: 'ml-IN', badge: 'ML-IN' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', bcp47: 'pa-IN', badge: 'PA-IN' },
  { code: 'od-IN', label: 'ଓଡ଼ିଆ (Odia)', bcp47: 'or-IN', badge: 'OD-IN' },
];

const DEMO_COMMANDS = [
  { 
    cmd: "Why is this entity important?", 
    hinglish: "kyu important hai?", 
    indic: "यह महत्वपूर्ण क्यों है?", 
    desc: "Evidence-grounded rationale" 
  },
  { 
    cmd: "Show this entity's network.", 
    hinglish: "network dikhao", 
    indic: "नेटवर्क संबंध दिखाओ", 
    desc: "Ego network topology focus" 
  },
  { 
    cmd: "Show nearby cameras.", 
    hinglish: "cameras dikhao", 
    indic: "कैमरे दिखाओ", 
    desc: "Illuminates urban CCTV layer" 
  },
  { 
    cmd: "Show traffic signals in this area.", 
    hinglish: "signals dikhao", 
    indic: "ट्रैफिक सिग्नल दिखाओ", 
    desc: "Real-time intersection telemetry" 
  },
  { 
    cmd: "Show the timeline for this investigation.", 
    hinglish: "timeline dikhao", 
    indic: "घटनाक्रम दिखाओ", 
    desc: "Chronological events view" 
  },
  { 
    cmd: "Focus on Mumbai.", 
    hinglish: "mumbai pe zoom karo", 
    indic: "मुंबई दिखाओ", 
    desc: "Redirect 3D geospatial camera" 
  },
  { 
    cmd: "Reset overview.", 
    hinglish: "reset karo", 
    indic: "शुरू से दिखाओ", 
    desc: "Full national command overview" 
  }
];

export function VoiceControl({ contextEntityId, onAction }: VoiceControlProps) {
  const [state, setState] = useState<'READY' | 'LISTENING' | 'PROCESSING' | 'EXECUTING' | 'ERROR'>('READY');
  const [transcript, setTranscript] = useState('');
  const [spokenFeedback, setSpokenFeedback] = useState<string | null>(null);
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [requiresConfirmation, setRequiresConfirmation] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Active language info
  const activeLangObj = INDIAN_LANGUAGES.find(l => l.code === selectedLanguage) || INDIAN_LANGUAGES[0];

  // Initialize Web Speech API with selected language
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = activeLangObj.bcp47;

        recognition.onstart = () => {
          setState('LISTENING');
          setTranscript(`Listening in [${activeLangObj.badge}]...`);
        };

        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          await handleCommand(text);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error', event.error);
          setState('ERROR');
          setTranscript(`Voice error: ${event.error || 'Unavailable'}`);
          setTimeout(() => setState('READY'), 3000);
        };

        recognition.onend = () => {
          if (state === 'LISTENING') {
            setState('READY');
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [contextEntityId, selectedLanguage, activeLangObj.bcp47, activeLangObj.badge]);

  const toggleListening = () => {
    if (state === 'LISTENING') {
      recognitionRef.current?.stop();
      setState('READY');
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = activeLangObj.bcp47;
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Recognition already started');
        }
      } else {
        // SpeechRecognition not supported in this browser, open manual command menu
        setIsOpenMenu(true);
        setTranscript('Microphone unavailable in browser. Select a test command:');
      }
    }
  };

  const handleCommand = async (commandText: string) => {
    setState('PROCESSING');

    // Security check: Guard destructive commands
    if (commandText.toLowerCase().includes('delete') || commandText.toLowerCase().includes('remove case')) {
      setRequiresConfirmation(commandText);
      setState('ERROR');
      return;
    }

    try {
      const res = await api.sendVoiceCommand(commandText, contextEntityId, selectedLanguage);
      setState('EXECUTING');
      setSpokenFeedback(res.spoken_response);

      // Speak response aloud using browser SpeechSynthesis if available
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(res.spoken_response);
        utterance.rate = 1.05;
        // Match speech synthesis language to Hindi/Indian voice if available
        if (res.language === 'hi-IN') {
          utterance.lang = 'hi-IN';
        }
        window.speechSynthesis.speak(utterance);
      }

      // Propagate action to parent UI
      if (onAction) {
        onAction(res.action, res.data);
      }

      setTimeout(() => {
        setState('READY');
        setTranscript('');
      }, 4000);
    } catch (err) {
      setState('ERROR');
      setTranscript('Command execution failed');
      setTimeout(() => setState('READY'), 3000);
    }
  };

  const executeChipCommand = (cmd: string) => {
    setTranscript(cmd);
    handleCommand(cmd);
    setIsOpenMenu(false);
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Waveform visualizer active when listening */}
      {state === 'LISTENING' && (
        <div className="flex items-center gap-0.5 h-5 px-2 bg-crimenet-crimson/10 border border-crimenet-crimson/40 rounded-full animate-pulse">
          <span className="w-0.5 h-3 bg-crimenet-crimson animate-pulse" />
          <span className="w-0.5 h-4 bg-crimenet-crimson animate-pulse delay-75" />
          <span className="w-0.5 h-2 bg-crimenet-crimson animate-pulse delay-150" />
          <span className="w-0.5 h-4 bg-crimenet-crimson animate-pulse delay-100" />
          <span className="text-[10px] font-mono font-bold text-crimenet-crimson ml-1">
            LISTENING [{activeLangObj.badge}]...
          </span>
        </div>
      )}

      {/* Language Indicator & Quick Selector */}
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
        className="bg-black/60 text-crimenet-cyan border border-white/10 rounded px-1.5 py-1 text-[10px] font-mono hover:border-crimenet-cyan/40 transition-colors cursor-pointer outline-none"
        title="Voice Recognition Language (12 Indian Languages + Hinglish)"
      >
        {INDIAN_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
            {lang.label}
          </option>
        ))}
      </select>

      {/* Main Mic Button */}
      <button
        onClick={toggleListening}
        title={`Voice Intelligence Control [${activeLangObj.label}]`}
        className={`relative p-2 rounded-lg border transition-all duration-300 flex items-center justify-center ${
          state === 'LISTENING' 
            ? 'bg-crimenet-crimson/20 border-crimenet-crimson text-crimenet-crimson glow-crimson scale-105' :
          state === 'PROCESSING' 
            ? 'bg-crimenet-amber/20 border-crimenet-amber text-crimenet-amber animate-pulse' :
          state === 'EXECUTING'
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' :
            'bg-white/5 border-white/10 text-crimenet-cyan hover:bg-crimenet-cyan/10 hover:border-crimenet-cyan/40'
        }`}
      >
        <Mic className="w-4 h-4" />
        {state === 'LISTENING' && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-crimenet-crimson animate-ping" />
        )}
      </button>

      {/* Quick Voice Demo Dropdown Trigger */}
      <button
        onClick={() => setIsOpenMenu(!isOpenMenu)}
        className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center gap-1"
        title="Open Multilingual Voice Testing Menu"
      >
        <Sparkles className="w-3 h-3 text-crimenet-cyan" /> Voice Menu
      </button>

      {/* Spoken Response Tooltip */}
      {spokenFeedback && (
        <div className="absolute top-11 right-0 w-80 p-2.5 rounded-lg bg-black/95 border border-crimenet-cyan/40 shadow-2xl text-xs z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-crimenet-cyan font-bold text-[10px] uppercase mb-1">
            <Volume2 className="w-3.5 h-3.5" /> Aetherius Voice Response [{activeLangObj.badge}]
          </div>
          <p className="text-white/90 text-xs leading-relaxed">{spokenFeedback}</p>
        </div>
      )}

      {/* Voice Commands Quick Menu (Top Killer Demo Commands across Languages) */}
      {isOpenMenu && (
        <div className="absolute top-11 right-0 w-96 p-3 rounded-lg bg-black/95 border border-white/10 shadow-2xl z-50 space-y-2">
          <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-crimenet-cyan" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-crimenet-muted">
                Multilingual Voice Demo (12 Languages + Hinglish)
              </span>
            </div>
            <button onClick={() => setIsOpenMenu(false)} className="text-white/50 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10px] text-crimenet-muted font-mono">
            Click any query below to execute voice dispatch without microphone:
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-dark pr-1">
            {DEMO_COMMANDS.map((item, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded bg-white/5 border border-white/5 hover:border-crimenet-cyan/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-crimenet-cyan uppercase tracking-wider">
                    {item.desc}
                  </span>
                </div>
                
                {/* Command Action Buttons */}
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    onClick={() => executeChipCommand(item.cmd)}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-crimenet-cyan/20 text-white hover:text-crimenet-cyan text-xs font-medium transition-colors"
                    title="Run in English"
                  >
                    EN: &quot;{item.cmd}&quot;
                  </button>
                  <button
                    onClick={() => executeChipCommand(item.hinglish)}
                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors"
                    title="Run in Hinglish"
                  >
                    Hinglish: &quot;{item.hinglish}&quot;
                  </button>
                  <button
                    onClick={() => executeChipCommand(item.indic)}
                    className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-colors"
                    title="Run in Hindi"
                  >
                    हिंदी: &quot;{item.indic}&quot;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Guard for Destructive Actions */}
      {requiresConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-crimenet-panel p-6 rounded-xl border border-crimenet-crimson/50 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-crimenet-crimson font-bold text-sm">
              <AlertCircle className="w-5 h-5" /> SECURITY CONFIRMATION REQUIRED
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              Voice command &quot;{requiresConfirmation}&quot; is restricted. Destructive operations require explicit human confirmation.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setRequiresConfirmation(null)}
                className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => setRequiresConfirmation(null)}
                className="px-3 py-1.5 rounded bg-crimenet-crimson hover:bg-red-700 text-xs font-semibold text-white"
              >
                Reject Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

