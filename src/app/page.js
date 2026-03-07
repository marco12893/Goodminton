import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/auth/actions";
import { getHomepageData } from "@/lib/homepageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function RoleBadge({ role }) {
  const copy = role === "admin" ? "Admin club" : "Member";
  return (
    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/74">
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.95))]" />
      <div className="absolute inset-0 bg-[url('/background/photo-1722087642932-9b070e9a066e.webp')] bg-cover bg-center opacity-14 mix-blend-screen" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-9">
        <header className="flex items-start justify-between">
          <div className="pt-8">
            <p className="font-mono text-[2rem] font-semibold tracking-tight text-white">
              GoodMinton
            </p>
            <div className="mt-3 h-1 w-44 rounded-full bg-gradient-to-r from-[#1be2cf] to-[#2cb7ff]" />
          </div>

          <form action={logoutAction} className="mt-6">
            <button className="flex h-16 w-16 items-center justify-center rounded-full border border-white/14 bg-white/8 shadow-[0_12px_30px_rgba(2,14,28,0.35)] backdrop-blur-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16d4c1] text-sm font-semibold text-[#082032] shadow-[0_0_0_4px_rgba(255,255,255,0.08)]">
                OUT
              </div>
            </button>
          </form>
        </header>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.78),rgba(34,42,62,0.7))] px-5 py-6 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
          <div className="border-l border-white/20 pl-4">
            <h1 className="font-mono text-[1.95rem] font-semibold leading-none tracking-tight text-white">
              {data.greeting}
            </h1>
            <p className="mt-3 text-lg text-white/68">{data.subtitle}</p>
          </div>
        </section>

        <section className="mt-9 rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(60,68,92,0.78),rgba(31,39,59,0.72))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.38)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#16d4c1] text-sm font-semibold text-[#0a2231]">
                NEW
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[1.9rem] font-semibold leading-none text-white">
                Start a new Club
              </p>
              <p className="mt-2 max-w-[15rem] text-lg leading-6 text-white/68">
                Create a community badminton club.
              </p>
            </div>
          </div>

          <Link
            href="/clubs/new"
            className="mt-5 block w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-center text-lg font-semibold tracking-wide text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]"
          >
            New Club
          </Link>
        </section>

        <section className="mt-10 flex-1 rounded-t-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(62,69,90,0.8),rgba(38,45,66,0.9))] px-5 pb-7 pt-4 shadow-[0_-8px_40px_rgba(2,10,20,0.22)] backdrop-blur-xl">
          <div className="mx-auto h-1 w-20 rounded-full bg-white/70" />
          <div className="mt-4">
            <h2 className="font-mono text-[2rem] font-semibold text-white">My Clubs</h2>
          </div>

          <div className="mt-5 space-y-5">
            {data.clubs.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-white/20 bg-white/6 px-5 py-8 text-center text-white/70">
                You are not a member of any clubs yet.
              </div>
            ) : (
              data.clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubs/${club.slug}`}
                  className={`block rounded-[2rem] bg-gradient-to-br ${club.gradient} px-5 py-5 text-[#07202f] shadow-[0_22px_50px_rgba(0,0,0,0.2)]`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#f3f8f8] text-[1.6rem] font-bold tracking-tight text-[#0d2433] shadow-inner">
                      {club.initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-mono text-[1.9rem] font-semibold leading-tight text-[#071c2b]">
                        {club.name}
                      </h3>
                      <div className="mt-3 h-[2px] w-full rounded-full bg-[#0d7d87]/35" />
                      <div className="mt-3 text-[1rem] leading-none text-[#08222f]/84">
                        <p>{club.city || "Venue not set yet"}</p>
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
