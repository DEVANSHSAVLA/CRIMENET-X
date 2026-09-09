'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const { isVoicePanelOpen, setIsVoicePanelOpen, dispatchAction } = useInvestigation();

  return (
    <div className="w-64 h-full glass-panel border-r border-y-0 border-l-0 rounded-none flex flex-col z-50">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <ShieldAlert className="text-crimenet-cyan animate-pulse_slow" size={28} />
        <div>
          <h1 className="font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-crimenet-cyan to-crimenet-blue">
            CRIMENET-X
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-crimenet-muted font-mono">Intelligence OS</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto scrollbar-dark">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isActive 
                  ? "bg-crimenet-cyan/15 text-white border-l-2 border-crimenet-cyan shadow-lg shadow-cyan-500/10 font-bold translate-x-1" 
                  : "text-crimenet-muted hover:bg-white/5 hover:text-white hover:translate-x-1 hover:border-l hover:border-white/20"
              )}
            >
              <item.icon 
                size={18} 
                className={cn(
                  "transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-crimenet-cyan" : "group-hover:text-crimenet-cyan"
                )} 
              />
              <span className="tracking-wide">{item.label}</span>
              {isActive && (
                <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-crimenet-cyan animate-ping" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Dynamic Tactical Quick Actions */}
      <div className="p-3 border-t border-white/5 bg-black/40 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Voice AI Shortcut Button */}
          <button
            onClick={() => setIsVoicePanelOpen(!isVoicePanelOpen)}
            className="btn-3d flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-crimenet-cyan/10 hover:bg-crimenet-cyan/20 border border-crimenet-cyan/30 text-crimenet-cyan text-[10px] font-mono font-bold tracking-wider"
            title="Toggle Full Voice Intelligence Layer (Alt+V)"
          >
            <Mic className="w-3 h-3 animate-pulse" />
            <span>VOICE AI</span>
          </button>

          {/* Reset View Button */}
          <button
            onClick={() => dispatchAction('RESET_VIEW', null)}
            className="btn-3d flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-[10px] font-mono font-bold tracking-wider"
            title="Reset active filters and investigation overview"
          >
            <RotateCcw className="w-3 h-3 text-crimenet-amber" />
            <span>RESET</span>
          </button>
        </div>

        {/* Operator Profile Card */}
        <div className="card-3d p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-crimenet-blue to-crimenet-cyan flex items-center justify-center text-black font-bold text-xs shadow-md shadow-cyan-500/20">
            OP
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">Operator 01</p>
            <p className="text-[10px] text-crimenet-cyan font-mono">Clearance: Level 5</p>
          </div>
        </div>
      </div>
    </div>
  );
}
