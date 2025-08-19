'use client';

import React, { createContext, useContext, useRef, MutableRefObject } from 'react';
import { ClippyAssistantRef } from '@/components/ClippyAssistant';

interface ClippyContextType {
  clippyRef: MutableRefObject<ClippyAssistantRef | null>;
  showTip: (message: string, duration?: number) => void;
}

const ClippyContext = createContext<ClippyContextType | undefined>(undefined);

export function ClippyProvider({ children }: { children: React.ReactNode }) {
  const clippyRef = useRef<ClippyAssistantRef | null>(null);

  const showTip = (message: string, duration?: number) => {
    if (clippyRef.current) {
      clippyRef.current.showTip(message, duration);
    }
  };

  return (
    <ClippyContext.Provider value={{ clippyRef, showTip }}>
      {children}
    </ClippyContext.Provider>
  );
}

export function useClippy() {
  const context = useContext(ClippyContext);
  if (!context) {
    throw new Error('useClippy must be used within a ClippyProvider');
  }
  return context;
}
