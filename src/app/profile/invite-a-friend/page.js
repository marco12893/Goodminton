import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InviteFriendPage() {
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
        <Link href="/profile" className="text-sm font-semibold text-[#17dccb]">
          Back
        </Link>
        <div className="mt-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,20,32,0.94),rgba(5,12,22,0.96))] px-5 py-6">
          <p className="font-mono text-3xl font-semibold text-white">Invite a Friend</p>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Referral and invite tools will live on this page in a later iteration.
          </p>
        </div>
      </div>
    </main>
  );
}
