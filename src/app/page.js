export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">
          Goodminton
        </p>
        <h1 className="text-4xl font-bold leading-tight">
          App sudah siap dibuka dari Home Screen HP.
        </h1>
        <p className="text-slate-300">
          Jika belum terpasang, buka menu browser lalu pilih Add to Home Screen
          atau Install App.
        </p>
        <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
          <p className="text-sm text-slate-300">Status</p>
          <p className="mt-1 text-lg font-semibold text-emerald-400">
            Online dan siap deploy di Vercel
          </p>
        </div>
      </main>
    </div>
  );
}
