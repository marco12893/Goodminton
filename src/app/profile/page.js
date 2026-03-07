import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LockKeyhole, LogOut, Share2, UserRound } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function AccountMenuItem({ href, icon: Icon, title, description }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4 shadow-[0_14px_30px_rgba(2,10,20,0.18)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#071b2a]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-white/55">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-white/55" />
    </Link>
  );
}

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.95))]" />
      <div className="absolute inset-0 bg-[url('/background/premium_photo-1670002272491-3d3f8f5c00a5.webp')] bg-cover bg-center opacity-15 mix-blend-screen" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <div className="rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,#1ccfc2,#14b9df)] px-5 pb-8 pt-5 text-[#071b2a] shadow-[0_24px_60px_rgba(3,12,22,0.35)]">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-white">
              Back
            </Link>
            <p className="font-mono text-[1.8rem] font-semibold text-white">Profile</p>
            <div className="w-10" />
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white/70 bg-[#083042] bg-cover bg-center text-3xl font-semibold text-white"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
            >
              {!avatarUrl ? initials : null}
            </div>
            <div className="min-w-0">
              <p className="text-[1.8rem] font-semibold leading-tight text-white">{fullName}</p>
              <p className="mt-2 text-sm text-white/80">{email}</p>
            </div>
          </div>
        </div>

        <section className="relative -mt-5 flex-1 rounded-t-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,14,0.98),rgba(4,9,16,0.98))] px-4 pb-8 pt-8 shadow-[0_-8px_40px_rgba(2,10,20,0.22)]">
          <p className="text-sm uppercase tracking-[0.22em] text-white/45">Account Settings</p>
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
          </div>

          <form action={logoutAction} className="mt-8">
            <button className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-[#4ad6b7] to-[#3cc7d8] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_16px_34px_rgba(18,216,201,0.28)]">
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
