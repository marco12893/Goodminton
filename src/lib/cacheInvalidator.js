import { revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache';

export class CacheInvalidator {
  static invalidateClubPlayers(clubId) {
    revalidateTag(`club-${clubId}-players`);
    revalidateTag(CACHE_TAGS.CLUB_PLAYERS);
    revalidateTag(CACHE_TAGS.CLUB_LEADERBOARD);
  }

  static invalidateClubMatches(clubId) {
    revalidateTag(`club-${clubId}-matches`);
    revalidateTag(CACHE_TAGS.CLUB_MATCHES);
    revalidateTag(CACHE_TAGS.CLUB_LEADERBOARD);
  }

  static invalidateClubTournaments(clubId) {
    revalidateTag(`club-${clubId}-tournaments`);
    revalidateTag(CACHE_TAGS.CLUB_TOURNAMENTS);
  }

  static invalidatePlayerProfile(playerId) {
    revalidateTag(`player-${playerId}`);
    revalidateTag(CACHE_TAGS.PLAYER_PROFILE);
  }

  static invalidateUserClubs(userId) {
    revalidateTag(`user-${userId}-clubs`);
    revalidateTag(CACHE_TAGS.USER_CLUBS);
  }

  static invalidateAllClubData(clubId) {
    this.invalidateClubPlayers(clubId);
    this.invalidateClubMatches(clubId);
    this.invalidateClubTournaments(clubId);
  }
}

// Helper function to invalidate cache after mutations
export function invalidateAfterMutation(type, clubId, additionalData = {}) {
  switch (type) {
    case 'player_created':
    case 'player_updated':
    case 'player_deleted':
      CacheInvalidator.invalidateClubPlayers(clubId);
      if (additionalData.playerId) {
        CacheInvalidator.invalidatePlayerProfile(additionalData.playerId);
      }
      break;
    
    case 'match_created':
    case 'match_updated':
    case 'match_approved':
    case 'match_rejected':
    case 'match_deleted':
      CacheInvalidator.invalidateClubMatches(clubId);
      CacheInvalidator.invalidateClubPlayers(clubId); // Match affects player Elo
      break;
    
    case 'tournament_created':
    case 'tournament_updated':
    case 'tournament_deleted':
      CacheInvalidator.invalidateClubTournaments(clubId);
      break;
    
    case 'club_updated':
      CacheInvalidator.invalidateUserClubs(additionalData.userId);
      break;
    
    default:
      console.warn('Unknown mutation type for cache invalidation:', type);
  }
}
