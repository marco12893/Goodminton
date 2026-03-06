import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function AdminStar() {
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/12 text-sm text-[#ffe27a]"
      aria-label="Admin"
      title="Admin"
    >
      ★
    </span>
  );
}

function PencilButton({ clubSlug }) {
  return (
    <Link
      href={`/clubs/${clubSlug}/settings/edit`}
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-xl font-semibold text-white shadow-[0_12px_24px_rgba(2,14,28,0.28)] backdrop-blur-xl"
    >
      P
    </Link>
  );
}

export default async function ClubSettingsPage({ params, searchParams }) {
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

  const { data: members, error: membersError } = await supabase
    .from("club_players")
    .select(
      `
        id,
        player:players (
          id,
          full_name,
          user_id
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
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 pb-6 pt-5 text-white shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">
              Club Settings
            </p>
            <p className="mt-3 text-sm text-white/65">
              Club profile, schedule, description, and member roster.
            </p>
          </div>
          {club.role === "admin" ? <PencilButton clubSlug={clubSlug} /> : null}
        </div>
      </div>

      <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 pb-6 pt-6 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(135deg,#16d4c1,#1590b8)] bg-cover bg-center text-center text-2xl font-bold text-[#082032] shadow-[0_12px_30px_rgba(22,212,193,0.18)] sm:mx-0 sm:h-32 sm:w-32"
            style={club.imageUrl ? { backgroundImage: `url(${club.imageUrl})` } : undefined}
          >
            {!club.imageUrl ? <span>{club.name.slice(0, 2).toUpperCase()}</span> : null}
          </div>

          <div className="min-w-0 flex-1 pt-0 sm:pt-3">
            <h1 className="break-words font-mono text-3xl font-semibold leading-tight text-white sm:text-[2.1rem]">
              {club.name}
            </h1>
            <div className="mt-4 space-y-3 text-base leading-7 text-white/92 sm:text-lg">
              <p>{club.location || "Location not set yet"}</p>
              <p>{club.playSchedule || "Playing schedule not set yet"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white sm:text-[1.9rem]">Description</h2>
          <p className="mt-3 text-base leading-7 text-white/86 sm:text-lg sm:leading-8">
            {club.description || "Club description has not been added yet."}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white sm:text-[1.9rem]">Members</h2>
          <div className="mt-4 space-y-4">
            {(members ?? []).length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-white/15 px-4 py-5 text-white/65">
                No players have been added to this club yet.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(135deg,rgba(21,196,189,0.94),rgba(16,148,188,0.92))] px-5 py-4 text-xl font-semibold text-white shadow-[0_14px_30px_rgba(19,210,193,0.16)] sm:text-[1.55rem]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 break-words">{member.player?.full_name}</span>
                    {roleMap.get(member.player?.user_id) === "admin" ? <AdminStar /> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
