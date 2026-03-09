import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePersonalInformationAction } from "@/app/profile/personal-information/actions";
import SignedImageUploadField from "@/components/SignedImageUploadField";
import BackIcon from "@/components/BackIcon";
import { parseStoragePathFromPublicUrl } from "@/lib/storageUploads";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PersonalInformationPage({ searchParams }) {
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

  const [{ data: profile, error: profileError }, { data: player, error: playerError }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("players")
      .select("full_name, gender, birth_date, handedness, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (playerError) {
    throw new Error(playerError.message);
  }

  const fullName = profile?.full_name ?? player?.full_name ?? user.user_metadata?.full_name ?? "";
  const email = profile?.email ?? user.email ?? "";
  const avatarUrl = player?.avatar_url ?? "";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "GM";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07131f] text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-6 py-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Header section with Back Button */}
          <div className="flex items-start justify-between">
            <div className="pt-1">
              <BackIcon href="/profile" />
            </div>
            <div className="flex-1 px-4 text-center">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                Personal Info
              </h1>
            </div>
            {/* Balancer for absolute centering */}
            <div className="w-8" /> 
          </div>

          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            These details are tied to your global player identity, so they follow your account across every club.
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

          <form action={updatePersonalInformationAction} className="mt-6 space-y-5">
            <SignedImageUploadField
              label="Profile Photo"
              folder="avatars"
              objectId={user.id}
              initialUrl={avatarUrl}
              initialPath={parseStoragePathFromPublicUrl(avatarUrl) ?? ""}
              initialsLabel={fullName || initials}
              urlInputName="avatar_url"
              pathInputName="avatar_storage_path"
              currentUrlInputName="current_avatar_url"
              currentPathInputName="current_avatar_storage_path"
              allowRemove
              removeLabel="Remove photo"
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Full Name</span>
              <input
                name="full_name"
                type="text"
                defaultValue={fullName}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/5 px-4 py-3.5 text-base text-slate-400 outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">Gender</span>
                <select
                  name="gender"
                  defaultValue={player?.gender ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
                >
                  <option className="bg-slate-900 text-white" value="male">Male</option>
                  <option className="bg-slate-900 text-white" value="female">Female</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">Handedness</span>
                <select
                  name="handedness"
                  defaultValue={player?.handedness ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
                >
                  <option className="bg-slate-900 text-white" value="">Not set</option>
                  <option className="bg-slate-900 text-white" value="right">Right-handed</option>
                  <option className="bg-slate-900 text-white" value="left">Left-handed</option>
                  <option className="bg-slate-900 text-white" value="ambidextrous">Both</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Birthday</span>
              <input
                name="birth_date"
                type="date"
                defaultValue={player?.birth_date ?? ""}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <button className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]">
              Save Personal Information
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}