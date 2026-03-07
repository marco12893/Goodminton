import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GOODMINTON_STORAGE_BUCKET = "goodminton-media";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export function isAllowedImageContentType(value) {
  return ALLOWED_IMAGE_TYPES.has(value);
}

function getFileExtension(file) {
  const fromType = file.type?.split("/")[1];
  if (fromType) {
    return fromType === "jpeg" ? "jpg" : fromType;
  }

  const fromName = file.name?.split(".").pop()?.toLowerCase();
  return fromName || "bin";
}

function sanitizePathPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateImageFile(file, fieldLabel = "Image") {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`${fieldLabel} must be a JPG, PNG, WebP, GIF, or AVIF image.`);
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`${fieldLabel} must be 5 MB or smaller.`);
  }

  return file;
}

export function buildPublicImageUrl(path) {
  if (!path) return null;
  const { data } = supabaseAdmin.storage.from(GOODMINTON_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function buildStoragePath({ folder, objectId, fileName, contentType }) {
  const extension = getFileExtension({
    name: fileName,
    type: contentType,
  });

  return `${sanitizePathPart(folder)}/${sanitizePathPart(objectId)}/${crypto.randomUUID()}.${extension}`;
}

export function parseStoragePathFromPublicUrl(url) {
  if (!url) return null;

  const marker = `/storage/v1/object/public/${GOODMINTON_STORAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}

export async function deleteStorageObject(path) {
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(GOODMINTON_STORAGE_BUCKET).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}
