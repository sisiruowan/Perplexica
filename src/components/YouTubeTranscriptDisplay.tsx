'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Clock, 
  User, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { YouTubeTranscript } from '@/lib/youtube/transcriptExtractor';

interface YouTubeTranscriptDisplayProps {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  transcript: YouTubeTranscript[];
  fullText?: string;
}

const YouTubeTranscriptDisplay = ({
  videoId,
  title,
  author,
  thumbnail,
  url,
  transcript = [],
  fullText = ''
}: YouTubeTranscriptDisplayProps) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null);
  
  // Check if transcript is actually available
  const hasTranscript = transcript && transcript.length > 0;

  // Format time from seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter transcript based on search
  const filteredTranscript = hasTranscript 
    ? transcript.filter(segment => 
        segment.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Copy timestamp to clipboard
  const copyTimestamp = (time: number, index: number) => {
    if (!hasTranscript || !transcript[index]) return;
    
    const timestamp = formatTime(time);
    navigator.clipboard.writeText(`${timestamp} - ${transcript[index].text}`);
    setCopiedTimestamp(index);
    setTimeout(() => setCopiedTimestamp(null), 2000);
  };

  // Jump to timestamp in video
  const jumpToTimestamp = (time: number, index: number) => {
    if (!hasTranscript) return;
    
    setHighlightedSegment(index);
    if (showVideo) {
      const iframe = document.querySelector(`iframe[src*="${videoId}"]`) as HTMLIFrameElement;
      if (iframe) {
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${Math.floor(time)}`;
      }
    } else {
      window.open(`${url}&t=${Math.floor(time)}s`, '_blank');
    }
    
    // Auto-hide highlight after 3 seconds
    setTimeout(() => setHighlightedSegment(null), 3000);
  };

  // Toggle fullscreen transcript view
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="my-4 rounded-lg border border-light-200 dark:border-dark-200 overflow-hidden shadow-lg bg-light-secondary dark:bg-dark-secondary">
      {/* Video Player or Thumbnail */}
      <div className="relative aspect-video bg-black">
        {showVideo ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setShowVideo(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
            >
              <div className="bg-red-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2 text-black dark:text-white">
          {title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-black/70 dark:text-white/70 mb-4">
          <div className="flex items-center gap-1">
            <User size={14} />
            <span>{author}</span>
          </div>
          {hasTranscript && (
            <>
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span>{transcript.length} segments</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatTime(transcript[transcript.length - 1]?.start || 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {hasTranscript && (
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                showTranscript 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-light-100 dark:bg-dark-100 hover:bg-light-200 dark:hover:bg-dark-200'
              }`}
            >
              <FileText size={16} />
              <span>Transcript</span>
              {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-4 py-2 bg-light-100 dark:bg-dark-100 rounded-lg hover:bg-light-200 dark:hover:bg-dark-200 transition-colors"
          >
            <ExternalLink size={16} />
            <span>Open in YouTube</span>
          </a>
        </div>

        {/* Transcript Section */}
        {showTranscript && hasTranscript && (
          <div className={`mt-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-black dark:text-white">
                Video Transcript
              </h4>
              
              <div className="flex items-center gap-2">
                {/* Search Box */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-light-200 dark:border-dark-200 rounded-lg 
                             bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 
                             focus:ring-blue-500 w-48"
                  />
                </div>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-light-100 dark:bg-dark-100 hover:bg-light-200 
                           dark:hover:bg-dark-200 transition-colors"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                
                {isFullscreen && (
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
            
            {/* Transcript Content */}
            <div 
              ref={transcriptRef}
              className={`
                ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'max-h-96'} 
                overflow-y-auto space-y-2 pr-2 
                ${isFullscreen ? '' : 'border border-light-200 dark:border-dark-200 rounded-lg p-4'}
              `}
            >
              {filteredTranscript.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No results found for "{searchQuery}"
                </p>
              ) : (
                filteredTranscript.map((segment, index) => {
                  const originalIndex = transcript.indexOf(segment);
                  return (
                    <div
                      key={originalIndex}
                      className={`
                        group flex gap-3 p-3 rounded-lg transition-all cursor-pointer
                        ${highlightedSegment === originalIndex 
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' 
                          : 'hover:bg-light-100 dark:hover:bg-dark-100'
                        }
                        ${searchQuery && segment.text.toLowerCase().includes(searchQuery.toLowerCase())
                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                          : ''
                        }
                      `}
                      onClick={() => jumpToTimestamp(segment.start, originalIndex)}
                    >
                      {/* Timestamp */}
                      <div className="flex items-start gap-2 min-w-[80px]">
                        <button
                          className="text-xs font-mono text-blue-600 dark:text-blue-400 
                                   hover:text-blue-700 dark:hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyTimestamp(segment.start, originalIndex);
                          }}
                          title="Copy timestamp"
                        >
                          {formatTime(segment.start)}
                        </button>
                        {copiedTimestamp === originalIndex && (
                          <Check size={12} className="text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      
                      {/* Text */}
                      <p className="flex-1 text-sm text-black dark:text-white leading-relaxed">
                        {searchQuery ? (
                          // Highlight search matches
                          segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 px-1 rounded">
                                {part}
                              </mark>
                            ) : part
                          )
                        ) : (
                          segment.text
                        )}
                      </p>
                      
                      {/* Copy button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(segment.text);
                          setCopiedTimestamp(-originalIndex - 1); // Negative to distinguish from timestamp copy
                          setTimeout(() => setCopiedTimestamp(null), 2000);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 
                                 rounded hover:bg-light-200 dark:hover:bg-dark-200"
                        title="Copy text"
                      >
                        {copiedTimestamp === -originalIndex - 1 ? (
                          <Check size={14} className="text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy size={14} className="text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Summary Stats */}
            {!isFullscreen && (
              <div className="mt-4 pt-4 border-t border-light-200 dark:border-dark-200 
                            text-xs text-gray-500 dark:text-gray-400">
                {searchQuery ? (
                  <span>{filteredTranscript.length} of {transcript.length} segments match your search</span>
                ) : (
                  <span>Total: {transcript.length} segments • Click timestamp to jump to video</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeTranscriptDisplay;
