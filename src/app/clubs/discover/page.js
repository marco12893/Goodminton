import Link from "next/link";
import { redirect } from "next/navigation";
import BackIcon from "@/components/BackIcon";
import { requestClubJoinAction } from "@/app/clubs/discover/actions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getJoinModeLabel(value) {
  if (value === "open") return "Open join";
  if (value === "approval") return "Approval required";
  return "Invite only";
}

function getJoinModeStyle(value) {
  if (value === "open") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  if (value === "approval") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  return "bg-slate-500/10 text-slate-300 border-slate-500/20";
}

export default async function DiscoverClubsPage({ searchParams }) {
  const query = await searchParams;
  const search = String(query?.q ?? "").trim();
  const error = query?.error;
  const success = query?.success;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let clubsQuery = supabaseAdmin
    .from("clubs")
    .select("id, name, slug, location, city, image_url, join_mode")
    .order("name", { ascending: true })
    .limit(20);

  if (search) {
    clubsQuery = clubsQuery.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const [
    { data: clubs, error: clubsError },
    { data: memberships },
    { data: joinRequests, error: joinRequestsError },
  ] = await Promise.all([
    clubsQuery,
    supabaseAdmin.from("club_members").select("club_id, role").eq("user_id", user.id),
    supabaseAdmin.from("club_join_requests").select("club_id, status").eq("user_id", user.id),
  ]);

  if (clubsError) {
    throw new Error(clubsError.message);
  }

  const membershipMap = new Map((memberships ?? []).map((item) => [item.club_id, item.role]));
  const joinRequestMap = new Map((joinRequests ?? []).map((item) => [item.club_id, item.status]));
  const joinRequestsUnavailable =
    joinRequestsError?.message?.includes("club_join_requests") ||
    joinRequestsError?.message?.includes("relation") ||
    false;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        <div className="flex items-start justify-between">
          <BackIcon href="/" />
          <div className="flex-1 px-4 text-center">
            <p className="font-mono text-lg font-bold tracking-tight text-teal-400">GoodMinton</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Find Clubs</h1>
          </div>
          <div className="w-8" />
        </div>

        <form method="get" className="mt-6 rounded-[1.7rem] border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur-xl">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search by club name"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          />
          <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3 text-sm font-bold text-slate-900">
            Search Clubs
          </button>
        </form>

        <div className="mt-4 space-y-3 empty:hidden">
          {error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
              {success}
            </div>
          ) : null}
          {joinRequestsUnavailable ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
              Join requests are temporarily unavailable until the latest database migration is applied.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex-1 space-y-4">
          {(clubs ?? []).length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 px-5 py-10 text-center text-sm font-medium text-slate-400">
              No clubs matched your search.
            </div>
          ) : (
            (clubs ?? []).map((club) => {
              const membershipRole = membershipMap.get(club.id);
              const requestStatus = joinRequestMap.get(club.id);
              const venue = club.location || club.city || "Venue not set yet";

              return (
                <div
                  key={club.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 bg-cover bg-center text-lg font-bold text-white"
                      style={club.image_url ? { backgroundImage: `url(${club.image_url})` } : undefined}
                    >
                      {!club.image_url ? club.name.slice(0, 2).toUpperCase() : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-bold text-white">{club.name}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${getJoinModeStyle(club.join_mode)}`}>
                          {getJoinModeLabel(club.join_mode)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{venue}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {membershipRole ? (
                      <Link
                        href={`/clubs/${club.slug}`}
                        className="block w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-4 py-3 text-center text-sm font-bold text-slate-900"
                      >
                        Open Club
                      </Link>
                    ) : club.join_mode === "open" ? (
                      <Link
                        href={`/join-club/${club.slug}`}
                        className="block w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-4 py-3 text-center text-sm font-bold text-slate-900"
                      >
                        Join Club
                      </Link>
                    ) : club.join_mode === "approval" ? (
                      requestStatus === "pending" ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center text-sm font-bold text-amber-300">
                          Request Pending
                        </div>
                      ) : joinRequestsUnavailable ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-slate-400">
                          Request flow unavailable
                        </div>
                      ) : (
                        <form action={requestClubJoinAction}>
                          <input type="hidden" name="club_slug" value={club.slug} />
                          <label className="mb-3 block text-left">
                            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Join as
                            </span>
                            <select
                              name="requested_role"
                              defaultValue="player"
                              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-white outline-none focus:border-teal-400"
                              style={{ colorScheme: "dark" }}
                            >
                              <option value="player" className="bg-slate-900 text-white">Player</option>
                              <option value="spectator" className="bg-slate-900 text-white">Spectator</option>
                            </select>
                          </label>
                          <button className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg transition-all hover:opacity-90 hover:shadow-orange-500/20 active:scale-[0.98]">
                            Request to Join
                          </button>
                        </form>
                      )
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-slate-400">
                        Invite only
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
