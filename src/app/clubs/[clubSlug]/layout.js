import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ClubBottomNav from "@/components/ClubBottomNav";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubLayout({ children, params }) {
  const { clubSlug } = await params;

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

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-4 pt-4">
        <header className="pt-2">
          <div className="flex items-start justify-between gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center rounded-full bg-white/8 px-4 py-2 text-sm font-medium text-white/92 backdrop-blur-xl"
            >
              Back
            </Link>
            <div className="min-w-0 flex-1 text-right">
              <p className="break-words font-mono text-3xl font-semibold leading-tight text-white">
                {club.name}
              </p>
              <p className="mt-2 text-sm leading-5 text-white/65">{club.city || "Venue belum diisi"}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-5 pb-6 pt-6">{children}</div>

        <ClubBottomNav clubSlug={clubSlug} />
      </div>
    </main>
  );
}
