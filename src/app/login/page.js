import Link from "next/link";
import { loginAction } from "@/app/auth/actions";

function Message({ value, tone }) {
  if (!value) return null;

  const className =
    tone === "error"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.18),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.5),rgba(4,18,31,0.98))]" />
      <div className="absolute inset-0 bg-[url('/background/photo-1722087642932-9b070e9a066e.webp')] bg-cover bg-center opacity-12 mix-blend-screen" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] p-6 shadow-[0_28px_70px_rgba(3,12,22,0.45)] backdrop-blur-xl">
          <p className="font-mono text-[2rem] font-semibold">GoodMinton</p>
          <h1 className="mt-4 font-mono text-[2.25rem] font-semibold leading-none">
            Login
          </h1>
          <p className="mt-3 text-base text-white/68">
            Sign in to see the clubs you belong to.
          </p>

          <div className="mt-5 space-y-3">
            <Message value={error} tone="error" />
            <Message value={message} tone="success" />
          </div>

          <form action={loginAction} className="mt-5 space-y-4">
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
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <button className="w-full rounded-full bg-gradient-to-r from-[#12d8c9] to-[#18c3e5] px-5 py-3 text-lg font-semibold text-[#062232] shadow-[0_14px_30px_rgba(18,216,201,0.35)]">
              Login
            </button>
          </form>

          <p className="mt-6 text-sm text-white/70">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-[#17dccb]">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
