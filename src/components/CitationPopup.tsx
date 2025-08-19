'use client';

import { useState, useRef, useEffect } from 'react';
import { Document } from '@langchain/core/documents';

interface CitationPopupProps {
  citation: Document;
  citationNumber: number;
  children: React.ReactNode;
  onCitationClick: (citation: Document, citationNumber: number) => void;
}

const CitationPopup = ({ citation, citationNumber, children, onCitationClick }: CitationPopupProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 150;
      
      let left = rect.left + rect.width / 2 - popupWidth / 2;
      let top = rect.bottom + 8;
      
      // Adjust if popup would go off-screen
      if (left < 10) left = 10;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
      
      // Show above if not enough space below
      if (top + popupHeight > window.innerHeight - 10) {
        top = rect.top - popupHeight - 8;
      }
      
      setPopupPosition({ top, left });
    }
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 300); // 300ms delay before showing popup
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200); // 200ms delay before hiding popup
  };

  const handleCitationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCitationClick(citation, citationNumber);
  };

  const extractSnippet = (content: string) => {
    // Extract a meaningful snippet from the page content
    // This will be improved later to extract the specific cited paragraph
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    const maxLength = 200;
    if (cleanContent.length <= maxLength) return cleanContent;
    return cleanContent.substring(0, maxLength) + '...';
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleCitationClick}
        className="inline-block"
      >
        {children}
      </span>
      
      {isHovered && (
        <div
          ref={popupRef}
          className="fixed z-50 w-80 p-4 bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg shadow-lg animate-[citation-popup-fade-in_200ms_ease-out]"
          style={{
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-medium text-black dark:text-white line-clamp-2">
                {citation.metadata.title || 'Untitled'}
              </h4>
              <span className="text-xs text-black/50 dark:text-white/50 ml-2 flex-shrink-0">
                [{citationNumber}]
              </span>
            </div>
            
            <p className="text-xs text-black/70 dark:text-white/70 line-clamp-4">
              {extractSnippet(citation.pageContent)}
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                {citation.metadata.url && citation.metadata.url !== 'File' ? (
                  <img
                    src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${citation.metadata.url}`}
                    width={14}
                    height={14}
                    alt="favicon"
                    className="rounded"
                  />
                ) : (
                  <div className="w-3.5 h-3.5 bg-dark-200 rounded flex items-center justify-center">
                    <span className="text-[10px] text-white/70">F</span>
                  </div>
                )}
                <span className="text-xs text-black/50 dark:text-white/50 truncate max-w-[200px]">
                  {citation.metadata.url === 'File' 
                    ? citation.metadata.fileName || 'File'
                    : citation.metadata.url?.replace(/.+\/\/|www.|\..+/g, '') || 'Unknown'}
                </span>
              </div>
              
              <button
                onClick={handleCitationClick}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                View →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CitationPopup;
