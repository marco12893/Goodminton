import { redirect } from "next/navigation";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PrivacyPolicyPage() {
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(24,206,195,0.16),transparent_28%),linear-gradient(180deg,_rgba(4,18,31,0.55),rgba(4,18,31,0.96))]" />

        <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-6 py-8">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between">
              <div className="pt-1">
                <BackNavIcon href="/profile" />
              </div>
              <div className="flex-1 px-4 text-center">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                  Privacy Policy
                </h1> 
              </div>
              <div className="w-8" />
            </div>

            <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Data We Collect
                </h2>
                <p>
                  We collect the details you provide when creating an account or participating in club activity,
                  such as your name, email address, profile photo, club memberships, match submissions, and related
                  performance metrics.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Why We Collect It
                </h2>
                <p>
                  This data powers identity verification, club management, matchmaking, ranking calculations,
                  and personalized experiences across the Goodminton platform.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  How It&apos;s Used
                </h2>
                <p>
                  We use your data to authenticate access, display player and club information, calculate
                  rankings, notify you of relevant updates, and improve app performance and reliability.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Data Retention
                </h2>
                <p>
                  We retain account and match history data for as long as your account remains active or as needed
                  to provide services. You can request deletion, and we will remove or anonymize data unless we are
                  legally required to keep it.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Data Sharing
                </h2>
                <p>
                  We may use third-party services (such as hosting, authentication, and database providers) to operate the platform. These providers may process your data on our behalf.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Security
                </h2>
                <p>
                  We take reasonable steps to protect your data, but we cannot guarantee absolute security.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Changes
                </h2>
                <p>
                  We may update this policy from time to time. Continued use of the service means you accept the updated policy.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </FullscreenNavProvider>
  );
}
