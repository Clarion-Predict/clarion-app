import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "./supabase";
import { Avatar } from "./shared";

// Phone photos are several megabytes; an avatar renders at well under 100px.
// Shrinking in the browser keeps uploads fast and storage small.
const MAX_DIMENSION = 256;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

const resize = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Square crop from the centre, so portraits aren't squashed.
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = MAX_DIMENSION;
      canvas.height = MAX_DIMENSION;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not read that image."));
        return;
      }
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        MAX_DIMENSION,
        MAX_DIMENSION,
      );
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Could not read that image.")),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read."));
    };
    img.src = url;
  });

const AvatarUpload = ({
  userId,
  username,
  avatarUrl,
  onUploaded,
}: {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  onUploaded: (url: string | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file?: File) => {
    if (!file) return;
    setError("");

    // Friendly guardrails. The bucket enforces the real limits — a browser
    // check is advice, not a control.
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is very large — try one under 10MB.");
      return;
    }

    setBusy(true);
    try {
      const blob = await resize(file);
      // A fresh filename each time, so browsers and the CDN never serve the
      // previous picture from cache.
      const path = `${userId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);
      if (profileError) throw profileError;

      // Only once the profile points at the new file is the old one safe to
      // remove; a failure here costs a stray file, not a broken avatar.
      const previous = avatarUrl?.split("/avatars/")[1];
      if (previous) {
        await supabase.storage.from("avatars").remove([previous]);
      }

      onUploaded(publicUrl);
    } catch (err) {
      console.error("avatar upload:", err);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    setBusy(true);
    setError("");
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", userId);
    if (profileError) {
      console.error("avatar clear:", profileError);
      setError("Could not remove that. Please try again.");
      setBusy(false);
      return;
    }
    const previous = avatarUrl?.split("/avatars/")[1];
    if (previous) await supabase.storage.from("avatars").remove([previous]);
    onUploaded(null);
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar username={username} avatarUrl={avatarUrl} size={72} />
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="px-3 py-2 rounded-full bg-stone-900 text-white text-xs font-medium disabled:opacity-60 flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            {busy ? "Uploading…" : avatarUrl ? "Change photo" : "Add photo"}
          </button>
          {avatarUrl && !busy && (
            <button
              type="button"
              onClick={clear}
              className="px-3 py-2 rounded-full border border-stone-200 text-stone-600 text-xs hover:bg-stone-50"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-stone-400 mt-1.5">
          JPG, PNG or WebP. Cropped to a square.
        </p>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        onChange={(e) => pick(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
