import { FullscreenNavLink } from "@/components/FullscreenNavOverlay";
import { notFound, redirect } from "next/navigation";
import {
  addClubPlayerAction,
  demoteClubMemberAction,
  dissolveClubAction,
  linkClubPlayerAction,
  promoteClubMemberAction,
  removeClubPlayerAction,
  removeClubSpectatorAction,
  promoteSpectatorToPlayerAction,
  transferClubOwnershipAction,
  updateClubSettingsAction,
} from "@/app/clubs/[clubSlug]/settings/actions";
import { demotePlayerToSpectatorAction } from "@/app/clubs/[clubSlug]/players/[clubPlayerId]/actions";
import {
  CLUB_ROLE_ADMIN,
  CLUB_ROLE_OWNER,
  isClubManager,
  isClubOwner,
} from "@/lib/clubRoles";
import SignedImageUploadField from "@/components/SignedImageUploadField";
import PendingButton from "@/components/PendingButton";
import { getClubPageData } from "@/lib/clubPageData";
import { parseStoragePathFromPublicUrl } from "@/lib/storageUploads";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ShieldCheck, UserPlus, Link as LinkIcon, UserMinus } from "lucide-react";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
      {value}
    </div>
  );
}

function RoleBadge({ role }) {
  const isOwner = role === CLUB_ROLE_OWNER;
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
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

export default async function EditClubSettingsPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;
  const warning = query?.warning;
  const confirmPlayerId = query?.confirm_player_id ?? null;
  const confirmMatchCount = Number(query?.match_count ?? 0);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club || !isClubManager(club.role)) {
    redirect(`/clubs/${clubSlug}/settings`);
  }

  const { data: members, error: membersError } = await supabaseAdmin
    .from("club_players")
    .select(`id, player:players (id, full_name, user_id, profile:profiles!players_user_id_fkey (email, full_name))`)
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const linkedUserIds = (members ?? []).map((m) => m.player?.user_id).filter(Boolean);

  const { data: memberships } = linkedUserIds.length
    ? await supabaseAdmin.from("club_members").select("user_id, role").eq("club_id", club.id).in("user_id", linkedUserIds)
    : { data: [] };

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));
  const filteredMembers = (members ?? []).filter((member) => {
    const role = member.player?.user_id ? roleMap.get(member.player.user_id) : null;
    return role !== "spectator";
  });

  const { data: spectators, error: spectatorsError } = await supabaseAdmin
    .from("club_members")
    .select("id, user_id, created_at")
    .eq("club_id", club.id)
    .eq("role", "spectator")
    .order("created_at", { ascending: true });

  if (spectatorsError) {
    throw new Error(spectatorsError.message);
  }

  const spectatorUserIds = (spectators ?? []).map((item) => item.user_id).filter(Boolean);
  const { data: spectatorProfiles, error: spectatorProfilesError } = spectatorUserIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", spectatorUserIds)
    : { data: [], error: null };

  if (spectatorProfilesError) {
    throw new Error(spectatorProfilesError.message);
  }

  const spectatorProfileMap = new Map(
    (spectatorProfiles ?? []).map((profile) => [profile.id, profile])
  );

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      {/* Header section */}
      <div className="px-2">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Edit Club</h1>
      </div>

      <div className="space-y-3 empty:hidden">
        <ErrorMessage value={error} />
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
            {success}
          </div>
        )}
        {warning === "player_has_matches" && confirmPlayerId ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
            This player has {confirmMatchCount} recorded match{confirmMatchCount === 1 ? "" : "es"}.
            Removing them will not delete matches but will detach them from the roster.
          </div>
        ) : null}
        {warning === "transfer_ownership" && confirmPlayerId ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
            You are about to transfer club ownership. This action will demote you to admin and grant full
            control to the selected member.
          </div>
        ) : null}
      </div>

      {/* Club Configuration Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h2 className="mb-6 font-mono text-xl font-bold text-white flex items-center gap-2">
          <span className="text-teal-400">01.</span> Club Configuration
        </h2>

        <form action={updateClubSettingsAction} className="space-y-5">
          <input type="hidden" name="club_slug" value={clubSlug} />
          <SignedImageUploadField
            label="Club icon"
            folder="clubs"
            objectId={club.id}
            initialUrl={club.imageUrl ?? ""}
            initialPath={parseStoragePathFromPublicUrl(club.imageUrl ?? "") ?? ""}
            initialsLabel={club.name}
            urlInputName="image_url"
            pathInputName="image_storage_path"
            currentUrlInputName="current_image_url"
            currentPathInputName="current_image_storage_path"
            allowRemove
            removeLabel="Remove photo"
          />

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Club Name</span>
            <input
              name="name"
              defaultValue={club.name}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Location</span>
              <input
                name="location"
                defaultValue={club.location ?? ""}
                placeholder="GOR Satria, Surabaya"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Playing Schedule</span>
              <input
                name="play_schedule"
                defaultValue={club.playSchedule ?? ""}
                placeholder="Every Friday, 7 PM"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</span>
            <textarea
              name="description"
              rows="4"
              defaultValue={club.description ?? ""}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Join Mode</span>
            <select
              name="join_mode"
              defaultValue={club.joinMode ?? "invite_only"}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              style={{ colorScheme: "dark" }}
            >
              <option value="invite_only" className="bg-slate-900 text-white">Invite only</option>
              <option value="approval" className="bg-slate-900 text-white">Approval required</option>
              <option value="open" className="bg-slate-900 text-white">Open join</option>
            </select>
          </label>

          <PendingButton
            className="w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
            pendingLabel="Saving..."
          >
            Save Club Settings
          </PendingButton>
        </form>
      </div>

      {/* Players Management Card */}
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h2 className="font-mono text-xl font-bold text-white flex items-center gap-2">
          <span className="text-teal-400">02.</span> Player Roster
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
          Manage manual players and link them to registered accounts to enable automatic club access for them.
        </p>

        {/* Add Player Form */}
        <form action={addClubPlayerAction} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="club_slug" value={clubSlug} />
          <div className="relative flex-1">
            <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              name="full_name"
              placeholder="New player name..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-base text-white outline-none transition-all focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <PendingButton
            className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
            pendingLabel="Adding..."
          >
            Add Player
          </PendingButton>
        </form>

        <div className="mt-8 space-y-3">
        {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <FullscreenNavLink
                    href={`/clubs/${clubSlug}/players/${member.id}`}
                    className="text-base font-bold text-white transition-colors hover:text-teal-400"
                  >
                    {member.player?.full_name}
                  </FullscreenNavLink>
                  {[CLUB_ROLE_OWNER, CLUB_ROLE_ADMIN].includes(roleMap.get(member.player?.user_id)) && (
                    <RoleBadge role={roleMap.get(member.player?.user_id)} />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                    member.player?.user_id ? "bg-teal-500/10 text-teal-400" : "bg-slate-500/10 text-slate-500"
                  }`}>
                    {member.player?.user_id ? "Linked Account" : "Manual Player"}
                  </span>
                  {member.player?.profile?.email && (
                    <span className="text-xs font-medium text-slate-400 truncate max-w-[12rem]">
                      • {member.player.profile.email}
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex flex-wrap items-center gap-2 sm:shrink-0 ${member.player?.user_id ? "w-full sm:w-auto" : ""}`}>
                {!member.player?.user_id && (
                  <form action={linkClubPlayerAction} className="flex flex-1 items-center gap-2 sm:flex-initial">
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="club_player_id" value={member.id} />
                    <div className="relative flex-1 sm:w-48">
                      <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        name="email"
                        type="email"
                        placeholder="Link email"
                        className="w-full rounded-lg border border-white/10 bg-slate-950/50 py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-teal-400"
                      />
                    </div>
                    <PendingButton
                      className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/30"
                      pendingLabel="Linking..."
                    >
                      Link
                    </PendingButton>
                  </form>
                )}

                {member.player?.user_id ? (
                  <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                    {member.player?.user_id && ![CLUB_ROLE_ADMIN, CLUB_ROLE_OWNER].includes(roleMap.get(member.player?.user_id)) && (
                      <form action={promoteClubMemberAction} className="w-full">
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="club_player_id" value={member.id} />
                        <PendingButton
                          className="flex h-10 w-full items-center justify-center rounded-lg bg-amber-500/20 px-3 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/30"
                          pendingLabel="Promoting..."
                        >
                          Promote
                        </PendingButton>
                      </form>
                    )}

                    {member.player?.user_id && ![CLUB_ROLE_ADMIN, CLUB_ROLE_OWNER].includes(roleMap.get(member.player?.user_id)) && (
                      <form action={demotePlayerToSpectatorAction} className="w-full">
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="club_player_id" value={member.id} />
                        <PendingButton
                          className="flex h-10 w-full items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-[11px] font-bold uppercase tracking-widest text-amber-200 transition-colors hover:bg-amber-500/20"
                          pendingLabel="Converting..."
                        >
                          Convert to Spectator
                        </PendingButton>
                      </form>
                    )}

                    {isClubOwner(club.role) && roleMap.get(member.player?.user_id) === CLUB_ROLE_ADMIN && (
                      <form action={demoteClubMemberAction} className="w-full">
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="club_player_id" value={member.id} />
                        <PendingButton
                          className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-500/20 px-3 text-xs font-bold text-slate-300 transition-colors hover:bg-slate-500/30"
                          pendingLabel="Demoting..."
                        >
                          Demote
                        </PendingButton>
                      </form>
                    )}

                    {isClubOwner(club.role) && member.player?.user_id && roleMap.get(member.player?.user_id) !== CLUB_ROLE_OWNER && (
                      <form action={transferClubOwnershipAction} className="w-full">
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="club_player_id" value={member.id} />
                        {confirmPlayerId === member.id ? (
                          <input type="hidden" name="confirm_transfer" value="1" />
                        ) : null}
                        <PendingButton
                          className="flex h-10 w-full items-center justify-center rounded-lg bg-cyan-500/20 px-3 text-xs font-bold text-cyan-300 transition-colors hover:bg-cyan-500/30"
                          pendingLabel="Transferring..."
                        >
                          {confirmPlayerId === member.id ? "Confirm Owner" : "Make Owner"}
                        </PendingButton>
                      </form>
                    )}

                    {(roleMap.get(member.player?.user_id) !== CLUB_ROLE_OWNER &&
                      (isClubOwner(club.role) || roleMap.get(member.player?.user_id) !== CLUB_ROLE_ADMIN)) && (
                      <form action={removeClubPlayerAction} className="w-full">
                        <input type="hidden" name="club_slug" value={clubSlug} />
                        <input type="hidden" name="club_player_id" value={member.id} />
                        {confirmPlayerId === member.id ? (
                          <input type="hidden" name="confirm_remove" value="1" />
                        ) : null}
                        <PendingButton
                          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/20"
                          pendingLabel="Removing..."
                        >
                          <UserMinus size={14} />
                          {confirmPlayerId === member.id ? "Remove Anyway" : "Remove"}
                        </PendingButton>
                      </form>
                    )}
                  </div>
                ) : (
                  (!member.player?.user_id ||
                    (roleMap.get(member.player?.user_id) !== CLUB_ROLE_OWNER &&
                      (isClubOwner(club.role) || roleMap.get(member.player?.user_id) !== CLUB_ROLE_ADMIN))) && (
                    <form action={removeClubPlayerAction}>
                      <input type="hidden" name="club_slug" value={clubSlug} />
                      <input type="hidden" name="club_player_id" value={member.id} />
                      {confirmPlayerId === member.id ? (
                        <input type="hidden" name="confirm_remove" value="1" />
                      ) : null}
                      <PendingButton
                        className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
                        pendingLabel="Removing..."
                      >
                        <UserMinus size={14} />
                        {confirmPlayerId === member.id ? "Remove Anyway" : "Remove"}
                      </PendingButton>
                    </form>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h2 className="font-mono text-xl font-bold text-white flex items-center gap-2">
          <span className="text-teal-400">03.</span> Spectators
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
          Spectators can view club activity but won&apos;t appear on the leaderboard.
        </p>

        {(spectators ?? []).length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm font-medium text-slate-500">
            No spectators yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {spectators.map((spectator) => {
              const profile = spectatorProfileMap.get(spectator.user_id) ?? null;
              return (
              <div
                key={spectator.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-white">
                    {profile?.full_name || profile?.email || "Unknown user"}
                  </p>
                  <p className="truncate text-xs text-slate-400">{profile?.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={promoteSpectatorToPlayerAction}>
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="membership_id" value={spectator.id} />
                    <PendingButton
                      className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-200 hover:bg-teal-500/20 transition-colors"
                      pendingLabel="Promoting..."
                    >
                      Promote to Player
                    </PendingButton>
                  </form>
                  <form action={removeClubSpectatorAction}>
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="membership_id" value={spectator.id} />
                    <PendingButton
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors"
                      pendingLabel="Removing..."
                    >
                      Remove
                    </PendingButton>
                  </form>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {isClubOwner(club.role) && (
      <div className="rounded-[2rem] border border-rose-500/20 bg-rose-950/20 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <h2 className="mb-2 font-mono text-xl font-bold text-white flex items-center gap-2">
          <span className="text-rose-400">04.</span> Danger Zone
        </h2>
        <p className="text-sm font-medium leading-relaxed text-rose-100/80">
          Dissolving a club permanently deletes the club, members, join requests, matches,
          Elo history, tournaments, and all tournament data tied to this club.
        </p>

        <form action={dissolveClubAction} className="mt-6 space-y-4">
          <input type="hidden" name="club_slug" value={clubSlug} />
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-rose-300/80">
              Type the exact club name to confirm
            </span>
            <input
              name="confirmation_name"
              placeholder={club.name}
              className="w-full rounded-xl border border-rose-400/20 bg-slate-950/40 px-4 py-3 text-base text-white outline-none transition-all focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
          </label>

          <PendingButton
            className="w-full rounded-xl border border-rose-400/20 bg-rose-500 px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-rose-400 active:scale-[0.98]"
            pendingLabel="Dissolving..."
          >
            Dissolve Club
          </PendingButton>
        </form>
      </div>
      )}

    </section>
  );
}
