'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Document } from '@langchain/core/documents';

interface CitationContextType {
  selectedCitation: Document | null;
  citationNumber: number | null;
  isSidebarOpen: boolean;
  openCitation: (citation: Document, number: number) => void;
  closeSidebar: () => void;
}

const CitationContext = createContext<CitationContextType | undefined>(undefined);

export const CitationProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCitation, setSelectedCitation] = useState<Document | null>(null);
  const [citationNumber, setCitationNumber] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openCitation = useCallback((citation: Document, number: number) => {
    setSelectedCitation(citation);
    setCitationNumber(number);
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    // Keep the citation data for animation purposes
    setTimeout(() => {
      setSelectedCitation(null);
      setCitationNumber(null);
    }, 300);
  }, []);

  return (
    <CitationContext.Provider
      value={{
        selectedCitation,
        citationNumber,
        isSidebarOpen,
        openCitation,
        closeSidebar,
      }}
    >
      {children}
    </CitationContext.Provider>
  );
};

export const useCitation = () => {
  const context = useContext(CitationContext);
  if (context === undefined) {
    throw new Error('useCitation must be used within a CitationProvider');
  }
  return context;
};
