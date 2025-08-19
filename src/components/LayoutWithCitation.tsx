'use client';

import { ReactNode } from 'react';
import { useCitation } from '@/contexts/CitationContext';
import CitationSidebar from './CitationSidebar';
import ClippyAssistant from './ClippyAssistant';

export default function LayoutWithCitation({ children }: { children: ReactNode }) {
  const { selectedCitation, citationNumber, isSidebarOpen, closeSidebar } = useCitation();

  const handleMainAreaClick = (e: React.MouseEvent) => {
    // Only close sidebar if it's open and the click is not on interactive elements
    if (!isSidebarOpen) return;
    
    const target = e.target as HTMLElement;
    
    // Don't close if clicking on interactive elements
    if (target.closest('button') || 
        target.closest('a') || 
        target.closest('input') || 
        target.closest('textarea') || 
        target.closest('.citation-popup') ||
        target.closest('[role="button"]') ||
        target.closest('.clippy-assistant')) {
      return;
    }
    
    // Close the sidebar
    closeSidebar();
  };

  return (
    <>
      <div onClick={handleMainAreaClick} className="min-h-screen">
        {children}
      </div>
      <CitationSidebar
        isOpen={isSidebarOpen}
        citation={selectedCitation}
        citationNumber={citationNumber}
        onClose={closeSidebar}
      />
      <ClippyAssistant />
    </>
  );
}
