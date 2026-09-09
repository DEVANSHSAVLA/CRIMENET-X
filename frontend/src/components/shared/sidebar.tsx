'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Network, 
  Globe, 
  Clock, 
  BarChart3, 
  Brain, 
  FileSearch, 
  Settings,
  ShieldAlert,
  Mic,
  RotateCcw
} from "lucide-react";
import { useInvestigation } from "@/context/investigation-context";

const navItems = [
  { href: "/command-center", label: "Command Center", icon: LayoutDashboard },
  { href: "/network", label: "Network Graph", icon: Network },
  { href: "/geo-intelligence", label: "Geo Intelligence", icon: Globe },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ai-investigator", label: "AI Investigator", icon: Brain },
  { href: "/evidence", label: "Evidence", icon: FileSearch },
  { href: "/admin", label: "Administration", icon: Settings },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isVoicePanelOpen, setIsVoicePanelOpen, dispatchAction } = useInvestigation();

  return (
    <div className="w-64 h-full glass-panel border-r border-y-0 border-l-0 rounded-none flex flex-col z-50 depth-3d-box relative bg-[#030712]/95">
      {/* 3D Scanning Line Animation */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none opacity-40 animate-pulse" />

      {/* Header with 3D Rotating Shield Insignia */}
      <div className="p-5 flex items-center gap-3 border-b border-white/10 bg-white/[0.02]">
        <div className="relative w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)] group hover:scale-105 transition-transform" style={{ transformStyle: 'preserve-3d' }}>
          <ShieldAlert className="text-crimenet-cyan animate-pulse" size={22} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-crimenet-cyan via-white to-crimenet-blue">
              CRIMENET-X
            </h1>
            <span className="text-[8px] font-mono font-bold px-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">3D</span>
          </div>
          <p className="text-[9px] uppercase tracking-widest text-crimenet-muted font-mono">National Intel OS</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto scrollbar-dark">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "btn-3d flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all group relative border",
                isActive 
                  ? "bg-cyan-500/20 text-white border-cyan-400/50 shadow-[0_4px_20px_rgba(0,212,255,0.3)] translate-x-1" 
                  : "bg-white/[0.02] text-crimenet-muted hover:bg-white/[0.06] hover:text-white border-white/5 hover:border-cyan-500/30 hover:translate-x-1"
              )}
            >
              <item.icon 
                size={16} 
                className={cn(
                  "transition-transform duration-200 group-hover:scale-125",
                  isActive ? "text-crimenet-cyan" : "group-hover:text-crimenet-cyan"
                )} 
              />
              <span className="tracking-wider">{item.label}</span>
              {isActive && (
                <span className="absolute right-2.5 w-2 h-2 rounded-full bg-crimenet-cyan shadow-[0_0_8px_#00D4FF]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Dynamic Tactical Quick Actions */}
      <div className="p-3 border-t border-white/10 bg-black/60 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Voice AI Shortcut Button */}
          <button
            onClick={() => setIsVoicePanelOpen(!isVoicePanelOpen)}
            className="btn-3d flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-crimenet-cyan/15 hover:bg-crimenet-cyan/30 border border-crimenet-cyan/40 text-crimenet-cyan text-[10px] font-mono font-bold tracking-wider shadow-md"
            title="Toggle Full Voice Intelligence Layer (Alt+V)"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse" />
            <span>VOICE AI</span>
          </button>

          {/* Reset View Button */}
          <button
            onClick={() => dispatchAction('RESET_VIEW', null)}
            className="btn-3d flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 text-[10px] font-mono font-bold tracking-wider shadow-md"
            title="Reset active filters and investigation overview"
          >
            <RotateCcw className="w-3.5 h-3.5 text-crimenet-amber" />
            <span>RESET</span>
          </button>
        </div>

        {/* 3D Operator Biometric Badge */}
        <button
          onClick={() => router.push('/admin')}
          className="w-full btn-3d p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-crimenet-cyan/50 flex items-center gap-3 text-left transition-all group shadow-lg"
          title="Open System Administration & User Clearance"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-mono font-bold text-xs shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
            L5
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate group-hover:text-crimenet-cyan transition-colors">
              Devansh S. & Ayaan M.
            </p>
            <p className="text-[10px] text-crimenet-cyan font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Clearance: Level 5 Admin
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
