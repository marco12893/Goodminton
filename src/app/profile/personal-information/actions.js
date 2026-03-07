"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export async function updatePersonalInformationAction(formData) {
  const fullName = getString(formData, "full_name");
  const gender = getString(formData, "gender") || null;
  const birthDate = getString(formData, "birth_date") || null;
  const handedness = getString(formData, "handedness") || null;
  const avatarUrl = getString(formData, "avatar_url") || null;

  if (!fullName) {
    redirect("/profile/personal-information?error=Full name is required.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedMetadata = {
    ...(user.user_metadata ?? {}),
    full_name: fullName,
  };

  const [profileResult, playerResult, authResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id),
    supabaseAdmin.from("players").upsert(
      [
        {
          user_id: user.id,
          full_name: fullName,
          gender,
          birth_date: birthDate,
          handedness,
          avatar_url: avatarUrl,
        },
      ],
      {
        onConflict: "user_id",
      },
    ),
    supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: normalizedMetadata,
    }),
  ]);

  if (profileResult.error) {
    redirect(`/profile/personal-information?error=${encodeURIComponent(profileResult.error.message)}`);
  }

  if (playerResult.error) {
    redirect(`/profile/personal-information?error=${encodeURIComponent(playerResult.error.message)}`);
  }

  if (authResult.error) {
    redirect(`/profile/personal-information?error=${encodeURIComponent(authResult.error.message)}`);
  }

  redirect("/profile/personal-information?success=Personal information updated successfully.");
}
