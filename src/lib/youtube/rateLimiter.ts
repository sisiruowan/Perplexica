interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: number[];
  private maxRequests: number;
  private windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.requests = [];
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  // Check if request can be made
  canMakeRequest(): boolean {
    this.cleanup();
    return this.requests.length < this.maxRequests;
  }

  // Record a request
  recordRequest(): void {
    this.cleanup();
    this.requests.push(Date.now());
  }

  // Get time until next available request
  getWaitTime(): number {
    this.cleanup();
    
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    // Calculate when the oldest request will expire
    const oldestRequest = this.requests[0];
    const expirationTime = oldestRequest + this.windowMs;
    const waitTime = expirationTime - Date.now();
    
    return Math.max(0, waitTime);
  }

  // Clean up expired requests
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  // Get current status
  getStatus(): {
    currentRequests: number;
    maxRequests: number;
    windowMs: number;
    waitTime: number;
  } {
    this.cleanup();
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      waitTime: this.getWaitTime()
    };
  }

  // Reset the rate limiter
  reset(): void {
    this.requests = [];
  }
}

// Create rate limiter instances
export const transcriptRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60 * 60 * 1000 // per hour
});

export const videoInfoRateLimiter = new RateLimiter({
  maxRequests: 1000, // 1000 requests
  windowMs: 24 * 60 * 60 * 1000 // per day
});

// Helper function to wait with rate limiting
export async function waitForRateLimit(rateLimiter: RateLimiter): Promise<void> {
  const waitTime = rateLimiter.getWaitTime();
  
  if (waitTime > 0) {
    console.log(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  rateLimiter.recordRequest();
}
