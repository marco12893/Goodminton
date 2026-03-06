import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function PencilButton({ clubSlug }) {
  return (
    <Link
      href={`/clubs/${clubSlug}/settings/edit`}
      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-semibold text-[#071c2b] shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
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
          full_name
        )
      `
    )
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(membersError.message);
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[#13c8bf] px-5 pb-6 pt-5 text-[#0b2231] shadow-[0_24px_60px_rgba(3,12,22,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-3xl font-semibold text-white">
              Club Settings
            </p>
          </div>
          {club.role === "admin" ? <PencilButton clubSlug={clubSlug} /> : null}
        </div>
      </div>

      <div className="rounded-[2.3rem] border border-white/10 bg-[#04080e] px-5 pb-6 pt-6 shadow-[0_24px_60px_rgba(3,12,22,0.35)]">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#ffcd08] bg-cover bg-center text-center text-2xl font-bold text-[#082032] shadow-[0_12px_30px_rgba(255,205,8,0.25)] sm:mx-0 sm:h-32 sm:w-32"
            style={club.imageUrl ? { backgroundImage: `url(${club.imageUrl})` } : undefined}
          >
            {!club.imageUrl ? <span>{club.name.slice(0, 2).toUpperCase()}</span> : null}
          </div>

          <div className="min-w-0 flex-1 pt-0 sm:pt-3">
            <h1 className="break-words font-mono text-3xl font-semibold leading-tight text-white sm:text-[2.1rem]">
              {club.name}
            </h1>
            <div className="mt-4 space-y-3 text-base leading-7 text-white/92 sm:text-lg">
              <p>{club.location || "Lokasi belum diisi"}</p>
              <p>{club.playSchedule || "Jadwal bermain belum diisi"}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white sm:text-[1.9rem]">Description</h2>
          <p className="mt-3 text-base leading-7 text-white/86 sm:text-lg sm:leading-8">
            {club.description || "Deskripsi club belum diisi."}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-white sm:text-[1.9rem]">Members</h2>
          <div className="mt-4 space-y-4">
            {(members ?? []).length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-white/15 px-4 py-5 text-white/65">
                Belum ada pemain di club ini.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[1.6rem] bg-gradient-to-r from-[#13d2c1] to-[#0cc0b5] px-5 py-4 text-xl font-semibold text-white shadow-[0_14px_30px_rgba(19,210,193,0.2)] sm:text-[1.55rem]"
                >
                  {member.player?.full_name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
