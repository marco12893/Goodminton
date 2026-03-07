function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const gradients = [
  "from-[#17d6c3] via-[#18c8b7] to-[#0ca9c2]",
  "from-[#0fd6c6] via-[#20c6d4] to-[#1d8fb9]",
  "from-[#22d0b5] via-[#17bebb] to-[#1b9bd1]",
];

export async function getHomepageData(supabase, user) {
  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle(),
    supabase
      .from("players")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const { data: memberships, error: membershipsError } = await supabase
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
          image_url
        )
      `
    )
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const clubs = await Promise.all(
    (memberships ?? []).map(async (membership, index) => {
      const club = membership.club;
      const [{ count: rosterCount }, { count: matchCount }] = await Promise.all([
        supabase
          .from("club_players")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id),
        supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id),
      ]);

      return {
        id: club.id,
        name: club.name,
        city: club.location || club.city,
        role: membership.role,
        slug: club.slug,
        rosterCount: rosterCount ?? 0,
        matchCount: matchCount ?? 0,
        initials: getInitials(club.name),
        gradient: gradients[index % gradients.length],
        imageUrl: club.image_url ?? "",
      };
    })
  );

  const displayName =
    profile?.full_name?.split(" ")[0] ??
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "Player";

  return {
    greeting: `${getGreeting()}, ${displayName}`,
    subtitle: "What would you like to do today?",
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "",
    avatarUrl: player?.avatar_url ?? "",
    clubs,
  };
}
