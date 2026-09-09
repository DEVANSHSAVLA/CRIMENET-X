'use client';

import React from 'react';
import { Mic, Sparkles, CheckCircle2 } from 'lucide-react';
import { useInvestigation } from '@/context/investigation-context';
import { VoicePanel } from './voice-panel';

interface VoiceControlProps {
  contextEntityId?: string;
  onAction?: (action: string, payload: any) => void;
}

export function VoiceControl({ contextEntityId, onAction }: VoiceControlProps) {
  const { 
    isVoicePanelOpen, 
    setIsVoicePanelOpen, 
    voiceFeedbackNotice 
  } = useInvestigation();

  return (
    <>
      <div className="relative flex items-center gap-2">
        {/* Visual Action Confirmation Banner */}
        {voiceFeedbackNotice && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono font-bold text-emerald-400 animate-in fade-in slide-in-from-right-2 duration-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-xs">{voiceFeedbackNotice}</span>
          </div>
        )}

        {/* Global Voice Intelligence Trigger Button */}
        <button
          onClick={() => setIsVoicePanelOpen(true)}
          className={`relative p-2 rounded-lg border transition-all duration-300 flex items-center gap-1.5 ${
            isVoicePanelOpen
              ? 'bg-crimenet-cyan/20 border-crimenet-cyan text-white shadow-lg shadow-crimenet-cyan/20'
              : 'bg-white/5 border-white/10 text-crimenet-cyan hover:bg-crimenet-cyan/10 hover:border-crimenet-cyan/40'
          }`}
          title="Open Voice Intelligence Assistant (Alt+V / Ctrl+Space)"
        >
          <Mic className="w-4 h-4 text-crimenet-cyan" />
          <span className="hidden sm:inline text-xs font-mono font-bold text-white/90">
            Voice AI
          </span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        </button>

        {/* Voice Assistant Shortcut Chip */}
        <button
          onClick={() => setIsVoicePanelOpen(true)}
          className="hidden xl:flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-crimenet-muted hover:text-white border border-white/10 transition-colors"
          title="Global Voice Command Assistant"
        >
          <Sparkles className="w-3 h-3 text-crimenet-cyan" />
          <span>12 Languages</span>
        </button>
      </div>

      {/* Global Intelligent Voice Panel Modal */}
      <VoicePanel />
    </>
  );
}
