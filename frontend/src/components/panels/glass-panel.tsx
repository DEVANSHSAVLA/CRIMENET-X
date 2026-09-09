import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: "cyan" | "crimson" | "amber" | "none";
  title?: string;
}

export function GlassPanel({ children, className, glowColor = "none", title, ...props }: GlassPanelProps) {
  const glowClass = glowColor !== "none" ? `glow-${glowColor}` : "";

  return (
    <div className={cn("glass-panel rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:border-white/20", glowClass, className)} {...props}>
      {title && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-2">
          <h3 className="text-sm font-semibold tracking-wider text-crimenet-muted uppercase">{title}</h3>
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-dark">
        {children}
      </div>
    </div>
  );
}
