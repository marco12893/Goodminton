import { badRequest, json, parseInteger, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureRequiredString,
  optionalDate,
  optionalString,
} from "@/lib/validators";
import { unstable_cache } from "next/cache";

// Cached function for fetching club players
const getCachedClubPlayers = unstable_cache(
  async (clubId, search, limit) => {
    let query = supabaseAdmin
      .from("club_players")
      .select(
        `
          *,
          player:players (
            id,
            full_name,
            gender,
            birth_date,
            handedness,
            avatar_url
          )
        `
      )
      .eq("club_id", clubId)
      .order("elo_current", { ascending: false })
      .limit(limit);

    if (search) {
      query = query.ilike("players.full_name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
  ['club-players'],
  {
    revalidate: 300, // 5 minutes
    tags: ['club-players']
  }
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId");
  const search = searchParams.get("search");
  const limit = parseInteger(searchParams.get("limit"), 50);

  if (!clubId) {
    return badRequest("Parameter clubId wajib diisi.");
  }

  try {
    const data = await getCachedClubPlayers(clubId, search, limit);
    return json({ data });
  } catch (error) {
    return serverError("Gagal mengambil pemain klub.", error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const playerPayload = {
      full_name: ensureRequiredString(body.full_name, "full_name"),
      gender: optionalString(body.gender),
      birth_date: optionalDate(body.birth_date, "birth_date"),
      handedness: optionalString(body.handedness),
      avatar_url: optionalString(body.avatar_url),
    };

    const clubPlayerPayload = {
      club_id: ensureRequiredString(body.club_id, "club_id"),
      joined_at: optionalDate(body.joined_at, "joined_at"),
      jersey_number: optionalString(body.jersey_number),
      status: optionalString(body.status) ?? "active",
      elo_initial: body.elo_initial ?? 1000,
      elo_current: body.elo_current ?? body.elo_initial ?? 1000,
    };

    const playerInsert = await supabaseAdmin
      .from("players")
      .insert(playerPayload)
      .select()
      .single();

    if (playerInsert.error) {
      return serverError("Gagal membuat player.", playerInsert.error.message);
    }

    const clubPlayerInsert = await supabaseAdmin
      .from("club_players")
      .insert({
        ...clubPlayerPayload,
        player_id: playerInsert.data.id,
      })
      .select(
        `
          *,
          player:players (*)
        `
      )
      .single();

    if (clubPlayerInsert.error) {
      await supabaseAdmin.from("players").delete().eq("id", playerInsert.data.id);
      return serverError(
        "Gagal mendaftarkan player ke klub.",
        clubPlayerInsert.error.message
      );
    }

    // Invalidate cache after successful creation
    const { revalidateTag } = await import('next/cache');
    revalidateTag('club-players');
    revalidateTag('club-leaderboard');

    return json({ data: clubPlayerInsert.data }, { status: 201 });
  } catch (error) {
    return badRequest(error.message);
  }
}
