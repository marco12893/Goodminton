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
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.15),transparent_35%),linear-gradient(180deg,_rgba(2,6,23,0.6),rgba(2,6,23,0.95))]" />

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