import { badRequest, json, notFound, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { optionalDate, optionalString } from "@/lib/validators";

export async function GET(_, { params }) {
  const { clubPlayerId } = await params;
  const { data, error } = await supabaseAdmin
    .from("club_players")
    .select(
      `
        *,
        player:players (*)
      `
    )
    .eq("id", clubPlayerId)
    .maybeSingle();

  if (error) {
    return serverError("Gagal mengambil detail pemain klub.", error.message);
  }

  if (!data) {
    return notFound("Pemain klub tidak ditemukan.");
  }

  return json({ data });
}

export async function PATCH(request, { params }) {
  try {
    const { clubPlayerId } = await params;
    const body = await request.json();

    const current = await supabaseAdmin
      .from("club_players")
      .select("id, player_id")
      .eq("id", clubPlayerId)
      .maybeSingle();

    if (current.error) {
      return serverError(
        "Gagal membaca pemain klub yang akan diupdate.",
        current.error.message
      );
    }

    if (!current.data) {
      return notFound("Pemain klub tidak ditemukan.");
    }

    const clubPlayerPayload = {};
    if ("joined_at" in body) {
      clubPlayerPayload.joined_at = optionalDate(body.joined_at, "joined_at");
    }
    if ("jersey_number" in body) {
      clubPlayerPayload.jersey_number = optionalString(body.jersey_number);
    }
    if ("status" in body) {
      clubPlayerPayload.status = optionalString(body.status);
    }
    if ("elo_initial" in body) {
      clubPlayerPayload.elo_initial = body.elo_initial;
    }
    if ("elo_current" in body) {
      clubPlayerPayload.elo_current = body.elo_current;
    }

    const playerPayload = {};
    if ("full_name" in body) playerPayload.full_name = optionalString(body.full_name);
    if ("gender" in body) playerPayload.gender = optionalString(body.gender);
    if ("birth_date" in body) {
      playerPayload.birth_date = optionalDate(body.birth_date, "birth_date");
    }
    if ("handedness" in body) {
      playerPayload.handedness = optionalString(body.handedness);
    }
    if ("avatar_url" in body) {
      playerPayload.avatar_url = optionalString(body.avatar_url);
    }

    if (Object.keys(playerPayload).length > 0) {
      const playerUpdate = await supabaseAdmin
        .from("players")
        .update(playerPayload)
        .eq("id", current.data.player_id);

      if (playerUpdate.error) {
        return serverError("Gagal mengupdate profile player.", playerUpdate.error.message);
      }
    }

    if (Object.keys(clubPlayerPayload).length > 0) {
      const clubPlayerUpdate = await supabaseAdmin
        .from("club_players")
        .update(clubPlayerPayload)
        .eq("id", clubPlayerId);

      if (clubPlayerUpdate.error) {
        return serverError(
          "Gagal mengupdate data player di klub.",
          clubPlayerUpdate.error.message
        );
      }
    }

    const refreshed = await supabaseAdmin
      .from("club_players")
      .select(
        `
          *,
          player:players (*)
        `
      )
      .eq("id", clubPlayerId)
      .maybeSingle();

    if (refreshed.error) {
      return serverError("Gagal mengambil data terbaru pemain klub.", refreshed.error.message);
    }

    return json({ data: refreshed.data });
  } catch (error) {
    return badRequest(error.message);
  }
}

export async function DELETE(_, { params }) {
  const { clubPlayerId } = await params;
  const current = await supabaseAdmin
    .from("club_players")
    .select("id")
    .eq("id", clubPlayerId)
    .maybeSingle();

  if (current.error) {
    return serverError("Gagal membaca pemain klub.", current.error.message);
  }

  if (!current.data) {
    return notFound("Pemain klub tidak ditemukan.");
  }

  const { error } = await supabaseAdmin
    .from("club_players")
    .delete()
    .eq("id", clubPlayerId);

  if (error) {
    return serverError("Gagal menghapus pemain klub.", error.message);
  }

  return json({ success: true });
}
