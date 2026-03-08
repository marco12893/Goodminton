import { unstable_cache } from 'next/cache';
import { createSupabaseClientForCache } from './supabase/server';

async function getClubPageDataImpl(supabase, userId, clubSlug) {
  const { data: membership, error } = await supabase
    .from("club_members")
    .select(
      `
        role,
        club:clubs (
          id,
          name,
          slug,
          city,
          location,
          play_schedule,
          description,
          image_url
        )
      `
    )
    .eq("user_id", userId)
    .eq("clubs.slug", clubSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!membership?.club) {
    return null;
  }

  return {
    id: membership.club.id,
    name: membership.club.name,
    slug: membership.club.slug,
    city: membership.club.location || membership.club.city,
    location: membership.club.location || membership.club.city,
    playSchedule: membership.club.play_schedule,
    description: membership.club.description,
    imageUrl: membership.club.image_url,
    role: membership.role,
  };
}

// Create cached version with proper cache key
export const getClubPageData = unstable_cache(
  async (userId, clubSlug, cookies) => {
    // Create Supabase client with passed cookies
    const supabase = createSupabaseClientForCache(cookies);
    
    return getClubPageDataImpl(supabase, userId, clubSlug);
  },
  ['club-page-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['user-clubs']
  }
);
