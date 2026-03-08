import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addClubPlayerAction,
  linkClubPlayerAction,
  promoteClubMemberAction,
  removeClubPlayerAction,
  updateClubSettingsAction,
} from "@/app/clubs/[clubSlug]/settings/actions";
import SignedImageUploadField from "@/components/SignedImageUploadField";
import { getClubPageData } from "@/lib/clubPageData";
import { parseStoragePathFromPublicUrl } from "@/lib/storageUploads";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ChevronLeft, ShieldCheck, UserPlus, Link as LinkIcon, UserMinus } from "lucide-react";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
      {value}
    </div>
  );
}

function AdminBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-teal-400">
      <ShieldCheck size={12} />
      Admin
    </span>
  );
}

export default async function EditClubSettingsPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;
  const success = query?.success;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club || club.role !== "admin") {
    redirect(`/clubs/${clubSlug}/settings`);
  }

  const { data: members, error: membersError } = await supabase
    .from("club_players")
    .select(`id, player:players (id, full_name, user_id, profile:profiles!players_user_id_fkey (email, full_name))`)
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const linkedUserIds = (members ?? []).map((m) => m.player?.user_id).filter(Boolean);

  const { data: memberships } = linkedUserIds.length
    ? await supabase.from("club_members").select("user_id, role").eq("club_id", club.id).in("user_id", linkedUserIds)
    : { data: [] };

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 pb-12">
      {/* Header section */}
      <div className="flex items-center justify-between px-2">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">Edit Club</h1>
        <Link 
          href={`/clubs/${clubSlug}/settings`} 
          className="flex items-center gap-1 text-sm font-bold text-teal-400 transition-colors hover:text-teal-300"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="space-y-3 empty:hidden">
        <ErrorMessage value={error} />
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
            {success}
          </div>
        )}
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

          <button className="w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 active:scale-[0.98]">
            Save Club Settings
          </button>
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
          <button className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:scale-95">
            Add Player
          </button>
        </form>

        <div className="mt-8 space-y-3">
          {(members ?? []).map((member) => (
            <div
              key={member.id}
              className="group flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/clubs/${clubSlug}/players/${member.id}`}
                    className="text-base font-bold text-white transition-colors hover:text-teal-400"
                  >
                    {member.player?.full_name}
                  </Link>
                  {roleMap.get(member.player?.user_id) === "admin" && <AdminBadge />}
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

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
                    <button className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-400 hover:bg-teal-500/30">
                      Link
                    </button>
                  </form>
                )}

                {member.player?.user_id && roleMap.get(member.player?.user_id) !== "admin" && (
                  <form action={promoteClubMemberAction}>
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="club_player_id" value={member.id} />
                    <button className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition-colors">
                      Promote
                    </button>
                  </form>
                )}

                <form action={removeClubPlayerAction}>
                  <input type="hidden" name="club_slug" value={clubSlug} />
                  <input type="hidden" name="club_player_id" value={member.id} />
                  <button className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors">
                    <UserMinus size={14} />
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}