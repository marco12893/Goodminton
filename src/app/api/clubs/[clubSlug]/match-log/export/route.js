import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClubBySlug } from "@/lib/clubJoin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 1000;

function csvEscape(value) {
  if (value == null) return "";
  const raw = String(value);
  if (raw.includes('"') || raw.includes(",") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function normalizeTeam(participants, teamId) {
  return (participants ?? [])
    .filter((row) => row.team === teamId)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
    .map((row) => ({
      name: row.club_player?.player?.full_name ?? "",
      eloDelta: row.elo_delta ?? 0,
    }))
    .filter((row) => row.name);
}

export async function GET(request, { params }) {
  const { clubSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const club = await getClubBySlug(clubSlug);

  if (!club) {
    return new Response("Club not found", { status: 404 });
  }

  const membershipCheck = await supabaseAdmin
    .from("club_members")
    .select("id")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipCheck.error) {
    return new Response(membershipCheck.error.message, { status: 500 });
  }

  if (!membershipCheck.data) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  let page = 0;
  const allMatches = [];

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseAdmin
      .from("matches")
      .select(
        `
          id,
          match_date,
          played_at,
          status,
          team1_score,
          team2_score,
          winning_team,
          notes,
          participants:match_participants (
            team,
            slot,
            elo_delta,
            club_player:club_players (
              id,
              player:players (
                full_name
              )
            )
          )
        `
      )
      .eq("club_id", club.id)
      .order("played_at", { ascending: false })
      .range(from, to);

    if (dateFrom) query = query.gte("match_date", dateFrom);
    if (dateTo) query = query.lte("match_date", dateTo);

    const { data, error } = await query;

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    if (!data?.length) {
      break;
    }

    allMatches.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  const rows = [
    [
      "match_id",
      "match_date",
      "played_at",
      "status",
      "team1_score",
      "team2_score",
      "winning_team",
      "team1_players",
      "team2_players",
      "team1_elo_delta",
      "team2_elo_delta",
      "notes",
    ],
  ];

  for (const match of allMatches) {
    const team1 = normalizeTeam(match.participants, 1);
    const team2 = normalizeTeam(match.participants, 2);
    rows.push([
      match.id,
      match.match_date,
      match.played_at,
      match.status,
      match.team1_score,
      match.team2_score,
      match.winning_team,
      team1.map((p) => p.name).join(" / "),
      team2.map((p) => p.name).join(" / "),
      team1.map((p) => p.eloDelta).join(" / "),
      team2.map((p) => p.eloDelta).join(" / "),
      match.notes ?? "",
    ]);
  }

  const csv = buildCsv(rows);
  const fileName = `match-log-${club.slug}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
