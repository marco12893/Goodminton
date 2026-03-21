import { redirect } from "next/navigation";
import { createClubAction } from "@/app/clubs/new/actions";
import SignedImageUploadField from "@/components/SignedImageUploadField";
import PendingButton from "@/components/PendingButton";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function ErrorMessage({ value }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 backdrop-blur-sm">
      {value}
    </div>
  );
}

export default async function NewClubPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;

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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          
          {/* Header section with Back Button */}
          <div className="flex items-start justify-between">
            <div className="pt-1">
              <BackNavIcon href="/" />
            </div>
            <div className="flex-1 px-4 text-center">
              <p className="font-mono text-lg font-bold tracking-tight text-teal-400">
                GoodMinton
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-white">
                Create New Club
              </h1>
            </div>
            {/* Empty div to balance the flex layout against the BackIcon */}
            <div className="w-8" /> 
          </div>

          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            Create a new club and you will automatically become its owner and first member.
          </p>

          <div className="mt-6 empty:hidden">
            <ErrorMessage value={error} />
          </div>

          <form action={createClubAction} className="mt-6 space-y-5">
            <SignedImageUploadField
              label="Club icon"
              folder="clubs-temp"
              objectId={user.id}
              initialUrl=""
              initialPath=""
              initialsLabel="Club"
              urlInputName="image_url"
              pathInputName="image_storage_path"
              currentUrlInputName="current_image_url"
              currentPathInputName="current_image_storage_path"
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Club name</span>
              <input
                name="name"
                type="text"
                placeholder="PB Goodminton Surabaya"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Location</span>
              <input
                name="location"
                type="text"
                placeholder="GOR Satria"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Playing schedule</span>
              <input
                name="play_schedule"
                type="text"
                placeholder="Every Friday, 7:00 PM - 9:00 PM"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Description</span>
              <textarea
                name="description"
                rows="4"
                placeholder="A badminton community for sparring and regular training."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">Join mode</span>
              <select
                name="join_mode"
                defaultValue="invite_only"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-base text-white outline-none transition-all focus:border-teal-400 focus:bg-white/10 focus:ring-1 focus:ring-teal-400"
                style={{ colorScheme: "dark" }}
              >
                <option value="invite_only" className="bg-slate-900 text-white">Invite only</option>
                <option value="approval" className="bg-slate-900 text-white">Approval required</option>
                <option value="open" className="bg-slate-900 text-white">Open join</option>
              </select>
            </label>

            <PendingButton
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-3.5 text-base font-bold text-slate-900 shadow-lg transition-all hover:opacity-90 hover:shadow-cyan-500/25 active:scale-[0.98]"
              pendingLabel="Creating..."
            >
              Create Club
            </PendingButton>
          </form>

        </div>
      </div>
    </main>
    </FullscreenNavProvider>
  );
}
