import { logger } from './logger';

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      const status = error?.status || error?.response?.status;
      
      // Determine if error is transient
      const isTransient = !status || [429, 500, 502, 503, 504].includes(status);
      
      if (attempt > maxRetries || !isTransient) {
        logger.error(`Operation failed. Retries exhausted or non-transient error. (Attempt ${attempt}/${maxRetries})`, error);
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      
      // Add jitter (±20%)
      const jitter = delayMs * 0.2 * (Math.random() * 2 - 1);
      delayMs = delayMs + jitter;
      
      // Respect Retry-After if available
      const retryAfter = error?.response?.headers?.['retry-after'];
      if (retryAfter) {
        const parsedRetryAfter = parseInt(retryAfter, 10);
        if (!isNaN(parsedRetryAfter)) {
           // delayMs = parsedRetryAfter * 1000;
           // If retryAfter is in seconds, wait at least that long
           delayMs = Math.max(delayMs, parsedRetryAfter * 1000);
        }
      }
      
      logger.warn(`Operation failed, retrying in ${Math.round(delayMs)}ms (Attempt ${attempt}/${maxRetries}). Status: ${status}. Error: ${error.message}`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
