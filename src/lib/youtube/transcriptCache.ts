import { YouTubeTranscriptResult } from './transcriptExtractor';

interface CacheEntry {
  result: YouTubeTranscriptResult;
  timestamp: number;
  expiresAt: number;
}

class TranscriptCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttlHours: number = 24) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  // Get cached transcript
  get(videoId: string): YouTubeTranscriptResult | null {
    const entry = this.cache.get(videoId);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(videoId);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(videoId);
    this.cache.set(videoId, entry);

    return entry.result;
  }

  // Set cache entry
  set(videoId: string, result: YouTubeTranscriptResult): void {
    // Don't cache errors
    if (result.error) {
      return;
    }

    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl
    };

    this.cache.set(videoId, entry);
  }

  // Clear expired entries
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    let oldestEntry = null;
    let newestEntry = null;

    for (const entry of this.cache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      oldestEntry,
      newestEntry
    };
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
  }
}

// Create singleton instance
export const transcriptCache = new TranscriptCache(100, 24); // 100 entries, 24 hour TTL

// Cleanup expired entries every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    transcriptCache.clearExpired();
  }, 60 * 60 * 1000);
}
