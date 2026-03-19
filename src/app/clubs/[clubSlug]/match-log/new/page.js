import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createMatchLogAction } from "@/app/clubs/[clubSlug]/match-log/actions";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: clubPlayers, error: clubPlayersError } = await supabase
    .from("club_players")
    .select(`id, player:players (full_name)`)
    .eq("club_id", club.id)
    .order("full_name", { ascending: true, foreignTable: "players" });

  if (clubPlayersError) throw new Error(clubPlayersError.message);

  const options = (clubPlayers ?? []).slice().sort((a, b) =>
    (a.player?.full_name ?? "").localeCompare(b.player?.full_name ?? "", "id", { sensitivity: "base" })
  );

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header section */}
      <div className="px-2">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Add Match</h1>
      </div>

      <div className="empty:hidden">
        <ErrorMessage value={error} />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <p className="mb-8 text-sm font-medium leading-relaxed text-slate-400">
          All members can submit matches. Fill only Player 1 on each team for singles, or add both players for doubles.
          Manager-created matches are approved immediately and affect Elo ratings.
        </p>

        <form action={createMatchLogAction} className="space-y-8">
          <input type="hidden" name="club_slug" value={clubSlug} />

          {/* Date Picker */}
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Match Date & Time</span>
            <input
              name="played_at"
              type="datetime-local"
              defaultValue={getDefaultDateTimeLocal()}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
            />
          </label>

          {/* Players Selection Grid */}
          <div className="grid gap-8 sm:grid-cols-2">
            
            {/* Team 1 Selection */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Team 1</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Player 1</span>
                  <select
                    name="team1_player1"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    defaultValue=""
                  >
                    <option value="" disabled>Select player</option>
                    {options.map((cp) => <option className="bg-slate-900" key={cp.id} value={cp.id}>{cp.player?.full_name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Player 2 (Optional)</span>
                  <select
                    name="team1_player2"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    defaultValue=""
                  >
                    <option value="">None / Singles</option>
                    {options.map((cp) => <option className="bg-slate-900" key={cp.id} value={cp.id}>{cp.player?.full_name}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Team 2 Selection */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">Team 2</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Player 1</span>
                  <select
                    name="team2_player1"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    defaultValue=""
                  >
                    <option value="" disabled>Select player</option>
                    {options.map((cp) => <option className="bg-slate-900" key={cp.id} value={cp.id}>{cp.player?.full_name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Player 2 (Optional)</span>
                  <select
                    name="team2_player2"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold text-white outline-none transition-all focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                    defaultValue=""
                  >
                    <option value="">None / Singles</option>
                    {options.map((cp) => <option className="bg-slate-900" key={cp.id} value={cp.id}>{cp.player?.full_name}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Scores Grid */}
          <div className="pt-4">
            <h3 className="mb-4 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500">Final Score</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-center text-[10px] font-bold uppercase text-slate-500">Team 1 Score</span>
                <input
                  name="team1_score"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-2xl font-black text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-center text-[10px] font-bold uppercase text-slate-500">Team 2 Score</span>
                <input
                  name="team2_score"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-2xl font-black text-white outline-none transition-all focus:border-rose-400 focus:bg-white/10 focus:ring-1 focus:ring-rose-400"
                />
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button className="mt-4 w-full rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-4 text-base font-bold text-slate-900 shadow-lg shadow-cyan-500/20 transition-all hover:opacity-90 hover:shadow-cyan-500/30 active:scale-[0.98]">
            Submit Match Result
          </button>
        </form>
      </div>
    </section>
  );
}
