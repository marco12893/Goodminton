import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getPodiumNameClass(name) {
  if (name.length > 22) {
    return "text-[0.95rem] sm:text-[1.05rem]";
  }

  if (name.length > 16) {
    return "text-[1.05rem] sm:text-[1.18rem]";
  }

  return "text-[1.15rem] sm:text-[1.35rem]";
}

function PodiumCard({ entry, rank, variant }) {
  const frameStyles =
    variant === "gold"
      ? "border-[#f4dd56]/70 bg-gradient-to-b from-[#ffd400] via-[#ffc62a] to-[#ff9d1c] text-[#161105]"
      : variant === "silver"
        ? "border-slate-200/80 bg-gradient-to-b from-[#eef2f6] to-[#c9d0d8] text-[#11151a]"
        : "border-[#d0a991]/70 bg-gradient-to-b from-[#b98e7e] to-[#8f6b60] text-[#1a110f]";

  const avatarRing =
    variant === "gold"
      ? "border-[#f4dd56]"
      : variant === "silver"
        ? "border-slate-100"
        : "border-[#d0a991]";

  const avatarFill =
    variant === "gold"
      ? "from-[#352705] to-[#0f2236]"
      : variant === "silver"
        ? "from-[#304154] to-[#0f2236]"
        : "from-[#5a342d] to-[#0f2236]";

  const pillarHeight =
    variant === "gold" ? "h-[20rem]" : variant === "silver" ? "h-[17.5rem]" : "h-[16rem]";

  return (
    <div className={`flex flex-col items-center ${variant === "gold" ? "pt-0" : "pt-8"}`}>
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-full border-[3px] bg-gradient-to-br ${avatarFill} text-2xl font-semibold text-white shadow-[0_18px_40px_rgba(2,14,28,0.35)] ${avatarRing}`}
      >
        {getInitials(entry.fullName)}
      </div>
      <div
        className={`mt-5 relative w-full max-w-[10rem] flex-col rounded-t-[1.75rem] border px-4 pb-8 pt-7 shadow-[0_22px_50px_rgba(2,14,28,0.3)] ${pillarHeight} ${frameStyles}`}
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] opacity-65">
          #{rank}
        </p>
        <div className="mt-4 flex min-h-[7.5rem] items-center justify-center">
          <p
            className={`break-words text-balance text-center font-semibold leading-[1.12] ${getPodiumNameClass(entry.fullName)}`}
          >
            {entry.fullName}
          </p>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-lg font-semibold">Elo {entry.elo}</p>
      </div>
    </div>
  );
}

function RankRow({ entry, rank }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.7rem] border border-white/12 bg-gradient-to-r from-[#14d4c6] to-[#1bc1df] px-5 py-5 text-[#072233] shadow-[0_18px_40px_rgba(6,28,38,0.28)]">
      <div className="min-w-0">
        <p className="truncate text-xl font-semibold">
          {rank}. {entry.fullName}
        </p>
        <p className="mt-1 text-sm font-medium text-[#072233]/75">
          {entry.totalMatches} matches · {entry.winRate}% win rate
        </p>
      </div>
      <p className="shrink-0 text-[2rem] font-semibold tracking-tight">{entry.elo}</p>
    </div>
  );
}

export default async function ClubHomePage({ params }) {
  const { clubSlug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const club = await getClubPageData(supabase, user, clubSlug);

  if (!club) {
    notFound();
  }

  const { data: leaderboard, error } = await supabase
    .from("club_players")
    .select(
      `
        id,
        elo_current,
        total_matches,
        total_wins,
        player:players (
          full_name
        )
      `
    )
    .eq("club_id", club.id)
    .eq("status", "active")
    .order("elo_current", { ascending: false })
    .order("total_wins", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const entries = (leaderboard ?? [])
    .map((row) => {
      const totalMatches = row.total_matches ?? 0;
      const totalWins = row.total_wins ?? 0;

      return {
        id: row.id,
        fullName: row.player?.full_name ?? "Unknown player",
        elo: row.elo_current ?? 1000,
        totalMatches,
        totalWins,
        winRate:
          totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : "0.0",
      };
    });

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);
  const podiumCenter = topThree[0] ?? null;
  const podiumLeft = topThree[1] ?? null;
  const podiumRight = topThree[2] ?? null;

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(67,74,97,0.82),rgba(28,37,57,0.78))] px-5 py-5 shadow-[0_24px_60px_rgba(3,12,22,0.35)] backdrop-blur-xl">
        <p className="text-center font-mono text-[2rem] font-semibold text-white underline decoration-white/55 underline-offset-[7px]">
          Club Leaderboard
        </p>
        <p className="mt-3 text-center text-sm leading-6 text-white/65">
          Live rankings based on each player&apos;s current Elo inside {club.name}.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/6 px-5 py-10 text-center text-white/70">
          No active players have joined this club yet.
        </div>
      ) : (
        <>
          <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.94),rgba(4,11,20,0.98))] px-4 pb-7 pt-8 shadow-[0_26px_70px_rgba(3,12,22,0.35)] backdrop-blur-xl">
            <div className="grid grid-cols-3 items-end gap-3">
              <div>{podiumLeft ? <PodiumCard entry={podiumLeft} rank={2} variant="silver" /> : null}</div>
              <div>{podiumCenter ? <PodiumCard entry={podiumCenter} rank={1} variant="gold" /> : null}</div>
              <div>{podiumRight ? <PodiumCard entry={podiumRight} rank={3} variant="bronze" /> : null}</div>
            </div>
          </div>

          <div className="rounded-[2.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(66,74,98,0.58),rgba(47,57,78,0.55))] px-4 pb-5 pt-4 shadow-[0_22px_50px_rgba(3,12,22,0.26)] backdrop-blur-xl">
            <div className="mx-auto h-1.5 w-24 rounded-full bg-white/65" />

            <div className="mt-5 space-y-4">
              {remaining.length === 0 ? (
                <div className="rounded-[1.7rem] border border-white/10 bg-white/6 px-5 py-6 text-center text-white/70">
                  The podium currently includes every active player in this club.
                </div>
              ) : (
                remaining.map((entry, index) => (
                  <RankRow key={entry.id} entry={entry} rank={index + 4} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
