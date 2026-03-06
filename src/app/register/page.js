import Link from "next/link";
import { registerAction } from "@/app/auth/actions";

function Message({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      {value}
    </div>
  );
}

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.18),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.5),rgba(4,18,31,0.98))]" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] p-6 shadow-[0_28px_70px_rgba(3,12,22,0.45)] backdrop-blur-xl">
          <p className="font-mono text-[2rem] font-semibold">GoodMinton</p>
          <h1 className="mt-4 font-mono text-[2.25rem] font-semibold leading-none">
            Register
          </h1>
          <p className="mt-3 text-base text-white/68">
            Buat akun sederhana dengan nama lengkap, email, dan password.
          </p>

          <div className="mt-5">
            <Message value={error} />
          </div>

          <form action={registerAction} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Nama lengkap</span>
              <input
                name="full_name"
                type="text"
                placeholder="Kent Aditya"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Email</span>
              <input
                name="email"
                type="email"
                placeholder="kent@goodminton.app"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Password</span>
              <input
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]">
              Buat akun
            </button>
          </form>

          <p className="mt-6 text-sm text-white/70">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-[#17dccb]">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
