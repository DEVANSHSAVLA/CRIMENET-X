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
  ShieldAlert
} from "lucide-react";

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

  return (
    <div className="w-64 h-full glass-panel border-r border-y-0 border-l-0 rounded-none flex flex-col z-50">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <ShieldAlert className="text-crimenet-cyan animate-pulse_slow" size={28} />
        <div>
          <h1 className="font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-crimenet-cyan to-crimenet-blue">
            CRIMENET-X
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-crimenet-muted">Intelligence OS</p>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-dark">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white/10 text-white border-l-2 border-crimenet-cyan glow-cyan" 
                  : "text-crimenet-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} className={isActive ? "text-crimenet-cyan" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-crimenet-blue to-crimenet-cyan flex items-center justify-center text-black font-bold text-xs">
            OP
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Operator 01</p>
            <p className="text-xs text-crimenet-muted">Clearance: Level 5</p>
          </div>
        </div>
      </div>
    </div>
  );
}
