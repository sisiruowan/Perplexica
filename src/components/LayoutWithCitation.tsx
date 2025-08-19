'use client';

import { ReactNode } from 'react';
import { useCitation } from '@/contexts/CitationContext';
import CitationSidebar from './CitationSidebar';

export default function LayoutWithCitation({ children }: { children: ReactNode }) {
  const { selectedCitation, citationNumber, isSidebarOpen, closeSidebar } = useCitation();

  return (
    <>
      {children}
      <CitationSidebar
        isOpen={isSidebarOpen}
        citation={selectedCitation}
        citationNumber={citationNumber}
        onClose={closeSidebar}
      />
    </>
  );
}
