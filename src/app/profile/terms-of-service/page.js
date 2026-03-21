import { redirect } from "next/navigation";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TermsOfServicePage() {
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
                  Terms of Service
                </h1>
              </div>
              <div className="w-8" />
            </div>

            <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-300">
              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Acceptable Use
                </h2>
                <p>
                  You agree to use Goodminton responsibly and not misuse the platform, attempt unauthorized access, or disrupt other users.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  User Content
                </h2>
                <p>
                  You are responsible for the accuracy of match data and content you submit. You grant us permission to display this data within the platform.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Account Responsibility
                </h2>
                <p>
                  You are responsible for maintaining the security of your account.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Termination
                </h2>
                <p>
                  We may suspend or terminate accounts that violate these terms or harm the platform or community.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Service Availability
                </h2>
                <p>
                  The service is provided "as is" without guarantees of uptime or error-free operation.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Limitation of Liability
                </h2>
                <p>
                  Goodminton is not responsible for indirect damages, data loss, or disputes between users or clubs.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Changes to Terms
                </h2>
                <p>
                  We may update these terms at any time. Continued use of the service indicates acceptance of the updated terms.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">
                  Governing Law
                </h2>
                <p>
                  These terms are governed by the laws of Indonesia.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </FullscreenNavProvider>
  );
}
