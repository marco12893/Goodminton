import Link from "next/link";
import { redirect } from "next/navigation";
import { createClubAction } from "@/app/clubs/new/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {value}
    </div>
  );
}

export default async function NewClubPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.18),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.5),rgba(4,18,31,0.98))]" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] p-6 shadow-[0_28px_70px_rgba(3,12,22,0.45)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[2rem] font-semibold">GoodMinton</p>
              <h1 className="mt-4 font-mono text-[2.15rem] font-semibold leading-none">
                Create New Club
              </h1>
            </div>
            <Link href="/" className="text-sm font-medium text-[#17dccb]">
              Back
            </Link>
          </div>

          <p className="mt-3 text-base text-white/68">
            Buat club baru, lalu Anda otomatis menjadi admin dan anggota club tersebut.
          </p>

          <div className="mt-5">
            <ErrorMessage value={error} />
          </div>

          <form action={createClubAction} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Nama club</span>
              <input
                name="name"
                type="text"
                placeholder="PB Goodminton Surabaya"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Kota / venue</span>
              <input
                name="city"
                type="text"
                placeholder="GOR Satria"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]">
              Create Club
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
