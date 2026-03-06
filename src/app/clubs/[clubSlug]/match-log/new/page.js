import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createMatchLogAction } from "@/app/clubs/[clubSlug]/match-log/actions";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {value}
    </div>
  );
}

function getDefaultDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function NewMatchLogPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const club = await getClubPageData(supabase, user, clubSlug);

  if (!club) {
    notFound();
  }

  const { data: clubPlayers, error: clubPlayersError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        player:players (
          full_name
        )
      `
    )
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (clubPlayersError) {
    throw new Error(clubPlayersError.message);
  }

  const options = clubPlayers ?? [];

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-semibold text-white">Add Match</h1>
        <Link href={`/clubs/${clubSlug}/match-log`} className="text-sm font-medium text-[#17dccb]">
          Back
        </Link>
      </div>

      <ErrorMessage value={error} />

      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.78),rgba(34,42,62,0.7))] p-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <p className="text-sm leading-6 text-white/65">
          All members can submit matches. Admin-created matches are approved immediately.
        </p>

        <form action={createMatchLogAction} className="mt-5 space-y-5">
          <input type="hidden" name="club_slug" value={clubSlug} />

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Date and time</span>
            <input
              name="played_at"
              type="datetime-local"
              defaultValue={getDefaultDateTimeLocal()}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 1 - Player 1</span>
              <select
                name="team1_player1"
                className="w-full rounded-2xl border border-white/12 bg-[#152133] px-4 py-3 text-base text-white outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select player
                </option>
                {options.map((clubPlayer) => (
                  <option key={clubPlayer.id} value={clubPlayer.id}>
                    {clubPlayer.player?.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 1 - Player 2</span>
              <select
                name="team1_player2"
                className="w-full rounded-2xl border border-white/12 bg-[#152133] px-4 py-3 text-base text-white outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select player
                </option>
                {options.map((clubPlayer) => (
                  <option key={clubPlayer.id} value={clubPlayer.id}>
                    {clubPlayer.player?.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 2 - Player 1</span>
              <select
                name="team2_player1"
                className="w-full rounded-2xl border border-white/12 bg-[#152133] px-4 py-3 text-base text-white outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select player
                </option>
                {options.map((clubPlayer) => (
                  <option key={clubPlayer.id} value={clubPlayer.id}>
                    {clubPlayer.player?.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 2 - Player 2</span>
              <select
                name="team2_player2"
                className="w-full rounded-2xl border border-white/12 bg-[#152133] px-4 py-3 text-base text-white outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  Select player
                </option>
                {options.map((clubPlayer) => (
                  <option key={clubPlayer.id} value={clubPlayer.id}>
                    {clubPlayer.player?.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 1 score</span>
              <input
                name="team1_score"
                type="number"
                min="0"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Team 2 score</span>
              <input
                name="team2_score"
                type="number"
                min="0"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
              />
            </label>
          </div>

          <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]">
            Submit match
          </button>
        </form>
      </div>
    </section>
  );
}
