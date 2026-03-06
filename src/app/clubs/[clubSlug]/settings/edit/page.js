import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addClubPlayerAction,
  linkClubPlayerAction,
  promoteClubMemberAction,
  removeClubPlayerAction,
  updateClubSettingsAction,
} from "@/app/clubs/[clubSlug]/settings/actions";
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

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
      <span>★</span>
      <span>Admin</span>
    </span>
  );
}

export default async function EditClubSettingsPage({ params, searchParams }) {
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

  if (club.role !== "admin") {
    redirect(`/clubs/${clubSlug}/settings`);
  }

  const { data: members, error: membersError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        player:players (
          id,
          full_name,
          user_id,
          profile:profiles!players_user_id_fkey (
            email,
            full_name
          )
        )
      `
    )
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const linkedUserIds = (members ?? [])
    .map((member) => member.player?.user_id)
    .filter(Boolean);

  const { data: memberships, error: membershipsError } = linkedUserIds.length
    ? await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", club.id)
        .in("user_id", linkedUserIds)
    : { data: [], error: null };

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-mono text-3xl font-semibold text-white">
          Edit Club
        </h1>
        <Link href={`/clubs/${clubSlug}/settings`} className="text-sm font-medium text-[#17dccb]">
          Back
        </Link>
      </div>

      <ErrorMessage value={error} />

      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.78),rgba(34,42,62,0.7))] p-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <h2 className="font-mono text-[1.5rem] font-semibold text-white">
          Club Configuration
        </h2>

        <form action={updateClubSettingsAction} className="mt-5 space-y-4">
          <input type="hidden" name="club_slug" value={clubSlug} />

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Club name</span>
            <input
              name="name"
              defaultValue={club.name}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Location</span>
            <input
              name="location"
              defaultValue={club.location ?? ""}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Playing schedule</span>
            <input
              name="play_schedule"
              defaultValue={club.playSchedule ?? ""}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Description</span>
            <textarea
              name="description"
              rows="4"
              defaultValue={club.description ?? ""}
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Club image URL</span>
            <input
              name="image_url"
              defaultValue={club.imageUrl ?? ""}
              placeholder="Leave empty to use a placeholder"
              className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
            />
          </label>

          <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]">
            Save Club
          </button>
        </form>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.78),rgba(34,42,62,0.7))] p-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <h2 className="font-mono text-[1.5rem] font-semibold text-white">
          Players
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Add manual players, then link them to registered accounts by email so the
          club appears on their homepage automatically.
        </p>
        <form action={addClubPlayerAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="club_slug" value={clubSlug} />
          <input
            name="full_name"
            placeholder="New player name"
            className="flex-1 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
          />
          <button className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#082032] sm:self-start">
            Add
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {(members ?? []).map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/7 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{member.player?.full_name}</p>
                  {roleMap.get(member.player?.user_id) === "admin" ? <AdminBadge /> : null}
                </div>
                <p className="text-sm text-white/60">
                  {member.player?.user_id ? "Linked account" : "Manual player"}
                </p>
                {member.player?.profile?.email ? (
                  <p className="mt-1 text-xs text-[#17dccb]">
                    {member.player.profile.email}
                  </p>
                ) : null}
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[16rem]">
                {!member.player?.user_id ? (
                  <form action={linkClubPlayerAction} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="club_player_id" value={member.id} />
                    <input
                      name="email"
                      type="email"
                      placeholder="Link account email"
                      className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white outline-none placeholder:text-white/35"
                    />
                    <button className="rounded-full bg-[#16d4c1] px-4 py-2 text-sm font-semibold text-[#082032]">
                      Link
                    </button>
                  </form>
                ) : null}

                {member.player?.user_id &&
                roleMap.get(member.player?.user_id) !== "admin" ? (
                  <form action={promoteClubMemberAction} className="sm:self-end">
                    <input type="hidden" name="club_slug" value={clubSlug} />
                    <input type="hidden" name="club_player_id" value={member.id} />
                    <button className="w-full rounded-full bg-amber-300 px-3 py-2 text-sm font-semibold text-[#082032] sm:w-auto">
                      Promote to admin
                    </button>
                  </form>
                ) : null}

                <form action={removeClubPlayerAction} className="sm:self-end">
                  <input type="hidden" name="club_slug" value={clubSlug} />
                  <input type="hidden" name="club_player_id" value={member.id} />
                  <button className="w-full rounded-full border border-white/15 px-3 py-2 text-sm text-white/80 sm:w-auto">
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
