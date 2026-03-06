import { badRequest, json, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureRequiredString, optionalString } from "@/lib/validators";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return serverError("Gagal mengambil data klub.", error.message);
  }

  return json({ data });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = {
      name: ensureRequiredString(body.name, "name"),
      slug: ensureRequiredString(body.slug, "slug"),
      city: optionalString(body.city),
    };

    const { data, error } = await supabaseAdmin
      .from("clubs")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return serverError("Gagal membuat klub.", error.message);
    }

    return json({ data }, { status: 201 });
  } catch (error) {
    return badRequest(error.message);
  }
}
