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
  Minimize2,
  Eye,
  Calendar,
  Hash,
  Volume2,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { YouTubeTranscript, YouTubeVideoInfo } from '@/lib/youtube/transcriptExtractor';

interface YouTubeVideoPageProps {
  videoInfo: YouTubeVideoInfo;
  transcript: YouTubeTranscript[];
  fullText: string;
  onClose?: () => void;
}

const YouTubeVideoPage = ({
  videoInfo,
  transcript = [],
  fullText = '',
  onClose
}: YouTubeVideoPageProps) => {
  const [showTranscript, setShowTranscript] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTimestamp, setCopiedTimestamp] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'summary'>('overview');
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

  // Calculate total video duration from transcript
  const getTotalDuration = (): string => {
    if (videoInfo.duration) {
      return formatTime(videoInfo.duration);
    }
    if (hasTranscript && transcript.length > 0) {
      const lastSegment = transcript[transcript.length - 1];
      const totalSeconds = lastSegment.start + lastSegment.duration;
      return formatTime(totalSeconds);
    }
    return 'Unknown';
  };

  // Get video statistics
  const getVideoStats = () => {
    const totalDuration = getTotalDuration();
    const transcriptLength = hasTranscript ? transcript.length : 0;
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    const avgWordsPerMinute = videoInfo.duration ? Math.round(wordCount / (videoInfo.duration / 60)) : 0;
    
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
  const filteredTranscript = hasTranscript ? transcript.filter(segment =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Generate summary points from transcript
  const generateSummaryPoints = (): string[] => {
    if (!hasTranscript || transcript.length === 0) return [];
    
    // Simple summary generation - take every 10th segment or key phrases
    const summarySegments = transcript.filter((_, index) => 
      index % Math.max(1, Math.floor(transcript.length / 10)) === 0
    ).slice(0, 10);
    
    return summarySegments.map(segment => segment.text.trim()).filter(text => text.length > 20);
  };

  const summaryPoints = generateSummaryPoints();

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'w-full'} bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Play className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">YouTube Video</span>
            </div>
            <h1 className="text-2xl font-bold mb-2 line-clamp-2">{videoInfo.title}</h1>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{videoInfo.author}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{stats.duration}</span>
              </div>
              {hasTranscript && (
                <div className="flex items-center space-x-1">
                  <FileText className="w-4 h-4" />
                  <span>{stats.segments} segments</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {['overview', 'transcript', 'summary'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Video Preview */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-1/2">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
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
              </div>

              {/* Video Statistics */}
              <div className="lg:w-1/2 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Information</h3>
                
                {/* Basic Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Duration</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.duration}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Eye className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-gray-900 dark:text-white">Views</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {videoInfo.viewCount >= 1000000 
                        ? `${(videoInfo.viewCount / 1000000).toFixed(1)}M`
                        : videoInfo.viewCount >= 1000
                        ? `${(videoInfo.viewCount / 1000).toFixed(1)}K`
                        : videoInfo.viewCount.toLocaleString()
                      }
                    </p>
                  </div>
                  
                  {videoInfo.likeCount && videoInfo.likeCount > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <ThumbsUp className="w-5 h-5 text-green-500" />
                        <span className="font-medium text-gray-900 dark:text-white">Likes</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {videoInfo.likeCount >= 1000000 
                          ? `${(videoInfo.likeCount / 1000000).toFixed(1)}M`
                          : videoInfo.likeCount >= 1000
                          ? `${(videoInfo.likeCount / 1000).toFixed(1)}K`
                          : videoInfo.likeCount.toLocaleString()
                        }
                      </p>
                    </div>
                  )}
                  
                  {videoInfo.commentCount && videoInfo.commentCount > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-purple-500" />
                        <span className="font-medium text-gray-900 dark:text-white">Comments</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {videoInfo.commentCount >= 1000000 
                          ? `${(videoInfo.commentCount / 1000000).toFixed(1)}M`
                          : videoInfo.commentCount >= 1000
                          ? `${(videoInfo.commentCount / 1000).toFixed(1)}K`
                          : videoInfo.commentCount.toLocaleString()
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Transcript Stats */}
                {hasTranscript && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Transcript Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Hash className="w-5 h-5 text-indigo-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Words</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.words.toLocaleString()}</p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-5 h-5 text-teal-500" />
                          <span className="font-medium text-gray-900 dark:text-white">Segments</span>
                        </div>
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{stats.segments}</p>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Volume2 className="w-5 h-5 text-orange-500" />
                          <span className="font-medium text-gray-900 dark:text-white">WPM</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.wpm}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={videoInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Watch on YouTube</span>
                    </a>
                    {hasTranscript && (
                      <button
                        onClick={() => setActiveTab('transcript')}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Transcript</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Metadata */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Details</h3>
              
              {/* Publication Info */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Published</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(videoInfo.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Description */}
              {videoInfo.description && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
                    {videoInfo.description.split('\n').map((line, index) => (
                      <p key={index} className={index > 0 ? 'mt-2' : ''}>
                        {line || '\u00A0'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {videoInfo.tags && videoInfo.tags.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {videoInfo.tags.slice(0, 15).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-lg"
                      >
                        #{tag}
                      </span>
                    ))}
                    {videoInfo.tags.length > 15 && (
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-lg">
                        +{videoInfo.tags.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Technical Details</h4>
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
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {hasTranscript ? (
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

                {/* Transcript */}
                <div ref={transcriptRef} className="space-y-2 max-h-96 overflow-y-auto">
                  {(searchQuery ? filteredTranscript : transcript).map((segment, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${
                        highlightedSegment === index
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <button
                              onClick={() => jumpToTimestamp(segment.start)}
                              className="text-sm font-mono text-blue-600 dark:text-blue-400 hover:underline"
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
                  ))}
                </div>

                {searchQuery && filteredTranscript.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No results found for "{searchQuery}"</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transcript available for this video</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-4">
            {summaryPoints.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Points</h3>
                <div className="space-y-3">
                  {summaryPoints.map((point, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No summary available - transcript required</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeVideoPage;
