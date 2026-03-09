import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import BackIcon from "@/components/BackIcon";
import { joinOpenClubAction } from "@/app/clubs/[clubSlug]/join/actions";
import { getClubBySlug } from "@/lib/clubJoin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function JoinOpenClubPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  await cookies();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const club = await getClubBySlug(clubSlug);

  if (!club || club.join_mode !== "open") {
    notFound();
  }

  const membershipLookup = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipLookup.error) {
    throw new Error(membershipLookup.error.message);
  }

  if (membershipLookup.data) {
    redirect(`/clubs/${club.slug}`);
  }

  const [{ data: clubPlayers, error: manualPlayersError }, { data: userPlayer }] = await Promise.all([
    supabase
      .from("club_players")
      .select(
        `
          id,
          player:players (
            full_name,
            user_id
          )
        `
      )
      .eq("club_id", club.id)
      .order("created_at", { ascending: true }),
    supabase.from("players").select("full_name").eq("user_id", user.id).maybeSingle(),
  ]);

  if (manualPlayersError) {
    throw new Error(manualPlayersError.message);
  }

  const manualPlayers = (clubPlayers ?? []).filter((player) => !player.player?.user_id);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <div className="flex items-start justify-between">
          <BackIcon href="/clubs/discover" />
          <div className="flex-1 px-4 text-center">
            <p className="font-mono text-lg font-bold tracking-tight text-teal-400">GoodMinton</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Join {club.name}</h1>
          </div>
          <div className="w-8" />
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
            {error}
          </div>
        ) : null}

        <form action={joinOpenClubAction} className="mt-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <input type="hidden" name="club_slug" value={club.slug} />

          <p className="text-sm font-medium leading-relaxed text-slate-300">
            Pick an existing manual player slot or create a fresh player entry for your account.
          </p>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Existing player slot</span>
            <select
              name="target_club_player_id"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10"
            >
              <option value="">Create or use my own player</option>
              {(manualPlayers ?? []).map((player) => (
                <option key={player.id} value={player.id}>
                  {player.player?.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">New player name</span>
            <input
              name="new_player_name"
              defaultValue={userPlayer?.full_name ?? ""}
              placeholder="Your player name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
            />
          </label>

          <button className="mt-6 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90">
            Join Club
          </button>
        </form>
      </div>
    </main>
  );
}
