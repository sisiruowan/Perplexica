/**
 * YouTube URL detection and focus mode auto-switching utilities
 */

// YouTube URL patterns for detection
const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^"&?\/\s]{11})/gi,
  /(?:https?:\/\/)?youtu\.be\/([^"&?\/\s]{11})/gi,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^"&?\/\s]{11})/gi,
];

/**
 * Detect if a message contains YouTube URLs
 * @param message - The message to check
 * @returns boolean - True if YouTube URLs are found
 */
export function containsYouTubeUrls(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  return YOUTUBE_URL_PATTERNS.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(message);
  });
}

/**
 * Extract YouTube URLs from a message
 * @param message - The message to extract URLs from
 * @returns string[] - Array of YouTube URLs found
 */
export function extractYouTubeUrls(message: string): string[] {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const urls: string[] = [];
  
  YOUTUBE_URL_PATTERNS.forEach(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.exec(message)) !== null) {
      urls.push(match[0]);
    }
  });

  // Remove duplicates
  return [...new Set(urls)];
}

/**
 * Extract YouTube video IDs from a message
 * @param message - The message to extract video IDs from
 * @returns string[] - Array of video IDs found
 */
export function extractYouTubeVideoIds(message: string): string[] {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const videoIds: string[] = [];
  
  YOUTUBE_URL_PATTERNS.forEach(pattern => {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.exec(message)) !== null) {
      if (match[1]) {
        videoIds.push(match[1]);
      }
    }
  });

  // Remove duplicates
  return [...new Set(videoIds)];
}

/**
 * Check if auto-switching is enabled in user settings
 * @returns boolean - True if auto-switching is enabled
 */
export function isAutoSwitchEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true; // Default to enabled on server-side
  }
  
  const setting = localStorage.getItem('autoSwitchYouTubeMode');
  return setting !== 'false'; // Default to enabled unless explicitly disabled
}

/**
 * Enable or disable auto-switching in user settings
 * @param enabled - Whether to enable auto-switching
 */
export function setAutoSwitchEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('autoSwitchYouTubeMode', enabled.toString());
  }
}

/**
 * Determine if focus mode should be auto-switched based on message content
 * @param message - The message to analyze
 * @param currentFocusMode - Current focus mode
 * @returns object - Contains shouldSwitch flag and recommended focus mode
 */
export function shouldAutoSwitchFocusMode(
  message: string, 
  currentFocusMode: string
): {
  shouldSwitch: boolean;
  recommendedMode: string;
  reason: string;
  detectedUrls: string[];
} {
  const detectedUrls = extractYouTubeUrls(message);
  
  // Check if auto-switching is enabled
  if (!isAutoSwitchEnabled()) {
    return {
      shouldSwitch: false,
      recommendedMode: currentFocusMode,
      reason: 'Auto-switching is disabled in settings',
      detectedUrls,
    };
  }
  
  // If already in YouTube Transcript mode, no need to switch
  if (currentFocusMode === 'youtubeTranscript') {
    return {
      shouldSwitch: false,
      recommendedMode: currentFocusMode,
      reason: 'Already in YouTube Transcript mode',
      detectedUrls,
    };
  }

  // If YouTube URLs are detected, recommend switching
  if (detectedUrls.length > 0) {
    return {
      shouldSwitch: true,
      recommendedMode: 'youtubeTranscript',
      reason: `Detected ${detectedUrls.length} YouTube URL${detectedUrls.length > 1 ? 's' : ''}`,
      detectedUrls,
    };
  }

  return {
    shouldSwitch: false,
    recommendedMode: currentFocusMode,
    reason: 'No YouTube URLs detected',
    detectedUrls: [],
  };
}

/**
 * Check if a message is primarily about YouTube content
 * This can be used for more intelligent switching decisions
 * @param message - The message to analyze
 * @returns boolean - True if message seems to be about YouTube content
 */
export function isYouTubeRelatedMessage(message: string): boolean {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase();
  
  // Check for YouTube URLs
  if (containsYouTubeUrls(message)) {
    return true;
  }

  // Check for YouTube-related keywords
  const youtubeKeywords = [
    'youtube video',
    'youtube link',
    'watch this video',
    'video transcript',
    'video summary',
    'analyze this video',
    'what does this video say',
    'video content',
    'youtube.com',
    'youtu.be',
  ];

  return youtubeKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Generate user-friendly message about auto-switching
 * @param detectedUrls - Array of detected YouTube URLs
 * @returns string - User-friendly message
 */
export function generateAutoSwitchMessage(detectedUrls: string[]): string {
  if (detectedUrls.length === 0) {
    return '';
  }

  if (detectedUrls.length === 1) {
    return `🎥 Detected YouTube video link. Automatically switched to YouTube Transcript mode for better analysis.`;
  }

  return `🎥 Detected ${detectedUrls.length} YouTube video links. Automatically switched to YouTube Transcript mode for better analysis.`;
}
