const rankingRows = [
  { name: "Raka Pratama", elo: 1684, winRate: "72%", matches: 48, trend: "WWLWW" },
  { name: "Dimas Arta", elo: 1641, winRate: "69%", matches: 42, trend: "WLWWW" },
  { name: "Fikri Mahesa", elo: 1598, winRate: "63%", matches: 54, trend: "LWWLW" },
];

const featureCards = [
  {
    title: "Elo Individu per Klub",
    body: "Setiap pemain punya rating terpisah di tiap klub, jadi multi-club membership tidak mencampur performa.",
  },
  {
    title: "Match Log Doubles",
    body: "Input skor pasangan, simpan partisipan, lalu sistem menghitung perubahan rating ke masing-masing individu.",
  },
  {
    title: "Profil Statistik Lengkap",
    body: "Win rate, streak, points scored, peak rating, histori match, sampai grafik karier ditampilkan per pemain.",
  },
  {
    title: "Kontrol Akses Klub",
    body: "Admin klub bisa input dan edit data. Player hanya melihat leaderboard, profil, dan dashboard statistik.",
  },
];

const pillars = [
  "Clubs sebagai boundary data utama",
  "Players sebagai identitas global lintas klub",
  "club_players untuk statistik dan elo per klub",
  "matches plus match_participants untuk log pertandingan doubles",
  "elo_history untuk histori rating dan grafik karier",
  "RLS Supabase untuk isolasi data antar klub",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <section className="glass-panel court-grid overflow-hidden rounded-[2rem]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                  Goodminton
                </div>
                <div className="rounded-full border border-[var(--line)] bg-white/65 px-3 py-1 text-xs text-[var(--muted)]">
                  Statistik PB Clubs
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  Platform statistik badminton untuk leaderboard, elo, dan
                  profil pemain per klub.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Dibangun untuk pengurus klub yang ingin mencatat match log
                  doubles, menghitung elo individu otomatis, dan menjaga data
                  pemain tetap terpisah antar klub.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-[var(--surface-strong)] p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Mode
                  </p>
                  <p className="mt-2 text-2xl font-semibold">Realtime Club</p>
                </div>
                <div className="rounded-3xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Rating
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    Elo Individu
                  </p>
                </div>
                <div className="rounded-3xl bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Akses
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    Admin / Player
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[1.75rem] bg-[var(--surface-strong)] p-4 text-white shadow-2xl shadow-slate-950/15 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/55">
                    Club Snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    PB Rajawali Utama
                  </h2>
                </div>
                <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm text-emerald-300">
                  Live
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-white/55">Pemain aktif</p>
                  <p className="mt-2 text-3xl font-semibold">36</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-white/55">Match bulan ini</p>
                  <p className="mt-2 text-3xl font-semibold">124</p>
                </div>
                <div className="rounded-2xl bg-white/8 p-4">
                  <p className="text-sm text-white/55">Kenaikan elo tertinggi</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-300">
                    +43
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/55">Leaderboard</p>
                    <p className="text-lg font-semibold">Urut berdasarkan elo</p>
                  </div>
                  <div className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/70">
                    Search + sort
                  </div>
                </div>

                <div className="space-y-3">
                  {rankingRows.map((player, index) => (
                    <div
                      key={player.name}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-white/8 px-3 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-sm text-white/55">
                          WR {player.winRate} - {player.matches} match -{" "}
                          {player.trend}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                          Elo
                        </p>
                        <p className="text-xl font-semibold text-amber-300">
                          {player.elo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
              Konsep Produk
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950">
              Semua statistik menempel ke individu, bukan ke pasangan.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
              Walaupun format pertandingan adalah doubles, sistem menyimpan
              kontribusi pertandingan pada masing-masing pemain di klub yang
              sedang dipilih. Itu yang membuat elo, profile, dan leaderboard
              tetap konsisten.
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-white/80 p-5">
              <p className="font-medium text-slate-950">Fondasi data</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--muted)]">
                {pillars.map((pillar) => (
                  <li
                    key={pillar}
                    className="rounded-2xl border border-[var(--line)] px-4 py-3"
                  >
                    {pillar}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featureCards.map((feature) => (
              <article
                key={feature.title}
                className="glass-panel rounded-[2rem] p-6 sm:p-7"
              >
                <div className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950">
                  Module
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {feature.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">
                Statistik Pemain
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                Profil pemain memusatkan performa, histori match, dan tren elo.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
                Data seperti win rate, points scored, streak, peak rating, dan
                recent form bisa dihitung dari query SQL tanpa harus menyimpan
                semuanya sebagai kolom permanen.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-white/80 p-5">
                <p className="text-sm text-[var(--muted)]">Recent form</p>
                <p className="mt-3 font-mono text-2xl tracking-[0.3em] text-slate-950">
                  W W L W W
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Deret hasil terbaru untuk mendeteksi momentum dan evaluasi
                  performa.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-white">
                <p className="text-sm text-white/60">Peak rating</p>
                <p className="mt-3 text-4xl font-semibold text-amber-300">
                  1712
                </p>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Diambil dari histori elo per pemain untuk membangun grafik
                  karier dan milestone.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-950">
                    Scope implementasi awal
                  </p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Ready for Supabase
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  Migration awal menyiapkan schema relasional, helper function
                  untuk cek membership, serta view dasar leaderboard agar
                  frontend berikutnya bisa fokus ke auth, input match, dan query
                  statistik.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
