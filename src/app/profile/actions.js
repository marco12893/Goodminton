"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export async function deleteAccountAction(formData) {
  const confirmation = getString(formData, "confirmation");

  if (confirmation !== "DELETE") {
    redirect("/profile?error=Type DELETE to confirm account deletion.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=Account deleted successfully.");
}
