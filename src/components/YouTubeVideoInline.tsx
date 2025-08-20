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
  Eye,
  ThumbsUp,
  MessageSquare,
  Hash,
  Volume2
} from 'lucide-react';
import { YouTubeTranscript, YouTubeVideoInfo } from '@/lib/youtube/transcriptExtractor';

interface YouTubeVideoInlineProps {
  videoInfo: YouTubeVideoInfo;
  transcript: YouTubeTranscript[];
  fullText: string;
  isLoading?: boolean;
}

const YouTubeVideoInline = ({
  videoInfo,
  transcript = [],
  fullText = '',
  isLoading = false
}: YouTubeVideoInlineProps) => {
  const [showVideo, setShowVideo] = useState(false);
  // Auto-expand transcript when there's content available
  const [showTranscript, setShowTranscript] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  
  // State for streaming transcript updates
  const [currentTranscript, setCurrentTranscript] = useState<YouTubeTranscript[]>(transcript);
  const [currentFullText, setCurrentFullText] = useState<string>(fullText);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(isLoading);
  
  // Update local state when props change (for streaming updates)
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      setCurrentTranscript(transcript);
      setIsTranscriptLoading(false);
    }
  }, [transcript]);
  
  useEffect(() => {
    if (fullText && fullText.trim()) {
      setCurrentFullText(fullText);
      setIsTranscriptLoading(false);
    }
  }, [fullText]);
  
  // Component initialization
  
  // Update loading state when prop changes
  useEffect(() => {
    setIsTranscriptLoading(isLoading);
  }, [isLoading]);
  
  // Check if transcript is actually available
  const hasTranscript = currentTranscript && currentTranscript.length > 0;
  const hasContent = currentFullText && currentFullText.trim().length > 0;
  
  // Content availability tracking removed to prevent infinite loops
  
  // Auto-expand is now handled by default state (useState(true))
  
  // Remove infinite logging - only log when data actually changes
  
  // Component props logging removed to prevent infinite logging

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

  // Get video statistics
  const getVideoStats = () => {
    const totalDuration = formatTime(videoInfo.duration);
    const transcriptLength = hasTranscript ? currentTranscript.length : 0;
    // Use currentFullText for word count if available, otherwise use empty string
    const textForWordCount = currentFullText || '';
    const wordCount = textForWordCount.split(/\s+/).filter(word => word.length > 0).length;
    const avgWordsPerMinute = videoInfo.duration && wordCount > 0 ? Math.round(wordCount / (videoInfo.duration / 60)) : 0;
    
    return {
      duration: totalDuration,
      segments: transcriptLength,
      words: wordCount,
      wpm: avgWordsPerMinute
    };
  };

  const stats = getVideoStats();

  // Copy timestamp to clipboard
  const copyTimestamp = async (start: number) => {
    const timestamp = formatTime(start);
    const timestampUrl = `${videoInfo.url}&t=${Math.floor(start)}s`;
    
    try {
      await navigator.clipboard.writeText(timestampUrl);
      setCopiedTimestamp(start);
      setTimeout(() => setCopiedTimestamp(null), 2000);
    } catch (err) {
      console.error('Failed to copy timestamp:', err);
    }
  };

  // Jump to timestamp in video
  const jumpToTimestamp = (start: number) => {
    const timestampUrl = `${videoInfo.url}&t=${Math.floor(start)}s`;
    window.open(timestampUrl, '_blank');
  };

  // Filter transcript based on search query
  const filteredTranscript = hasTranscript ? currentTranscript.filter(segment =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Play className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">YouTube Video</span>
            </div>
            <h3 className="text-lg font-bold mb-2 line-clamp-2">{videoInfo.title}</h3>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{videoInfo.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{stats.duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{formatNumber(videoInfo.viewCount)} views</span>
              </div>
              {videoInfo.likeCount && videoInfo.likeCount > 0 && (
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{formatNumber(videoInfo.likeCount)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={videoInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Watch on YouTube"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Video Preview */}
      <div className="p-4">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
          {showVideo ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoInfo.videoId}?autoplay=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={videoInfo.title}
            />
          ) : (
            <div className="relative w-full h-full">
              <img
                src={videoInfo.thumbnail}
                alt={videoInfo.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
              >
                <div className="bg-red-600 hover:bg-red-700 rounded-full p-4 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Video Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Duration</span>
            </div>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.duration}</p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Eye className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Views</span>
            </div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatNumber(videoInfo.viewCount)}
            </p>
          </div>
          
          {videoInfo.likeCount && videoInfo.likeCount > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Likes</span>
              </div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatNumber(videoInfo.likeCount)}
              </p>
            </div>
          )}
          
          {hasTranscript && (
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Transcript</span>
              </div>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.segments} segments</p>
            </div>
          )}
        </div>

        {/* Video Description */}
        {videoInfo.description && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
            <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
              {videoInfo.description.split('\n').slice(0, 5).map((line, index) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {line || '\u00A0'}
                </p>
              ))}
              {videoInfo.description.split('\n').length > 5 && (
                <p className="text-gray-500 dark:text-gray-400 mt-2 italic">
                  ... and more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Transcript Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>
                {hasTranscript 
                  ? `Video Transcript (${stats.segments} segments, ${stats.words} words)` 
                  : hasContent
                    ? `Video Content (${stats.words} words)`
                    : 'Video Content'
                }
              </span>
            </h4>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
            >
              {showTranscript ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Hide Content</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>
                    {hasTranscript 
                      ? 'Show Transcript' 
                      : hasContent 
                        ? 'Show Content' 
                        : 'Show Details'
                    }
                  </span>
                </>
              )}
            </button>
          </div>

          {showTranscript && (
            <div className="space-y-4">
              {/* Loading indicator for transcript */}
              {isTranscriptLoading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-blue-700 dark:text-blue-300 text-sm">Loading transcript...</span>
                  </div>
                </div>
              )}
              
              {hasTranscript || hasContent ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search in transcript..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Transcript Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Transcript Summary</h5>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">Total Segments:</span>
                        <p className="font-bold text-blue-900 dark:text-blue-100">{stats.segments}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">Word Count:</span>
                        <p className="font-bold text-blue-900 dark:text-blue-100">{stats.words.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300">Speaking Rate:</span>
                        <p className="font-bold text-blue-900 dark:text-blue-100">{stats.wpm} WPM</p>
                      </div>
                    </div>
                  </div>

                  {/* Transcript */}
                  <div ref={transcriptRef} className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                    {hasTranscript ? (
                      // Show structured transcript
                      (searchQuery ? filteredTranscript : currentTranscript).map((segment, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <button
                                onClick={() => jumpToTimestamp(segment.start)}
                                className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded"
                              >
                                {formatTime(segment.start)}
                              </button>
                              <button
                                onClick={() => copyTimestamp(segment.start)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                title="Copy timestamp URL"
                              >
                                {copiedTimestamp === segment.start ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3 text-gray-400" />
                                )}
                              </button>
                            </div>
                            <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                              {searchQuery ? (
                                segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                                      {part}
                                    </mark>
                                  ) : (
                                    part
                                  )
                                )
                              ) : (
                                segment.text
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                    ) : hasContent ? (
                      // Show text content when no structured transcript is available
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-3">Video Content</h5>
                        <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {searchQuery ? (
                            currentFullText.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                              part.toLowerCase() === searchQuery.toLowerCase() ? (
                                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )
                          ) : (
                            currentFullText
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {searchQuery && (
                    (hasTranscript && filteredTranscript.length === 0) ||
                    (hasContent && !hasTranscript && !currentFullText.toLowerCase().includes(searchQuery.toLowerCase()))
                  ) && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No results found for &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </>
              ) : (
                /* No Transcript Available - Show Video Content */
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <h5 className="font-medium text-yellow-900 dark:text-yellow-100">No Transcript Available</h5>
                    </div>
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      This video doesn&apos;t have captions or transcript available. Here&apos;s the video information we have:
                    </p>
                  </div>

                  {/* Video Content from API */}
                  {currentFullText && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">Video Information</h5>
                      <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                        {currentFullText}
                      </div>
                    </div>
                  )}

                  {/* Technical Details */}
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3">Technical Details</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Video ID:</span>
                        <p className="font-mono text-gray-700 dark:text-gray-300">{videoInfo.videoId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Channel ID:</span>
                        <p className="font-mono text-gray-700 dark:text-gray-300 truncate">{videoInfo.channelId}</p>
                      </div>
                      {videoInfo.definition && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Quality:</span>
                          <p className="text-gray-700 dark:text-gray-300">{videoInfo.definition.toUpperCase()}</p>
                        </div>
                      )}
                      {videoInfo.caption && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Captions:</span>
                          <p className="text-gray-700 dark:text-gray-300">{videoInfo.caption === 'true' ? 'Available' : 'Not Available'}</p>
                        </div>
                      )}
                      {videoInfo.defaultLanguage && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Language:</span>
                          <p className="text-gray-700 dark:text-gray-300">{videoInfo.defaultLanguage}</p>
                        </div>
                      )}
                      {videoInfo.categoryId && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Category:</span>
                          <p className="text-gray-700 dark:text-gray-300">{videoInfo.categoryId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {videoInfo.tags && videoInfo.tags.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {videoInfo.tags.slice(0, 10).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-lg"
                >
                  #{tag}
                </span>
              ))}
              {videoInfo.tags.length > 10 && (
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg">
                  +{videoInfo.tags.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeVideoInline;
