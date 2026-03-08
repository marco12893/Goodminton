import Link from "next/link";
import { registerAction } from "@/app/auth/actions";

function Message({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
      {value}
    </div>
  );
}

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.15),transparent_35%),linear-gradient(180deg,_rgba(2,6,23,0.6),rgba(2,6,23,0.95))]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="mb-6">
            <p className="font-mono text-xl font-bold tracking-tight text-teal-400">
              GoodMinton
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white">
              Register
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Create a simple account with your full name, email, and password.
            </p>
          </div>

          <div className="mb-6 empty:hidden">
            <Message value={error} />
          </div>

          <form action={registerAction} className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Full name</span>
              <input
                name="full_name"
                type="text"
                placeholder="Kent Andrew"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Email</span>
              <input
                name="email"
                type="email"
                placeholder="kent@goodminton.app"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Password</span>
              <input
                name="password"
                type="password"
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <button className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]">
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-slate-300">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-teal-400 transition-colors hover:text-teal-300">
              Login
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}