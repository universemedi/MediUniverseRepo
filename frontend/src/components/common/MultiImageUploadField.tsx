import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ApiError, resolveUploadUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface MultiImageUploadFieldProps {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  uploadPath?: string;
}

/** A rotating hero carousel's image set — up to `max` photos, each uploaded the same way as
 * ImageUploadField, shown as a thumbnail strip with per-image remove. */
export function MultiImageUploadField({
  label,
  values,
  onChange,
  max = 5,
  uploadPath = "/api/platform/uploads",
}: MultiImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = values.length >= max;

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
      onChange([...values, url]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload this image.");
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className="text-[11px] text-muted-foreground">
          {values.length} / {max}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {values.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
          >
            <img src={resolveUploadUrl(url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Remove image"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || atLimit}
          onClick={() => inputRef.current?.click()}
        >
          {atLimit ? "Limit reached" : "Add photo"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        JPEG, PNG, WEBP or GIF, up to 5 MB each — up to {max} photos, shown as a rotating carousel.
      </p>
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
