// Performance monitoring utilities

export class PerformanceMonitor {
  static startTimer(label) {
    console.time(label);
    return Date.now();
  }

  static endTimer(label, startTime) {
    const duration = Date.now() - startTime;
    console.timeEnd(label);
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${label} took ${duration}ms`);
    }
    
    return duration;
  }

  static async measureAsync(label, asyncFn) {
    const startTime = this.startTimer(label);
    try {
      const result = await asyncFn();
      this.endTimer(label, startTime);
      return result;
    } catch (error) {
      this.endTimer(label, startTime);
      throw error;
    }
  }

  static logCacheHit(cacheKey, hit) {
    if (hit) {
      console.log(`🎯 Cache HIT: ${cacheKey}`);
    } else {
      console.log(`❌ Cache MISS: ${cacheKey}`);
    }
  }

  static logDatabaseQuery(query, duration) {
    if (duration > 500) {
      console.warn(`🐌 Slow DB Query (${duration}ms):`, query);
    } else {
      console.log(`🗄️ DB Query (${duration}ms):`, query);
    }
  }
}

// Middleware for performance monitoring
export function withPerformanceMonitoring(fn, label) {
  return async (...args) => {
    return PerformanceMonitor.measureAsync(label, () => fn(...args));
  };
}

// Cache performance tracker
export class CachePerformanceTracker {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.requests = [];
  }
  
  recordHit(key) {
    this.hits++;
    this.requests.push({ key, hit: true, timestamp: Date.now() });
    PerformanceMonitor.logCacheHit(key, true);
  }
  
  recordMiss(key) {
    this.misses++;
    this.requests.push({ key, hit: false, timestamp: Date.now() });
    PerformanceMonitor.logCacheHit(key, false);
  }
  
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
  
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      totalRequests: this.hits + this.misses
    };
  }
  
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.requests = [];
  }
}

// Global cache performance tracker
export const cachePerformanceTracker = new CachePerformanceTracker();
