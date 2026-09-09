'use client';

import React, { useEffect, useState } from 'react';
import { Brain, Sparkles, Activity, Radio, Zap } from 'lucide-react';

interface NeuralCore3DProps {
  state?: 'idle' | 'thinking' | 'speaking';
  audioActive?: boolean;
  className?: string;
  onCoreClick?: () => void;
}

export function NeuralCore3D({
  state = 'idle',
  audioActive = false,
  className = '',
  onCoreClick,
}: NeuralCore3DProps) {
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 25, 40, 60, 45, 75, 50, 30, 20]);

  // Animate waveform when speaking or thinking
  useEffect(() => {
    let animId: number;
    const updateWaves = () => {
      if (state === 'speaking' || audioActive) {
        setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 60) + 15));
      } else if (state === 'thinking') {
        setWaveHeights(prev => prev.map((_, i) => Math.floor(Math.sin(Date.now() / 150 + i) * 20) + 30));
      } else {
        setWaveHeights([10, 15, 20, 25, 20, 15, 12, 10, 8]);
      }
      animId = requestAnimationFrame(updateWaves);
    };

    const interval = setInterval(() => {
      if (state === 'speaking' || audioActive || state === 'thinking') {
        updateWaves();
      }
    }, 90);

    return () => clearInterval(interval);
  }, [state, audioActive]);

  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking' || audioActive;

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-black/80 via-[#060D1A] to-black/90 border border-crimenet-cyan/30 shadow-[0_0_30px_rgba(0,212,255,0.15)] depth-3d-box group cursor-pointer select-none overflow-hidden ${className}`}
      onClick={onCoreClick}
    >
      {/* Background Holographic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Top Telemetry Header */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono mb-3 z-10">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            isThinking ? 'bg-crimenet-amber animate-ping' 
            : isSpeaking ? 'bg-crimenet-crimson animate-pulse'
            : 'bg-crimenet-cyan animate-pulse'
          }`} />
          <span className="font-bold text-white tracking-wider">AETHERIUS 3D CORE</span>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
          isThinking ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          : isSpeaking ? 'bg-red-500/20 text-rose-300 border border-red-500/40'
          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        }`}>
          {state.toUpperCase()}
        </span>
      </div>

      {/* 3D Holographic Gyroscopic Sphere Container */}
      <div 
        className="relative w-36 h-36 flex items-center justify-center my-2"
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
      >
        {/* Outer Gyro Ring - Cyan */}
        <div 
          className={`absolute inset-0 rounded-full border border-dashed border-cyan-400/60 shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all ${
            isThinking ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_12s_linear_infinite]'
          }`}
          style={{ transform: 'rotateX(65deg) rotateZ(30deg)' }}
        />

        {/* Middle Gyro Ring - Amber / Crimson */}
        <div 
          className={`absolute inset-2 rounded-full border border-amber-400/50 shadow-[0_0_15px_rgba(255,179,0,0.3)] transition-all ${
            isThinking ? 'animate-[spin_3s_linear_infinite_reverse]' : 'animate-[spin_8s_linear_infinite_reverse]'
          }`}
          style={{ transform: 'rotateY(65deg) rotateX(25deg)' }}
        />

        {/* Diagonal Orbit Ring - Purple */}
        <div 
          className="absolute inset-4 rounded-full border border-dotted border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)] animate-[spin_10s_linear_infinite]"
          style={{ transform: 'rotateZ(45deg) rotateY(45deg)' }}
        />

        {/* Quantum Core Sphere */}
        <div 
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
            isThinking 
              ? 'bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_35px_rgba(255,179,0,0.8)] scale-110'
              : isSpeaking
              ? 'bg-gradient-to-tr from-red-600 via-rose-500 to-pink-300 shadow-[0_0_35px_rgba(255,23,68,0.8)] scale-105'
              : 'bg-gradient-to-tr from-cyan-900 via-cyan-500 to-blue-300 shadow-[0_0_25px_rgba(0,212,255,0.6)] group-hover:scale-105'
          }`}
        >
          {/* Inner Pulsing Hologram Icon */}
          <Brain className={`w-8 h-8 transition-colors ${
            isThinking ? 'text-black animate-pulse' : isSpeaking ? 'text-white animate-bounce' : 'text-black'
          }`} />

          {/* Floating Quantum Sparkle */}
          <div className="absolute -top-1 -right-1">
            <Zap className={`w-3.5 h-3.5 ${isThinking ? 'text-white animate-ping' : 'text-cyan-200'}`} />
          </div>
        </div>

        {/* Orbiting Quantum Electrons */}
        <div 
          className="absolute w-full h-full pointer-events-none animate-[spin_6s_linear_infinite]"
          style={{ transform: 'rotateZ(120deg)' }}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#00D4FF] absolute top-0 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      {/* 3D Audio Frequency Waveform Bars */}
      <div className="w-full flex items-end justify-center gap-1.5 h-10 mt-1 px-4 z-10">
        {waveHeights.map((h, i) => (
          <div 
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${
              isSpeaking 
                ? 'bg-gradient-to-t from-rose-600 to-cyan-400 shadow-[0_0_8px_rgba(0,212,255,0.6)]'
                : isThinking
                ? 'bg-gradient-to-t from-amber-600 to-yellow-300 shadow-[0_0_8px_rgba(255,179,0,0.5)]'
                : 'bg-cyan-500/30'
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Subtext telemetry */}
      <div className="mt-2 text-center text-[10px] font-mono text-white/50 z-10 flex items-center gap-1">
        <Radio className="w-3 h-3 text-crimenet-cyan animate-pulse" />
        <span>379 RED NOTICES · LOUVAIN CLUSTER GRAPH</span>
      </div>
    </div>
  );
}
