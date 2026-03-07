"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export async function updatePasswordAction(formData) {
  const password = getString(formData, "password");
  const confirmPassword = getString(formData, "confirm_password");

  if (!password) {
    redirect("/profile/password-account?error=New password is required.");
  }

  if (password.length < 6) {
    redirect("/profile/password-account?error=Password must be at least 6 characters.");
  }

  if (password !== confirmPassword) {
    redirect("/profile/password-account?error=Passwords do not match.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect(`/profile/password-account?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile/password-account?success=Password updated successfully.");
}
