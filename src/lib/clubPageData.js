import { unstable_cache } from 'next/cache';
import { createSupabaseClientForCache } from './supabase/server';

async function getClubPageDataImpl(supabase, userId, clubSlug) {
  const { data: memberships, error } = await supabase
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
          image_url,
          join_mode
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const membership = (memberships ?? []).find((item) => item.club?.slug === clubSlug) ?? null;

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
    joinMode: membership.club.join_mode ?? "invite_only",
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
