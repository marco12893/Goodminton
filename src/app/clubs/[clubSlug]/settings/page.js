import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Pencil, MapPin, Calendar, Users, ShieldCheck } from "lucide-react";

function AdminBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-teal-400 backdrop-blur-sm">
      <ShieldCheck size={12} />
      Admin
    </span>
  );
}

export default async function ClubSettingsPage({ params, searchParams }) {
  const { clubSlug } = await params;
  const query = await searchParams;
  const error = query?.error;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) notFound();

  const { data: members, error: membersError } = await supabase
    .from("club_players")
    .select(`id, player:players (id, full_name, user_id)`)
    .eq("club_id", club.id)
    .order("created_at", { ascending: true });

  if (membersError) throw new Error(membersError.message);

  const linkedUserIds = (members ?? []).map((m) => m.player?.user_id).filter(Boolean);

  const { data: memberships } = linkedUserIds.length
    ? await supabase.from("club_members").select("user_id, role").eq("club_id", club.id).in("user_id", linkedUserIds)
    : { data: [] };

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));

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
          {club.role === "admin" && (
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
                  {roleMap.get(member.player?.user_id) === "admin" && <AdminBadge />}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}