import Link from "next/link";
import { redirect } from "next/navigation";
import { getHomepageData } from "@/lib/homepageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function RoleBadge({ role }) {
  const copy = role === "admin" ? "Admin club" : "Member";
  return (
    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm">
      {copy}
    </span>
  );
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getHomepageData(supabase, user);
  const profileInitials = (data.fullName ?? user.email ?? "GM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "GM";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.15),transparent_35%),linear-gradient(180deg,_rgba(2,6,23,0.6),rgba(2,6,23,0.95))]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between pt-4">
          <div>
            <p className="font-mono text-3xl font-bold tracking-tight text-white">
              GoodMinton
            </p>
            <div className="mt-2 h-1.5 w-16 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500" />
          </div>

          <Link
            href="/profile"
            className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
          >
            <div
              className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-teal-500 bg-cover bg-center text-sm font-bold text-slate-900 ring-2 ring-transparent transition-all group-hover:ring-white/50"
              style={data.avatarUrl ? { backgroundImage: `url(${data.avatarUrl})` } : undefined}
            >
              {!data.avatarUrl ? profileInitials : null}
            </div>
          </Link>
        </header>

        {/* Greeting Section */}
        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 px-6 py-7 shadow-xl backdrop-blur-lg">
          <div className="border-l-4 border-teal-400 pl-4">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
              {data.greeting}
            </h1>
            <p className="mt-2 text-base font-medium text-slate-300">
              {data.subtitle}
            </p>
          </div>
        </section>

        {/* Start New Club Section */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-400 text-xs font-bold text-slate-900 shadow-inner">
                NEW
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold leading-none text-white">
                Start a new Club
              </p>
              <p className="mt-1.5 text-sm text-slate-300">
                Create a community badminton club.
              </p>
            </div>
          </div>

          <Link
            href="/clubs/new"
            className="mt-6 block w-full rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-center text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]"
          >
            New Club
          </Link>
        </section>

        {/* My Clubs Section */}
        <section className="mt-8 flex-1 rounded-t-[2.5rem] border-x border-t border-white/10 bg-white/5 px-6 pb-8 pt-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto h-1.5 w-16 rounded-full bg-white/20" />
          
          <div className="mt-6">
            <h2 className="text-xl font-bold text-white">My Clubs</h2>
          </div>

          <div className="mt-5 space-y-4">
            {data.clubs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 px-5 py-10 text-center text-sm font-medium text-slate-400">
                You are not a member of any clubs yet.
              </div>
            ) : (
              data.clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.slug}`}
                  className={`group block overflow-hidden rounded-3xl bg-gradient-to-br ${club.gradient} p-5 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]`}
                >
                  <div className="flex items-center gap-5">
                    {/* Simplified redundant div wrap for Avatar */}
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/40 bg-cover bg-center text-2xl font-bold text-slate-900 shadow-inner"
                      style={club.imageUrl ? { backgroundImage: `url(${club.imageUrl})` } : undefined}
                    >
                      {!club.imageUrl ? club.initials : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-xl font-bold text-slate-900">
                        {club.name}
                      </h3>
                      <div className="mt-2 h-px w-full bg-slate-900/10" />
                      <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <p className="truncate">{club.city || "Venue not set yet"}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}