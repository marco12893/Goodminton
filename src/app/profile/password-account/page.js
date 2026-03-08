import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/profile/password-account/actions";
import BackIcon from "@/components/BackIcon";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PasswordAccountPage({ searchParams }) {
  const query = await searchParams;
  const errorMessage = query?.error;
  const successMessage = query?.success;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.95))]" />
      <div className="relative mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <BackIcon href="/profile" />
        <div className="mt-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-6">
          <p className="font-mono text-3xl font-semibold text-white">Password & Account</p>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Change your password instantly while you are signed in. No email verification is
            required for this in-app reset.
          </p>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}

          <form action={updatePasswordAction} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Email</span>
              <input
                type="email"
                value={user.email ?? ""}
                readOnly
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white/60 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">New password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                placeholder="Enter a new password"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Confirm new password</span>
              <input
                name="confirm_password"
                type="password"
                minLength={8}
                placeholder="Repeat the new password"
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none placeholder:text-white/35"
              />
            </label>

            <button className="w-full rounded-[1.2rem] bg-gradient-to-r from-[#4ad6b7] to-[#3cc7d8] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_16px_34px_rgba(18,216,201,0.28)]">
              Update Password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
