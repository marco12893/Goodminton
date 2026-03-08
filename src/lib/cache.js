import { unstable_cache } from 'next/cache';

// Cache configuration
export const CACHE_CONFIG = {
  // Short-term cache for frequently changing data
  SHORT: { revalidate: 60 }, // 1 minute
  // Medium-term cache for semi-static data
  MEDIUM: { revalidate: 300 }, // 5 minutes
  // Long-term cache for static data
  LONG: { revalidate: 3600 }, // 1 hour
  // Very long cache for rarely changing data
  VERY_LONG: { revalidate: 86400 }, // 24 hours
};

// Cache tags for invalidation
export const CACHE_TAGS = {
  CLUB_PLAYERS: 'club-players',
  CLUB_MATCHES: 'club-matches',
  CLUB_TOURNAMENTS: 'club-tournaments',
  PLAYER_PROFILE: 'player-profile',
  CLUB_LEADERBOARD: 'club-leaderboard',
  USER_CLUBS: 'user-clubs',
};

// Create a cached function wrapper that avoids circular references
export function createCachedFunction(fn, keyParts, options = {}) {
  return unstable_cache(fn, keyParts, {
    revalidate: options.revalidate || CACHE_CONFIG.MEDIUM.revalidate,
    tags: options.tags,
  });
}

// Helper function to generate cache keys
export function generateCacheKey(prefix, ...params) {
  return [prefix, ...params.map(String)].join(':');
}

// Cache invalidation helper
export async function invalidateCache(tags) {
  if (typeof window === 'undefined') {
    const { revalidateTag } = await import('next/cache');
    tags.forEach(tag => revalidateTag(tag));
  }
}

// Safe cache wrapper that only serializes primitive values
export function createSafeCachedFunction(fn, keyParts, options = {}) {
  return unstable_cache(
    async (...args) => {
      // Filter out complex objects that might cause circular references
      const safeArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // Only extract primitive values from complex objects
          if (arg.id) return arg.id;
          if (arg.userId) return arg.userId;
          if (arg.clubId) return arg.clubId;
          return String(arg);
        }
        return arg;
      });
      
      return fn(...args);
    },
    keyParts,
    {
      revalidate: options.revalidate || CACHE_CONFIG.MEDIUM.revalidate,
      tags: options.tags,
    }
  );
}
