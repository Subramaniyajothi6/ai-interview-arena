"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { isNetworkError, withNetworkErrors } from "@/lib/network";
import { createClient } from "@/lib/supabase/client";
import { setAvatar } from "./actions";
import { useEditMode } from "./edit-mode";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;

// "Change photo": uploads straight to the user's avatars folder, then saves it.
export function PhotoButton({ userId }: { userId: string }) {
  const router = useRouter();
  const { editing } = useEditMode();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("The photo must be 2 MB or smaller.");
    startTransition(async () => {
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await createClient()
        .storage.from("avatars")
        .upload(path, file, { contentType: file.type, cacheControl: "3600" });
      if (uploadError) return setError("Upload failed. Please try again.");
      const result = await withNetworkErrors(() => setAvatar(path));
      if (isNetworkError(result)) return setError(result.networkError);
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-sec btn-sm"
        onClick={() => input.current?.click()}
        // The photo can only be changed while editing the profile.
        disabled={pending || !editing}
        title={editing ? undefined : "Click Edit profile first"}
      >
        {pending ? "Uploading…" : "Change photo"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a profile photo"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
