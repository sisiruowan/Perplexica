'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { YouTubeVideoInfo, YouTubeTranscript } from '@/lib/youtube/transcriptExtractor';

interface YouTubeVideoData {
  videoInfo: YouTubeVideoInfo;
  transcript: YouTubeTranscript[];
  fullText: string;
  addedAt: Date;
}

interface YouTubeContextType {
  currentVideo: YouTubeVideoData | null;
  videoHistory: YouTubeVideoData[];
  setCurrentVideo: (video: YouTubeVideoData | null) => void;
  addVideoToHistory: (video: YouTubeVideoData) => void;
  clearHistory: () => void;
  isVideoPageOpen: boolean;
  setIsVideoPageOpen: (open: boolean) => void;
  getVideoContext: () => string;
  hasActiveVideo: () => boolean;
}

const YouTubeContext = createContext<YouTubeContextType | undefined>(undefined);

export const useYouTube = () => {
  const context = useContext(YouTubeContext);
  if (!context) {
    throw new Error('useYouTube must be used within a YouTubeProvider');
  }
  return context;
};

interface YouTubeProviderProps {
  children: ReactNode;
}

export const YouTubeProvider: React.FC<YouTubeProviderProps> = ({ children }) => {
  const [currentVideo, setCurrentVideoState] = useState<YouTubeVideoData | null>(null);
  const [videoHistory, setVideoHistory] = useState<YouTubeVideoData[]>([]);
  const [isVideoPageOpen, setIsVideoPageOpen] = useState(false);

  const setCurrentVideo = (video: YouTubeVideoData | null) => {
    setCurrentVideoState(video);
    if (video) {
      addVideoToHistory(video);
      setIsVideoPageOpen(true);
    }
  };

  const addVideoToHistory = (video: YouTubeVideoData) => {
    setVideoHistory(prev => {
      // Remove existing video with same ID if present
      const filtered = prev.filter(v => v.videoInfo.videoId !== video.videoInfo.videoId);
      // Add new video to the beginning
      return [video, ...filtered].slice(0, 10); // Keep only last 10 videos
    });
  };

  const clearHistory = () => {
    setVideoHistory([]);
    setCurrentVideoState(null);
    setIsVideoPageOpen(false);
  };

  const getVideoContext = (): string => {
    if (!currentVideo) return '';
    
    const { videoInfo, transcript, fullText } = currentVideo;
    
    // Format duration
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours} 小时 ${minutes} 分钟 ${secs} 秒`;
      } else if (minutes > 0) {
        return `${minutes} 分钟 ${secs} 秒`;
      } else {
        return `${secs} 秒`;
      }
    };

    // Calculate statistics
    const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
    const segmentCount = transcript.length;
    const duration = formatDuration(videoInfo.duration);
    
    // Format numbers
    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
      }
      return num.toString();
    };

    // Format date
    const formatDate = (dateString: string): string => {
      try {
        return new Date(dateString).toLocaleDateString('zh-CN');
      } catch {
        return dateString;
      }
    };

    // Create context summary
    const contextSummary = `
当前正在分析的 YouTube 视频信息：
- 标题：${videoInfo.title}
- 作者：${videoInfo.author}
- 频道ID：${videoInfo.channelId}
- 时长：${duration} (${videoInfo.duration} 秒)
- 视频ID：${videoInfo.videoId}
- 链接：${videoInfo.url}
- 发布时间：${formatDate(videoInfo.publishedAt)}
- 观看次数：${formatNumber(videoInfo.viewCount)}
${videoInfo.likeCount ? `- 点赞数：${formatNumber(videoInfo.likeCount)}` : ''}
${videoInfo.commentCount ? `- 评论数：${formatNumber(videoInfo.commentCount)}` : ''}
- 视频描述：${videoInfo.description.substring(0, 200)}${videoInfo.description.length > 200 ? '...' : ''}
${videoInfo.tags.length > 0 ? `- 标签：${videoInfo.tags.slice(0, 10).join(', ')}` : ''}
${videoInfo.categoryId ? `- 分类ID：${videoInfo.categoryId}` : ''}
${videoInfo.defaultLanguage ? `- 默认语言：${videoInfo.defaultLanguage}` : ''}
${videoInfo.definition ? `- 清晰度：${videoInfo.definition}` : ''}
${videoInfo.caption ? `- 字幕：${videoInfo.caption}` : ''}
- 转录段落数：${segmentCount}
- 总字数：${wordCount}
- 平均语速：${videoInfo.duration ? Math.round(wordCount / (videoInfo.duration / 60)) : 0} 词/分钟

视频完整转录内容：
${fullText}
    `.trim();

    return contextSummary;
  };

  const hasActiveVideo = (): boolean => {
    return currentVideo !== null;
  };

  const value: YouTubeContextType = {
    currentVideo,
    videoHistory,
    setCurrentVideo,
    addVideoToHistory,
    clearHistory,
    isVideoPageOpen,
    setIsVideoPageOpen,
    getVideoContext,
    hasActiveVideo,
  };

  return (
    <YouTubeContext.Provider value={value}>
      {children}
    </YouTubeContext.Provider>
  );
};

export default YouTubeProvider;
