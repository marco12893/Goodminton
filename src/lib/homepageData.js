import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEMO_EMAIL = "kent@goodminton.app";

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

export async function getHomepageData() {
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) {
    throw new Error(usersError.message);
  }

  const currentUser = usersData.users.find((user) => user.email === DEMO_EMAIL);

  if (!currentUser) {
    return {
      greeting: `${getGreeting()}, Player`,
      subtitle: "Seeder belum dijalankan untuk user demo Goodminton.",
      clubs: [],
    };
  }

  const { data: memberships, error: membershipsError } = await supabaseAdmin
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
    .eq("user_id", currentUser.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const clubs = await Promise.all(
    (memberships ?? []).map(async (membership, index) => {
      const club = membership.club;
      const [{ count: rosterCount }, { count: matchCount }] = await Promise.all([
        supabaseAdmin
          .from("club_players")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id),
        supabaseAdmin
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id),
      ]);

      return {
        id: club.id,
        name: club.name,
        city: club.city,
        role: membership.role,
        slug: club.slug,
        rosterCount: rosterCount ?? 0,
        matchCount: matchCount ?? 0,
        initials: getInitials(club.name),
        gradient: gradients[index % gradients.length],
      };
    })
  );

  const displayName =
    currentUser.user_metadata?.full_name?.split(" ")[0] ?? currentUser.email?.split("@")[0] ?? "Player";

  return {
    greeting: `${getGreeting()}, ${displayName}`,
    subtitle: "What would you like to do today?",
    clubs,
  };
}
