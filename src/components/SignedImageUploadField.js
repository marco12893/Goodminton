"use client";

import { useEffect, useId, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function getInitials(label) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "GM";
}

export default function SignedImageUploadField({
  label,
  folder,
  objectId,
  initialUrl = "",
  initialPath = "",
  initialsLabel = "GM",
  urlInputName,
  pathInputName,
  currentUrlInputName,
  currentPathInputName,
  allowRemove = false,
  removeLabel = "Remove photo",
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [uploadedUrl, setUploadedUrl] = useState(initialUrl);
  const [uploadedPath, setUploadedPath] = useState(initialPath);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [objectPreviewUrl, setObjectPreviewUrl] = useState("");
  
  // Refs to always have latest values
  const uploadedUrlRef = useRef(uploadedUrl);
  const uploadedPathRef = useRef(uploadedPath);

  // Update refs when state changes
  useEffect(() => {
    uploadedUrlRef.current = uploadedUrl;
  }, [uploadedUrl]);

  useEffect(() => {
    uploadedPathRef.current = uploadedPath;
  }, [uploadedPath]);

  useEffect(() => {
    return () => {
      if (objectPreviewUrl) {
        URL.revokeObjectURL(objectPreviewUrl);
      }
    };
  }, [objectPreviewUrl]);

  async function handleChange(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (objectPreviewUrl) {
      URL.revokeObjectURL(objectPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setError("");
    setFileName(file.name);
    setObjectPreviewUrl(nextPreviewUrl);
    setPreviewUrl(nextPreviewUrl);

    try {
      const response = await fetch("/api/storage/sign-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folder,
          objectId,
          fileName: file.name,
          contentType: file.type,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to prepare image upload.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(payload.bucket)
        .uploadToSignedUrl(payload.path, payload.token, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setUploadedUrl(payload.publicUrl);
      setUploadedPath(payload.path);
    } catch (uploadErr) {
      setError(uploadErr.message);
    }
  }

  function handleRemove() {
    if (objectPreviewUrl) {
      URL.revokeObjectURL(objectPreviewUrl);
      setObjectPreviewUrl("");
    }

    setPreviewUrl("");
    setUploadedUrl("");
    setUploadedPath("");
    setFileName("");
    setError("");
    
    // Update refs immediately
    uploadedUrlRef.current = "";
    uploadedPathRef.current = "";
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-sm font-medium text-white/70">{label}</p>
      <input 
        type="hidden" 
        name={urlInputName} 
        value={uploadedUrl} 
        onChange={(e) => {
          setUploadedUrl(e.target.value);
          uploadedUrlRef.current = e.target.value;
        }}
      />
      <input 
        type="hidden" 
        name={pathInputName} 
        value={uploadedPath}
        onChange={(e) => {
          setUploadedPath(e.target.value);
          uploadedPathRef.current = e.target.value;
        }}
      />
      <input type="hidden" name={currentUrlInputName} value={initialUrl} />
      <input type="hidden" name={currentPathInputName} value={initialPath} />

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-[#0d2231] bg-cover bg-center text-2xl font-semibold text-white"
          style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined}
        >
          {!previewUrl ? getInitials(initialsLabel) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={inputId}
              className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#082032]"
            >
              Choose File
            </label>
            {allowRemove ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-white/82"
              >
                {removeLabel}
              </button>
            ) : null}
          </div>
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={handleChange}
            className="sr-only"
          />
          <p className="mt-2 truncate text-sm text-white/75">
            {fileName ? fileName : "No file selected"}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/45">
            Upload a JPG, PNG, WebP, GIF, or AVIF image up to 5 MB.
          </p>
          {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
