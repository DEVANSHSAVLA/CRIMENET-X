'use client';

import { GlassPanel } from '@/components/panels/glass-panel';

export default function AdminPage() {
  return (
    <div className="h-full p-6 space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded text-amber-500 text-sm font-bold flex items-center justify-center tracking-widest uppercase">
        WARNING: SYNTHETIC / DEMONSTRATION DATA ENVIRONMENT
      </div>

      <div className="grid grid-cols-3 gap-6">
        <GlassPanel title="SYSTEM STATUS">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">API Backend</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded font-bold">ONLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Neo4j Database</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded font-bold">ONLINE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">Redis Cache</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded font-bold">ONLINE</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel title="USER CLEARANCE" className="col-span-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-crimenet-muted">
                <th className="pb-2">User ID</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Last Login</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">OP-01</td>
                <td className="py-2 text-crimenet-cyan">Level 5</td>
                <td className="py-2 text-white/50">Just now</td>
              </tr>
            </tbody>
          </table>
        </GlassPanel>
      </div>
    </div>
  );
}
