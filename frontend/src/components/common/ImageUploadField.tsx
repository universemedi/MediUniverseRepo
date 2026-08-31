import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ApiError, resolveUploadUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadPath?: string;
}

/** A photo upload control — replaces a plain "paste an image URL" text input with a real
 * file picker, preview thumbnail and upload progress, used wherever an admin screen needs
 * a photo (testimonials, blog covers, team members). */
export function ImageUploadField({
  label,
  value,
  onChange,
  uploadPath = "/api/platform/uploads",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be under 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadFile(uploadPath, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload this image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            <img src={resolveUploadUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {value ? "Replace photo" : "Upload photo"}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => onChange(null)}
              >
                <X className="h-3.5 w-3.5" /> Remove
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">JPEG, PNG, WEBP or GIF, up to 5 MB.</p>
        </div>
      </div>
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
