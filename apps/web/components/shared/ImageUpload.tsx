"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  className?: string;
  /** Show as a wide rectangle (default) or square thumb. */
  aspect?: "wide" | "square";
}

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  label = "Image",
  className,
  aspect = "wide",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `${API_URL}/api/upload/image?folder=${encodeURIComponent(folder)}`,
        { method: "POST", body: fd, credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new ApiError(
          (data as any)?.error ?? "Upload failed",
          res.status,
          data
        );
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-brand-text">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative rounded-sm border-2 border-dashed border-brand-border bg-brand-surface flex items-center justify-center overflow-hidden",
          aspect === "wide" ? "h-32" : "h-32 w-32",
          uploading && "opacity-60"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="object-cover w-full h-full"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-brand-surface border border-brand-border hover:bg-brand-bg"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-1 text-brand-textMuted hover:text-brand-primary text-xs px-4 py-2"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            <span>{uploading ? "Uploading…" : "Click to upload (max 5MB)"}</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
