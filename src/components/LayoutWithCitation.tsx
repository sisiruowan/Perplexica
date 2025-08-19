'use client';

import { ReactNode } from 'react';
import { useCitation } from '@/contexts/CitationContext';
import { useYouTube } from '@/contexts/YouTubeContext';
import { useClippy } from '@/contexts/ClippyContext';
import CitationSidebar from './CitationSidebar';
import ClippyAssistant from './ClippyAssistant';
import YouTubeVideoPage from './YouTubeVideoPage';

export default function LayoutWithCitation({ children }: { children: ReactNode }) {
  const { selectedCitation, citationNumber, isSidebarOpen, closeSidebar } = useCitation();
  const { currentVideo, isVideoPageOpen, setIsVideoPageOpen } = useYouTube();
  const { clippyRef } = useClippy();

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
      
      {/* YouTube Video Page Modal */}
      {isVideoPageOpen && currentVideo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <YouTubeVideoPage
              videoInfo={currentVideo.videoInfo}
              transcript={currentVideo.transcript}
              fullText={currentVideo.fullText}
              onClose={() => setIsVideoPageOpen(false)}
            />
          </div>
        </div>
      )}
      
      <ClippyAssistant ref={clippyRef} />
    </>
  );
}
