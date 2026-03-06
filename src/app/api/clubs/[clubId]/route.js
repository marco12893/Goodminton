import { badRequest, json, notFound, serverError } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { optionalString } from "@/lib/validators";

export async function GET(_, { params }) {
  const { clubId } = await params;
  const { data, error } = await supabaseAdmin
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    return serverError("Gagal mengambil detail klub.", error.message);
  }

  if (!data) {
    return notFound("Klub tidak ditemukan.");
  }

  return json({ data });
}

export async function PATCH(request, { params }) {
  try {
    const { clubId } = await params;
    const body = await request.json();
    const payload = {};

    if ("name" in body) payload.name = optionalString(body.name);
    if ("slug" in body) payload.slug = optionalString(body.slug);
    if ("city" in body) payload.city = optionalString(body.city);

    if (Object.keys(payload).length === 0) {
      return badRequest("Tidak ada field yang dikirim untuk diupdate.");
    }

    const { data, error } = await supabaseAdmin
      .from("clubs")
      .update(payload)
      .eq("id", clubId)
      .select()
      .maybeSingle();

    if (error) {
      return serverError("Gagal mengupdate klub.", error.message);
    }

    if (!data) {
      return notFound("Klub tidak ditemukan.");
    }

    return json({ data });
  } catch (error) {
    return badRequest(error.message);
  }
}

export async function DELETE(_, { params }) {
  const { clubId } = await params;
  const { error, count } = await supabaseAdmin
    .from("clubs")
    .delete({ count: "exact" })
    .eq("id", clubId);

  if (error) {
    return serverError("Gagal menghapus klub.", error.message);
  }

  if (!count) {
    return notFound("Klub tidak ditemukan.");
  }

  return json({ success: true });
}
