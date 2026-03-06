"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getString(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginAction(formData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/login?error=Email and password are required.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function registerAction(formData) {
  const fullName = getString(formData, "full_name");
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!fullName || !email || !password) {
    redirect("/register?error=Full name, email, and password are required.");
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  const createdUser = data.user;
  if (!createdUser) {
    redirect("/register?error=Failed to create account.");
  }

  const playerInsert = await supabaseAdmin.from("players").upsert(
    [
      {
        user_id: createdUser.id,
        full_name: fullName,
      },
    ],
    {
      onConflict: "user_id",
    }
  );

  if (playerInsert.error) {
    redirect(`/register?error=${encodeURIComponent(playerInsert.error.message)}`);
  }

  const supabase = await createSupabaseServerClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error) {
    redirect("/login?message=Account created successfully. Please sign in.");
  }

  redirect("/");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
