import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/app/profile/password-account/actions";
import PendingButton from "@/components/PendingButton";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
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
    <FullscreenNavProvider>
      <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-6 py-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Header section with Back Button */}
          <div className="flex items-start justify-between">
            <div className="pt-1">
              <BackNavIcon href="/profile" />
            </div>
            <div className="flex-1 px-4 text-center">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                Password
              </h1>
            </div>
            {/* Balancer for absolute centering */}
            <div className="w-8" /> 
          </div>

          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            Change your password instantly while you are signed in. No email verification is required for this in-app reset.
          </p>

          <div className="mt-6 space-y-3 empty:hidden">
            {errorMessage ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm font-medium text-teal-200 backdrop-blur-sm">
                {successMessage}
              </div>
            ) : null}
          </div>

          <form action={updatePasswordAction} className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={user.email ?? ""}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/5 px-4 py-3.5 text-base text-slate-400 outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">New password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                placeholder="Enter a new password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Confirm new password</span>
              <input
                name="confirm_password"
                type="password"
                minLength={8}
                placeholder="Repeat the new password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <PendingButton
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]"
              pendingLabel="Updating..."
            >
              Update Password
            </PendingButton>
          </form>

        </div>
      </div>
    </main>
    </FullscreenNavProvider>
  );
}
