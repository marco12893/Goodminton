import { redirect } from "next/navigation";
import { ChevronRight, FileText, LockKeyhole, LogOut, Share2, ShieldCheck, UserRound } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { deleteAccountAction } from "@/app/profile/actions";
import PendingButton from "@/components/PendingButton";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavLink, FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function AccountMenuItem({ href, icon: Icon, title, description }) {
  return (
    <FullscreenNavLink
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:-translate-y-1 hover:bg-white/10 hover:shadow-lg active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 transition-colors group-hover:bg-teal-400 group-hover:text-slate-900">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-white transition-colors group-hover:text-teal-300">
          {title}
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-400">
          {description}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-teal-400" />
    </FullscreenNavLink>
  );
}

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }) {
  const query = await searchParams;
  const errorMessage = query?.error;
  const successMessage = query?.message;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    throw new Error(playerError.message);
  }

  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? "Goodminton User";
  const email = profile?.email ?? user.email ?? "";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "GM";
  const avatarUrl = player?.avatar_url ?? "";

  return (
    <FullscreenNavProvider>
      <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />
      <div className="absolute inset-0 bg-[url('/background/premium_photo-1670002272491-3d3f8f5c00a5.webp')] bg-cover bg-center opacity-10 mix-blend-screen" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        
        {/* Top Header Card */}
        <div className="relative z-20 rounded-[2rem] border border-white/20 bg-gradient-to-br from-teal-400 to-cyan-500 px-6 pb-10 pt-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center">
              <BackNavIcon href="/" />
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-900">Profile</p>
            {/* Balancer for absolute centering */}
            <div className="w-8" />
          </div>

          <div className="mt-8 flex items-center gap-5">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/20 bg-cover bg-center text-2xl font-bold text-slate-900 shadow-inner"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
            >
              {!avatarUrl ? initials : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-2xl font-bold leading-tight text-slate-900">
                {fullName}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800/80">
                {email}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Menu Section */}
        <section className="relative z-10 -mt-6 flex-1 rounded-b-[2rem] rounded-t-xl border border-white/10 bg-white/5 px-5 pb-8 pt-12 shadow-2xl backdrop-blur-xl">
          <p className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Account Settings
          </p>
          
          <div className="mt-4 space-y-3">
            <AccountMenuItem
              href="/profile/personal-information"
              icon={UserRound}
              title="Personal Information"
              description="Your account information"
            />
            <AccountMenuItem
              href="/profile/password-account"
              icon={LockKeyhole}
              title="Password & Account"
              description="Manage your account settings"
            />
            <AccountMenuItem
              href="/profile/invite-a-friend"
              icon={Share2}
              title="Invite a Friend"
              description="Invite a friend to join Goodminton"
            />
            <AccountMenuItem
              href="/profile/privacy-policy"
              icon={ShieldCheck}
              title="Privacy Policy"
              description="How we handle your data"
            />
            <AccountMenuItem
              href="/profile/terms-of-service"
              icon={FileText}
              title="Terms of Service"
              description="Rules, rights, and responsibilities"
            />
          </div>

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

          <form action={logoutAction} className="mt-6">
            <PendingButton
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-base font-bold text-rose-400 shadow-lg transition-all hover:bg-rose-500/20 hover:text-rose-300 active:scale-[0.98]"
              pendingLabel="Signing out..."
            >
              <LogOut className="h-5 w-5" />
              Logout
            </PendingButton>
          </form>

          <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-300">
              Danger Zone
            </p>
            <p className="mt-2 text-sm font-medium text-rose-100/80">
              Deleting your account will remove your login access and unlink your data. Match history will remain
              for club records, but your profile will be removed.
            </p>
            <form action={deleteAccountAction} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-rose-200/80">
                  Type DELETE to confirm
                </span>
                <input
                  name="confirmation"
                  placeholder="DELETE"
                  className="w-full rounded-xl border border-rose-400/20 bg-slate-950/40 px-4 py-3 text-base text-white outline-none transition-all focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                />
              </label>
              <PendingButton
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500 px-5 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:bg-rose-400 active:scale-[0.98]"
                pendingLabel="Deleting..."
              >
                Delete Account
              </PendingButton>
            </form>
          </div>
        </section>

      </div>
    </main>
    </FullscreenNavProvider>
  );
}
