import { badRequest, json, notFound, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureParticipantPayload,
  ensureScore,
  optionalDate,
  optionalString,
} from "@/lib/validators";

export async function GET(_, { params }) {
  const { matchId } = await params;
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
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    return serverError("Gagal mengambil detail match.", error.message);
  }

  if (!data) {
    return notFound("Match tidak ditemukan.");
  }

  return json({ data });
}

export async function PATCH(request, { params }) {
  try {
    const { matchId } = await params;
    const body = await request.json();
    const payload = {};

    if ("match_date" in body) {
      payload.match_date = optionalDate(body.match_date, "match_date");
    }
    if ("team1_score" in body) {
      payload.team1_score = ensureScore(body.team1_score, "team1_score");
    }
    if ("team2_score" in body) {
      payload.team2_score = ensureScore(body.team2_score, "team2_score");
    }
    if ("notes" in body) {
      payload.notes = optionalString(body.notes);
    }

    if (
      payload.team1_score != null &&
      payload.team2_score != null &&
      payload.team1_score === payload.team2_score
    ) {
      return badRequest("Skor tidak boleh seri.");
    }

    if (Object.keys(payload).length > 0) {
      const matchUpdate = await supabaseAdmin
        .from("matches")
        .update(payload)
        .eq("id", matchId);

      if (matchUpdate.error) {
        return serverError("Gagal mengupdate match.", matchUpdate.error.message);
      }
    }

    if ("participants" in body) {
      const participants = ensureParticipantPayload(body.participants);

      const deleteParticipants = await supabaseAdmin
        .from("match_participants")
        .delete()
        .eq("match_id", matchId);

      if (deleteParticipants.error) {
        return serverError(
          "Gagal mereset participant match.",
          deleteParticipants.error.message
        );
      }

      const insertParticipants = await supabaseAdmin
        .from("match_participants")
        .insert(
          participants.map((item) => ({
            ...item,
            match_id: matchId,
          }))
        );

      if (insertParticipants.error) {
        return serverError(
          "Gagal mengisi participant match.",
          insertParticipants.error.message
        );
      }

      await supabaseAdmin.from("elo_history").delete().eq("match_id", matchId);
      await supabaseAdmin.from("elo_history").insert(
        participants.map((item) => ({
          club_player_id: item.club_player_id,
          match_id: matchId,
          elo_before: item.elo_before,
          elo_after: item.elo_after,
          elo_delta: item.elo_delta,
        }))
      );
    }

    const refreshed = await supabaseAdmin
      .from("matches")
      .select(
        `
          *,
          participants:match_participants (*)
        `
      )
      .eq("id", matchId)
      .maybeSingle();

    if (refreshed.error) {
      return serverError("Gagal mengambil match terbaru.", refreshed.error.message);
    }

    if (!refreshed.data) {
      return notFound("Match tidak ditemukan.");
    }

    return json({ data: refreshed.data });
  } catch (error) {
    return badRequest(error.message);
  }
}

export async function DELETE(_, { params }) {
  const { matchId } = await params;
  const { error, count } = await supabaseAdmin
    .from("matches")
    .delete({ count: "exact" })
    .eq("id", matchId);

  if (error) {
    return serverError("Gagal menghapus match.", error.message);
  }

  if (!count) {
    return notFound("Match tidak ditemukan.");
  }

  return json({ success: true });
}
