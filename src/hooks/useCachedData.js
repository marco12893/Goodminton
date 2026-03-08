"use client";

import { useState, useEffect, useCallback } from 'react';

class ClientCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, data, ttl = 300000) { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new ClientCache();

export function useCachedData(
  key,
  fetcher,
  options = {}
) {
  const { ttl = 300000, dependencies = [], initialData } = options;
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cachedData = globalCache.get(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const freshData = await fetcher();
      globalCache.set(key, freshData, ttl);
      setData(freshData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const invalidate = useCallback(() => {
    globalCache.clear(key);
    fetchData();
  }, [key, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
  };
}

// Export cache instance for manual cache management
export { globalCache as clientCache };
