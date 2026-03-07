import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  GOODMINTON_STORAGE_BUCKET,
  buildPublicImageUrl,
  buildStoragePath,
  isAllowedImageContentType,
} from "@/lib/storageUploads";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_FOLDERS = new Set(["avatars", "clubs", "clubs-temp"]);

export async function POST(request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const folder = String(body?.folder ?? "").trim();
  const objectId = String(body?.objectId ?? "").trim();
  const fileName = String(body?.fileName ?? "").trim();
  const contentType = String(body?.contentType ?? "").trim();

  if (!ALLOWED_FOLDERS.has(folder) || !objectId || !fileName || !contentType || !isAllowedImageContentType(contentType)) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const path = buildStoragePath({
    folder,
    objectId,
    fileName,
    contentType,
  });

  const { data, error } = await supabaseAdmin.storage
    .from(GOODMINTON_STORAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    bucket: GOODMINTON_STORAGE_BUCKET,
    path,
    publicUrl: buildPublicImageUrl(path),
    token: data.token,
  });
}
