import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function deleteOrphanPlayer(playerId) {
  const remainingUsage = await supabaseAdmin
    .from("club_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId);

  if (!remainingUsage.error && remainingUsage.count === 0) {
    await supabaseAdmin.from("players").delete().eq("id", playerId).is("user_id", null);
  }
}

export async function getClubBySlug(clubSlug) {
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("id, slug, name, location, city, image_url, join_mode")
    .eq("slug", clubSlug)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

export async function ensureClubMember({ clubId, userId, role = "player" }) {
  const existingMembership = await supabaseAdmin
    .from("club_members")
    .select("id, role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .limit(1);

  if (existingMembership.error) {
    throw new Error(existingMembership.error.message);
  }

  if (!existingMembership.data?.length) {
    const membershipInsert = await supabaseAdmin.from("club_members").insert({
      club_id: clubId,
      user_id: userId,
      role,
    });

    if (membershipInsert.error) {
      throw new Error(membershipInsert.error.message);
    }
  }
}

export async function getOrCreateUserPlayer({ userId, preferredName }) {
  const existingPlayer = await supabaseAdmin
    .from("players")
    .select("id, full_name")
    .eq("user_id", userId)
    .limit(1);

  if (existingPlayer.error) {
    throw new Error(existingPlayer.error.message);
  }

  if (existingPlayer.data?.length) {
    const playerRow = existingPlayer.data[0];

    if (preferredName && preferredName !== playerRow.full_name) {
      const updateResult = await supabaseAdmin
        .from("players")
        .update({ full_name: preferredName })
        .eq("id", playerRow.id);

      if (updateResult.error) {
        throw new Error(updateResult.error.message);
      }
    }

    return {
      id: playerRow.id,
      fullName: preferredName || playerRow.full_name,
    };
  }

  const profile = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .limit(1);

  if (profile.error) {
    throw new Error(profile.error.message);
  }

  const fallbackName =
    preferredName ||
    profile.data?.[0]?.full_name ||
    profile.data?.[0]?.email?.split("@")[0] ||
    "Player";

  const playerInsert = await supabaseAdmin
    .from("players")
    .insert({
      user_id: userId,
      full_name: fallbackName,
    })
    .select("id, full_name")
    .single();

  if (playerInsert.error) {
    throw new Error(playerInsert.error.message);
  }

  return {
    id: playerInsert.data.id,
    fullName: playerInsert.data.full_name,
  };
}

export async function attachUserToClubPlayer({
  clubId,
  clubPlayerId,
  userId,
  preferredName,
}) {
  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select(
      `
        id,
        club_id,
        player_id,
        player:players (
          id,
          full_name,
          user_id
        )
      `
    )
    .eq("id", clubPlayerId)
    .eq("club_id", clubId)
    .limit(1);

  if (clubPlayerLookup.error) {
    throw new Error(clubPlayerLookup.error.message);
  }

  const clubPlayer = clubPlayerLookup.data?.[0] ?? null;

  if (!clubPlayer) {
    throw new Error("Club player was not found.");
  }

  const currentPlayer = clubPlayer.player;

  if (currentPlayer?.user_id && currentPlayer.user_id !== userId) {
    throw new Error("That player is already linked to another account.");
  }

  const userPlayer = await getOrCreateUserPlayer({
    userId,
    preferredName: preferredName || currentPlayer?.full_name,
  });

  if (userPlayer.id !== currentPlayer.id) {
    const duplicateClubPlayer = await supabaseAdmin
      .from("club_players")
      .select("id")
      .eq("club_id", clubId)
      .eq("player_id", userPlayer.id)
      .limit(1);

    if (duplicateClubPlayer.error) {
      throw new Error(duplicateClubPlayer.error.message);
    }

    if (duplicateClubPlayer.data?.length) {
      throw new Error("Your account is already linked to another player in this club.");
    }

    const clubPlayerUpdate = await supabaseAdmin
      .from("club_players")
      .update({ player_id: userPlayer.id })
      .eq("id", clubPlayerId);

    if (clubPlayerUpdate.error) {
      throw new Error(clubPlayerUpdate.error.message);
    }

    await deleteOrphanPlayer(currentPlayer.id);
  } else if (!currentPlayer?.user_id) {
    const playerUpdate = await supabaseAdmin
      .from("players")
      .update({
        user_id: userId,
        full_name: preferredName || currentPlayer.full_name,
      })
      .eq("id", currentPlayer.id);

    if (playerUpdate.error) {
      throw new Error(playerUpdate.error.message);
    }
  }

  await ensureClubMember({ clubId, userId });

  return userPlayer;
}

export async function addUserToClubWithNewPlayer({
  clubId,
  userId,
  preferredName,
}) {
  const userPlayer = await getOrCreateUserPlayer({
    userId,
    preferredName,
  });

  const clubPlayerLookup = await supabaseAdmin
    .from("club_players")
    .select("id")
    .eq("club_id", clubId)
    .eq("player_id", userPlayer.id)
    .limit(1);

  if (clubPlayerLookup.error) {
    throw new Error(clubPlayerLookup.error.message);
  }

  if (!clubPlayerLookup.data?.length) {
    const clubPlayerInsert = await supabaseAdmin.from("club_players").insert({
      club_id: clubId,
      player_id: userPlayer.id,
      joined_at: new Date().toISOString().slice(0, 10),
      status: "active",
    });

    if (clubPlayerInsert.error) {
      throw new Error(clubPlayerInsert.error.message);
    }
  }

  await ensureClubMember({ clubId, userId });

  return userPlayer;
}
