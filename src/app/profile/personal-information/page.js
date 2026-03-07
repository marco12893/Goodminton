import Link from "next/link";
import { redirect } from "next/navigation";
import { updatePersonalInformationAction } from "@/app/profile/personal-information/actions";
import SignedImageUploadField from "@/components/SignedImageUploadField";
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.95))]" />
      <div className="relative mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <Link href="/profile" className="text-sm font-semibold text-[#17dccb]">
          Back
        </Link>
        <div className="mt-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-6">
          <p className="font-mono text-3xl font-semibold text-white">Personal Information</p>
          <p className="mt-4 text-sm leading-6 text-white/65">
            These details are tied to your global player identity, so they follow your account across every club.
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
              <span className="mb-2 block text-sm text-white/70">Full Name</span>
              <input
                name="full_name"
                type="text"
                defaultValue={fullName}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Email</span>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white/60 outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Gender</span>
                <select
                  name="gender"
                  defaultValue={player?.gender ?? ""}
                  className="w-full rounded-2xl border border-white/12 bg-[#0e1b2a] px-4 py-3 text-base text-white outline-none"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-white/70">Handedness</span>
                <select
                  name="handedness"
                  defaultValue={player?.handedness ?? ""}
                  className="w-full rounded-2xl border border-white/12 bg-[#0e1b2a] px-4 py-3 text-base text-white outline-none"
                >
                  <option value="">Not set</option>
                  <option value="right">Right-handed</option>
                  <option value="left">Left-handed</option>
                  <option value="ambidextrous">Both</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-white/70">Birthday</span>
              <input
                name="birth_date"
                type="date"
                defaultValue={player?.birth_date ?? ""}
                className="w-full rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-base text-white outline-none"
              />
            </label>

            <button className="w-full rounded-[1.2rem] bg-gradient-to-r from-[#4ad6b7] to-[#3cc7d8] px-5 py-4 text-lg font-semibold text-[#062232] shadow-[0_16px_34px_rgba(18,216,201,0.28)]">
              Save Personal Information
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
