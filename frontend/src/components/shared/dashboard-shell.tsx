'use client';

import React from 'react';
import { TopBar } from '@/components/shared/top-bar';
import { ContextDrawer } from '@/components/panels/context-drawer';
import { useInvestigation } from '@/context/investigation-context';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    drawerType,
    drawerData,
    isDrawerOpen,
    closeDrawer,
    dispatchAction,
  } = useInvestigation();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <TopBar />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Unified Global Context Drawer */}
      <ContextDrawer
        type={drawerType}
        data={drawerData}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onAction={(action, payload) => dispatchAction(action, payload)}
      />
    </div>
  );
}
