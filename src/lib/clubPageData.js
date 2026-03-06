export async function getClubPageData(supabase, user, clubSlug) {
  const { data: membership, error } = await supabase
    .from("club_members")
    .select(
      `
        role,
        club:clubs (
          id,
          name,
          slug,
          city
        )
      `
    )
    .eq("user_id", user.id)
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
    city: membership.club.city,
    role: membership.role,
  };
}
