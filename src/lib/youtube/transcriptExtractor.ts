import axios from 'axios';
import { Document } from 'langchain/document';
import { YoutubeTranscript } from 'youtube-transcript';
import { google } from 'googleapis';
import { transcriptCache } from './transcriptCache';
import { transcriptRateLimiter, videoInfoRateLimiter, waitForRateLimit } from './rateLimiter';
import { getYouTubeApiKey } from '../config';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  channelId: string;
  duration: number;
  thumbnail: string;
  url: string;
  publishedAt: string;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  description: string;
  tags: string[];
  categoryId?: string;
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
  liveBroadcastContent?: string;
  dimension?: string;
  definition?: string;
  caption?: string;
  licensedContent?: boolean;
  projection?: string;
}

export interface YouTubeTranscript {
  text: string;
  start: number;
  duration: number;
}

export interface YouTubeTranscriptResult {
  videoInfo: YouTubeVideoInfo;
  transcript: YouTubeTranscript[];
  fullText: string;
  error?: string;
}

// Extract video ID from various YouTube URL formats
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([^"&?\/\s]{11})$/ // Just the video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Detect YouTube URLs in text
export function detectYouTubeUrls(text: string): string[] {
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi;
  const matches = text.match(urlPattern) || [];
  return [...new Set(matches)]; // Remove duplicates
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Fetch video info using YouTube Data API v3
async function fetchVideoInfoWithAPI(videoId: string): Promise<YouTubeVideoInfo | null> {
  try {
    // Apply rate limiting
    await waitForRateLimit(videoInfoRateLimiter);
    
    const apiKey = getYouTubeApiKey();
    if (!apiKey) {
      console.warn('YouTube API key not configured, falling back to oEmbed');
      return await fetchVideoInfoFallback(videoId);
    }
    
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
    
    const response = await youtube.videos.list({
      part: [
        'snippet',
        'contentDetails',
        'statistics',
        'status',
        'recordingDetails',
        'liveStreamingDetails'
      ],
      id: [videoId],
    });
    
    const video = response.data.items?.[0];
    if (!video) {
      throw new Error('Video not found');
    }
    
    const snippet = video.snippet!;
    const contentDetails = video.contentDetails!;
    const statistics = video.statistics!;
    
    return {
      videoId,
      title: snippet.title || 'Unknown Title',
      author: snippet.channelTitle || 'Unknown Author',
      channelId: snippet.channelId || '',
      duration: parseDuration(contentDetails.duration || 'PT0S'),
      thumbnail: snippet.thumbnails?.maxres?.url || 
                 snippet.thumbnails?.high?.url || 
                 snippet.thumbnails?.medium?.url || 
                 snippet.thumbnails?.default?.url || '',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
      commentCount: parseInt(statistics.commentCount || '0', 10),
      description: snippet.description || '',
      tags: snippet.tags || [],
      categoryId: snippet.categoryId || undefined,
      defaultLanguage: snippet.defaultLanguage || undefined,
      defaultAudioLanguage: snippet.defaultAudioLanguage || undefined,
      liveBroadcastContent: snippet.liveBroadcastContent || undefined,
      dimension: contentDetails.dimension || undefined,
      definition: contentDetails.definition || undefined,
      caption: contentDetails.caption || undefined,
      licensedContent: contentDetails.licensedContent || undefined,
      projection: contentDetails.projection || undefined,
    };
  } catch (error: any) {
    console.error('Error fetching video info with API:', error);
    
    // Check if it's a quota exceeded error
    if (error.code === 403 && error.message?.includes('quota')) {
      console.warn('YouTube API quota exceeded, falling back to oEmbed');
    }
    
    // Fall back to oEmbed API
    return await fetchVideoInfoFallback(videoId);
  }
}

// Fallback: Fetch video info using YouTube oEmbed API (no API key required)
async function fetchVideoInfoFallback(videoId: string): Promise<YouTubeVideoInfo | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oembedUrl);
    const data = response.data;
    
    return {
      videoId,
      title: data.title || 'Unknown Title',
      author: data.author_name || 'Unknown Author',
      channelId: '',
      duration: 0, // oEmbed doesn't provide duration
      thumbnail: data.thumbnail_url || '',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: new Date().toISOString(),
      viewCount: 0,
      description: '',
      tags: [],
    };
  } catch (error) {
    console.error('Error fetching video info with oEmbed:', error);
    return null;
  }
}

// Fetch transcript using youtube-transcript package
async function fetchTranscript(videoId: string): Promise<YouTubeTranscript[]> {
  try {
    // Apply rate limiting
    await waitForRateLimit(transcriptRateLimiter);
    
    // Fetch transcript using the youtube-transcript package
    const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
    
    return transcriptData.map((item: any) => ({
      text: item.text || '',
      start: item.offset / 1000, // Convert milliseconds to seconds
      duration: item.duration / 1000 // Convert milliseconds to seconds
    }));
  } catch (error: any) {
    console.error('Error fetching transcript:', error);
    
    // Check if it's a specific error about no transcript
    if (error.message && error.message.includes('Transcript is disabled')) {
      throw new Error('Transcript is disabled for this video');
    } else if (error.message && error.message.includes('Could not find')) {
      throw new Error('No transcript available for this video');
    }
    
    throw new Error('Failed to fetch transcript');
  }
}

// Main function to extract YouTube transcript
export async function extractYouTubeTranscript(url: string): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return {
      videoInfo: {
        videoId: '',
        title: '',
        author: '',
        channelId: '',
        duration: 0,
        thumbnail: '',
        url: url,
        publishedAt: new Date().toISOString(),
        viewCount: 0,
        description: '',
        tags: [],
      },
      transcript: [],
      fullText: '',
      error: 'Invalid YouTube URL'
    };
  }
  
  // Check cache first
  const cachedResult = transcriptCache.get(videoId);
  if (cachedResult) {
    console.log(`Using cached transcript for video ${videoId}`);
    return cachedResult;
  }
  
  try {
    // Fetch video info and transcript in parallel
    const [videoInfo, transcript] = await Promise.all([
      fetchVideoInfoWithAPI(videoId),
      fetchTranscript(videoId)
    ]);
    
    if (!videoInfo) {
      throw new Error('Failed to fetch video information');
    }
    
    // Combine transcript text
    const fullText = transcript.map(t => t.text).join(' ');
    
    const result: YouTubeTranscriptResult = {
      videoInfo,
      transcript,
      fullText
    };
    
    // Cache the successful result
    transcriptCache.set(videoId, result);
    
    return result;
  } catch (error: any) {
    const videoInfo = await fetchVideoInfoWithAPI(videoId);
    return {
      videoInfo: videoInfo || {
        videoId,
        title: 'Unknown Video',
        author: 'Unknown Author',
        channelId: '',
        duration: 0,
        thumbnail: '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: new Date().toISOString(),
        viewCount: 0,
        description: '',
        tags: [],
      },
      transcript: [],
      fullText: '',
      error: error.message || 'Failed to extract transcript. The video might not have captions available.'
    };
  }
}

// Convert YouTube transcript to Document for processing
export function youTubeTranscriptToDocument(result: YouTubeTranscriptResult): Document {
  const { videoInfo, fullText, transcript } = result;
  
  return new Document({
    pageContent: fullText,
    metadata: {
      source: videoInfo.url,
      title: videoInfo.title,
      author: videoInfo.author,
      channelId: videoInfo.channelId,
      type: 'youtube_transcript',
      videoId: videoInfo.videoId,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      publishedAt: videoInfo.publishedAt,
      viewCount: videoInfo.viewCount,
      likeCount: videoInfo.likeCount,
      commentCount: videoInfo.commentCount,
      description: videoInfo.description,
      tags: videoInfo.tags,
      categoryId: videoInfo.categoryId,
      transcriptData: transcript,
      transcriptLength: transcript.length,
      wordCount: fullText.split(/\s+/).length,
    }
  });
}

// Generate summary prompt for YouTube video
export function generateYouTubeSummaryPrompt(videoInfo: YouTubeVideoInfo): string {
  return `Please provide a comprehensive summary of the YouTube video titled "${videoInfo.title}" by ${videoInfo.author}. 
  Include the main topics discussed, key points, and any important takeaways.`;
}
