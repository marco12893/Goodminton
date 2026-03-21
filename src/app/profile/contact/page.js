import { redirect } from "next/navigation";
import BackNavIcon from "@/components/BackNavIcon";
import { FullscreenNavProvider } from "@/components/FullscreenNavOverlay";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
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
                  Contact Us
                </h1>
              </div>
              <div className="w-8" />
            </div>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
              <p>
                For support, feedback, or account questions, email us directly and we&apos;ll get back to you as
                soon as possible.
              </p>
              <a
                href="mailto:goodminton.app.id@gmail.com"
                className="block rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-center text-sm font-bold text-teal-200 transition-all hover:bg-teal-500/20"
              >
                goodminton.app.id@gmail.com
              </a>
              <p className="text-xs text-slate-400">
                We currently handle support manually. Please include your account email and club details if
                relevant.
              </p>
            </div>
          </div>
        </div>
      </main>
    </FullscreenNavProvider>
  );
}
