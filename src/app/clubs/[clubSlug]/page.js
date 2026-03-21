import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClubPageData } from "@/lib/clubPageData";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

export const dynamic = "force-dynamic";

const getLeaderboard = cache(async (clubId) => {
  const { data: leaderboard, error } = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        elo_current,
        total_matches,
        total_wins,
        player:players (
          full_name,
          user_id
        )
      `
    )
    .eq("club_id", clubId)
    .eq("status", "active")
    .order("elo_current", { ascending: false })
    .order("total_wins", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const userIds = (leaderboard ?? []).map((row) => row.player?.user_id).filter(Boolean);
  const { data: memberships, error: membershipError } = userIds.length
    ? await supabaseAdmin
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", clubId)
        .in("user_id", userIds)
    : { data: [], error: null };

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const roleMap = new Map((memberships ?? []).map((item) => [item.user_id, item.role]));
  const filtered = (leaderboard ?? []).filter((row) => {
    const role = row.player?.user_id ? roleMap.get(row.player.user_id) : null;
    return role !== "spectator";
  });

  return filtered;
});

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PodiumCard({ entry, rank, variant }) {
  // Palet warna khusus untuk setiap rank di podium
  const theme = {
    gold: {
      border: "border-yellow-400/50",
      bgBase: "bg-gradient-to-t from-yellow-500/30 via-yellow-500/10 to-transparent",
      avatarBg: "from-yellow-400 to-amber-600",
      text: "text-yellow-400",
      height: "h-56",
    },
    silver: {
      border: "border-slate-300/50",
      bgBase: "bg-gradient-to-t from-slate-400/30 via-slate-400/10 to-transparent",
      avatarBg: "from-slate-200 to-slate-400",
      text: "text-slate-300",
      height: "h-48",
    },
    bronze: {
      border: "border-amber-600/50",
      bgBase: "bg-gradient-to-t from-amber-700/30 via-amber-700/10 to-transparent",
      avatarBg: "from-amber-500 to-amber-700",
      text: "text-amber-500",
      height: "h-40",
    },
  }[variant];

  return (
    <Link
      href={`/clubs/${entry.clubSlug}/players/${entry.id}`}
      className="group flex h-full flex-col items-center justify-end"
    >
      {/* Avatar yang menimpa pilar (overlap) */}
      <div className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${theme.avatarBg} text-2xl font-bold text-slate-900 shadow-xl ring-4 ring-slate-950 transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110`}>
        {getInitials(entry.fullName)}
        
        {/* Badge Angka Rank */}
        <div className={`absolute -bottom-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-black shadow-lg ring-2 ring-slate-950 ${theme.text}`}>
          {rank}
        </div>
      </div>

      {/* Pilar Podium */}
      <div className={`-mt-10 flex w-full flex-col items-center justify-end rounded-t-3xl border-x border-t ${theme.border} ${theme.bgBase} ${theme.height} px-2 pb-5 pt-12 transition-all duration-300 group-hover:brightness-125`}>
        <p className="w-full truncate text-center text-sm font-bold text-white drop-shadow-md">
          {entry.fullName}
        </p>
        <p className={`mt-1 font-mono text-xl font-black drop-shadow-md ${theme.text}`}>
          {entry.elo}
        </p>
      </div>
    </Link>
  );
}

function RankRow({ entry, rank }) {
  return (
    <Link
      href={`/clubs/${entry.clubSlug}/players/${entry.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-4 transition-all hover:-translate-y-1 hover:border-teal-400/30 hover:bg-white/10 hover:shadow-lg hover:shadow-teal-500/10"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-lg font-bold text-slate-400 transition-colors group-hover:bg-teal-400/20 group-hover:text-teal-400">
        {rank}
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-white transition-colors group-hover:text-teal-300">
          {entry.fullName}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-400">
          {entry.totalMatches} matches · {entry.winRate}% win rate
        </p>
      </div>
      
      <div className="flex shrink-0 flex-col items-end">
        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">
          Elo
        </p>
        <p className="font-mono text-xl font-bold text-teal-400">
          {entry.elo}
        </p>
      </div>
    </Link>
  );
}

export default async function ClubHomePage({ params, searchParams }) {
  const { clubSlug } = await params;
  await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const club = await getClubPageData(user.id, clubSlug, cookieStore);

  if (!club) {
    notFound();
  }

  const leaderboard = await getLeaderboard(club.id);

  const entries = (leaderboard ?? []).map((row) => {
    const totalMatches = row.total_matches ?? 0;
    const totalWins = row.total_wins ?? 0;

    return {
      id: row.id,
      clubSlug,
      fullName: row.player?.full_name ?? "Unknown player",
      elo: row.elo_current ?? 1000,
      totalMatches,
      totalWins,
      winRate: totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : "0.0",
    };
  });

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);
  const podiumCenter = topThree[0] ?? null;
  const podiumLeft = topThree[1] ?? null;
  const podiumRight = topThree[2] ?? null;

  return (
    <section className="mx-auto w-full max-w-md pb-10">
      
      {/* Clean Header Tanpa Box Border yang Berat */}
      <div className="mb-8 px-2 text-center">
        <h2 className="font-mono text-3xl font-bold tracking-tight text-white">
          Leaderboard
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Live rankings based on each player&apos;s current Elo inside <span className="font-semibold text-teal-400">{club.name}</span>.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 px-5 py-12 text-center text-sm font-medium text-slate-400 backdrop-blur-sm">
          No active players have joined this club yet.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Podium Section */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 px-4 pt-10 backdrop-blur-xl">
            <div className="grid grid-cols-3 items-end gap-2 px-1">
              <div>{podiumLeft && <PodiumCard entry={podiumLeft} rank={2} variant="silver" />}</div>
              <div>{podiumCenter && <PodiumCard entry={podiumCenter} rank={1} variant="gold" />}</div>
              <div>{podiumRight && <PodiumCard entry={podiumRight} rank={3} variant="bronze" />}</div>
            </div>
          </div>

          {/* Remaining Players List */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            {remaining.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-8 text-center text-sm font-medium text-slate-400">
                The podium currently includes every active player in this club.
              </div>
            ) : (
              <div className="space-y-3">
                {remaining.map((entry, index) => (
                  <RankRow key={entry.id} entry={entry} rank={index + 4} />
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}
    </section>
  );
}
