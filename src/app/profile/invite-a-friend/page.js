import Link from "next/link";
import { redirect } from "next/navigation";
import InviteFriendShareCard from "@/components/InviteFriendShareCard";
import BackIcon from "@/components/BackIcon";
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
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
        {/* Header Section for Back Button */}
        <div className="mb-6 pt-1">
          <BackIcon href="/profile" />
        </div>
        
        {/* Render the Share Card Component */}
        <div className="flex-1">
          <InviteFriendShareCard />
        </div>
      </div>
    </main>
  );
}