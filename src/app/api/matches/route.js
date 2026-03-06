import { badRequest, json, parseInteger, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureParticipantPayload,
  ensureRequiredString,
  ensureScore,
  optionalDate,
  optionalString,
} from "@/lib/validators";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId");
  const limit = parseInteger(searchParams.get("limit"), 50);

  if (!clubId) {
    return badRequest("Parameter clubId wajib diisi.");
  }

  const { data, error } = await supabaseAdmin
    .from("matches")
    .select(
      `
        *,
        participants:match_participants (
          *,
          club_player:club_players (
            id,
            player:players (
              id,
              full_name
            )
          )
        )
      `
    )
    .eq("club_id", clubId)
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) {
    return serverError("Gagal mengambil data match.", error.message);
  }

  return json({ data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = {
      club_id: ensureRequiredString(body.club_id, "club_id"),
      match_date: optionalDate(body.match_date, "match_date"),
      team1_score: ensureScore(body.team1_score, "team1_score"),
      team2_score: ensureScore(body.team2_score, "team2_score"),
      notes: optionalString(body.notes),
      created_by: optionalString(body.created_by),
    };

    if (payload.team1_score === payload.team2_score) {
      return badRequest("Skor tidak boleh seri.");
    }

    payload.match_date = payload.match_date ?? new Date().toISOString().slice(0, 10);

    const participants = ensureParticipantPayload(body.participants);

    const matchInsert = await supabaseAdmin
      .from("matches")
      .insert(payload)
      .select()
      .single();

    if (matchInsert.error) {
      return serverError("Gagal membuat match.", matchInsert.error.message);
    }

    const participantInsert = await supabaseAdmin
      .from("match_participants")
      .insert(
        participants.map((item) => ({
          ...item,
          match_id: matchInsert.data.id,
        }))
      );

    if (participantInsert.error) {
      await supabaseAdmin.from("matches").delete().eq("id", matchInsert.data.id);
      return serverError(
        "Gagal membuat participant match.",
        participantInsert.error.message
      );
    }

    const historyInsert = await supabaseAdmin.from("elo_history").insert(
      participants.map((item) => ({
        club_player_id: item.club_player_id,
        match_id: matchInsert.data.id,
        elo_before: item.elo_before,
        elo_after: item.elo_after,
        elo_delta: item.elo_delta,
      }))
    );

    if (historyInsert.error) {
      return serverError("Match tersimpan, tapi elo_history gagal dibuat.", historyInsert.error.message);
    }

    const { data, error } = await supabaseAdmin
      .from("matches")
      .select(
        `
          *,
          participants:match_participants (*)
        `
      )
      .eq("id", matchInsert.data.id)
      .single();

    if (error) {
      return serverError("Match tersimpan, tapi gagal mengambil hasil akhir.", error.message);
    }

    return json({ data }, { status: 201 });
  } catch (error) {
    return badRequest(error.message);
  }
}
