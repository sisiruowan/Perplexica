import axios from 'axios';
import { Document } from 'langchain/document';
import { YoutubeTranscript } from 'youtube-transcript';
import { transcriptCache } from './transcriptCache';
import { transcriptRateLimiter, videoInfoRateLimiter, waitForRateLimit } from './rateLimiter';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  duration: number;
  thumbnail: string;
  url: string;
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

// Fetch video info using YouTube oEmbed API (no API key required)
async function fetchVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  try {
    // Apply rate limiting
    await waitForRateLimit(videoInfoRateLimiter);
    
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await axios.get(oembedUrl);
    const data = response.data;
    
    return {
      videoId,
      title: data.title || 'Unknown Title',
      author: data.author_name || 'Unknown Author',
      duration: 0, // oEmbed doesn't provide duration
      thumbnail: data.thumbnail_url || '',
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
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
        duration: 0,
        thumbnail: '',
        url: url
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
      fetchVideoInfo(videoId),
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
    const videoInfo = await fetchVideoInfo(videoId);
    return {
      videoInfo: videoInfo || {
        videoId,
        title: 'Unknown Video',
        author: 'Unknown Author',
        duration: 0,
        thumbnail: '',
        url: `https://www.youtube.com/watch?v=${videoId}`
      },
      transcript: [],
      fullText: '',
      error: error.message || 'Failed to extract transcript. The video might not have captions available.'
    };
  }
}

// Convert YouTube transcript to Document for processing
export function youTubeTranscriptToDocument(result: YouTubeTranscriptResult): Document {
  const { videoInfo, fullText } = result;
  
  return new Document({
    pageContent: fullText,
    metadata: {
      source: videoInfo.url,
      title: videoInfo.title,
      author: videoInfo.author,
      type: 'youtube_transcript',
      videoId: videoInfo.videoId,
      thumbnail: videoInfo.thumbnail
    }
  });
}

// Generate summary prompt for YouTube video
export function generateYouTubeSummaryPrompt(videoInfo: YouTubeVideoInfo): string {
  return `Please provide a comprehensive summary of the YouTube video titled "${videoInfo.title}" by ${videoInfo.author}. 
  Include the main topics discussed, key points, and any important takeaways.`;
}
