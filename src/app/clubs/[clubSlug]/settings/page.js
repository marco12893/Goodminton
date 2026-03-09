import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CLUB_ROLE_ADMIN, CLUB_ROLE_OWNER, isClubManager } from "@/lib/clubRoles";
import { getClubPageData } from "@/lib/clubPageData";
import {
  approveClubJoinRequestAction,
  rejectClubJoinRequestAction,
} from "@/app/clubs/[clubSlug]/settings/actions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Pencil, MapPin, Calendar, Users, ShieldCheck } from "lucide-react";

function RoleBadge({ role }) {
  const isOwner = role === CLUB_ROLE_OWNER;
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm ${
        isOwner
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-teal-500/30 bg-teal-500/10 text-teal-400"
      }`}
    >
      <ShieldCheck size={12} />
      {isOwner ? "Owner" : "Admin"}
    </span>
  );
}

export default async function ClubSettingsPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: members, error: membersError } = await supabaseAdmin
    .from("club_players")
    .select(`id, player:players (id, full_name, user_id)`)
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const linkedUserIds = (members ?? []).map((m) => m.player?.user_id).filter(Boolean);

  const { data: memberships } = linkedUserIds.length
    ? await supabaseAdmin.from("club_members").select("user_id, role").eq("club_id", club.id).in("user_id", linkedUserIds)
    : { data: [] };

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));
  const availableManualPlayers = (members ?? []).filter((member) => !member.player?.user_id);

  const { data: rawJoinRequests, error: joinRequestsError } = isClubManager(club.role)
    ? await supabaseAdmin
        .from("club_join_requests")
        .select("id, user_id, created_at")
        .eq("club_id", club.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  const joinRequestsUnavailable =
    joinRequestsError?.message?.includes("club_join_requests") ||
    joinRequestsError?.message?.includes("relation") ||
    false;

  if (joinRequestsError && !joinRequestsUnavailable) {
    throw new Error(joinRequestsError.message);
  }

  const joinRequestUserIds = (rawJoinRequests ?? []).map((request) => request.user_id).filter(Boolean);
  const { data: joinRequestProfiles, error: joinRequestProfilesError } = joinRequestUserIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", joinRequestUserIds)
    : { data: [], error: null };

  if (joinRequestProfilesError) {
    throw new Error(joinRequestProfilesError.message);
  }

  const joinRequestProfileMap = new Map((joinRequestProfiles ?? []).map((profile) => [profile.id, profile]));
  const joinRequests = (rawJoinRequests ?? []).map((request) => ({
    ...request,
    profile: joinRequestProfileMap.get(request.user_id) ?? null,
  }));

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 pb-12">
      {/* Header Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Club Settings</h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
              Manage club identity, schedules, and your member community roster.
            </p>
          </div>
          {isClubManager(club.role) && (
            <Link
              href={`/clubs/${clubSlug}/settings/edit`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg transition-all hover:bg-white/10 hover:text-teal-400 active:scale-95"
            >
              <Pencil size={22} />
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-10">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
            {success}
          </div>
        )}

        {/* Profile Branding */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div
            className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-slate-950 bg-slate-800 bg-cover bg-center text-3xl font-black text-white shadow-2xl ring-2 ring-teal-500/50"
            style={club.imageUrl ? { backgroundImage: `url(${club.imageUrl})` } : undefined}
          >
            {!club.imageUrl && club.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-mono text-3xl font-bold leading-tight text-white">{club.name}</h2>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-400 sm:justify-start">
                <MapPin size={16} className="text-teal-500" />
                <span>{club.location || "Location not set"}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-400 sm:justify-start">
                <Calendar size={16} className="text-teal-500" />
                <span>{club.playSchedule || "Schedule not set"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-10 border-t border-white/5 pt-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500">About Club</h3>
          <p className="mt-4 text-base font-medium leading-relaxed text-slate-300">
            {club.description || "No club description provided."}
          </p>
        </div>

        {/* Members Roster Section */}
        <div className="mt-10 border-t border-white/5 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500">Member Roster</h3>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Users size={14} />
              <span>{members?.length || 0} Members</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(members ?? []).length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm font-medium text-slate-500">
                No members found in this club.
              </div>
            ) : (
              members.map((member) => (
                <Link
                  key={member.id}
                  href={`/clubs/${clubSlug}/players/${member.id}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-teal-500/30 hover:bg-white/10"
                >
                  <span className="truncate text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                    {member.player?.full_name}
                  </span>
                  {[CLUB_ROLE_OWNER, CLUB_ROLE_ADMIN].includes(roleMap.get(member.player?.user_id)) && (
                    <RoleBadge role={roleMap.get(member.player?.user_id)} />
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {isClubManager(club.role) && (
          <div className="mt-10 border-t border-white/5 pt-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-teal-500">
                  Join Requests
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  Review membership applications when this club is set to approval mode.
                </p>
              </div>
              {!!joinRequests.length && (
                  <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
                    {joinRequests.length} Pending
                  </span>
              )}
            </div>

            {joinRequestsUnavailable ? (
              <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-6 text-sm text-amber-200">
                Join request management will appear here after the latest database migration is applied.
              </div>
            ) : joinRequests.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm font-medium text-slate-500">
                There are no pending join requests right now.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-white/8 bg-white/5 p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-bold text-white">
                          {request.profile?.full_name || request.profile?.email || "Unknown user"}
                        </p>
                        <p className="text-sm text-slate-400">{request.profile?.email}</p>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Requested{" "}
                        {new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(request.created_at))}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                      <form
                        action={approveClubJoinRequestAction}
                        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="return_to" value={`/clubs/${clubSlug}/settings`} />
                        <select
                          name="target_club_player_id"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="" className="bg-slate-900 text-white">Create or use a fresh player slot</option>
                          {availableManualPlayers.map((player) => (
                            <option key={player.id} value={player.id} className="bg-slate-900 text-white">
                              Link to {player.player?.full_name}
                            </option>
                          ))}
                        </select>
                        <input
                          name="new_player_name"
                          defaultValue={request.profile?.full_name ?? ""}
                          placeholder="New player name"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-teal-400"
                        />
                        <button className="rounded-xl bg-teal-400 px-4 py-3 text-sm font-bold text-slate-950 transition-all hover:opacity-90">
                          Approve
                        </button>
                      </form>

                      <form action={rejectClubJoinRequestAction}>
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="request_id" value={request.id} />
                        <input type="hidden" name="return_to" value={`/clubs/${clubSlug}/settings`} />
                        <button className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 transition-all hover:bg-rose-500/20 lg:w-auto">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
