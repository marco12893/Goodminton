import Link from "next/link";
import { loginAction } from "@/app/auth/actions";
import PendingButton from "@/components/PendingButton";

function Message({ value, tone }) {
  if (!value) return null;

  const className =
    tone === "error"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
      : "border-teal-500/20 bg-teal-500/10 text-teal-200";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium backdrop-blur-sm ${className}`}>
      {value}
    </div>
  );
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="mb-6">
            <p className="font-mono text-xl font-bold tracking-tight text-teal-400">
              GoodMinton
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-white">
              Login
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Sign in to see the clubs you belong to.
            </p>
          </div>

          <div className="mb-6 space-y-3 empty:hidden">
            <Message value={error} tone="error" />
            <Message value={message} tone="success" />
          </div>

          <form action={loginAction} className="space-y-5">
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

            <PendingButton
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]"
              pendingLabel="Signing in..."
            >
              Login
            </PendingButton>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-slate-300">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-teal-400 transition-colors hover:text-teal-300">
              Register
            </Link>
          </p>

        </div>
      </div>
    </main>
  );
}
