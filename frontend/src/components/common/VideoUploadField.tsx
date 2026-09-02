import { useRef, useState } from "react";
import { Loader2, Video, X } from "lucide-react";
import { ApiError, resolveUploadUrl, uploadFile } from "@/lib/api";
import { Button } from "@/components/ui/button";

const MAX_SIZE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface VideoUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadPath?: string;
}

/** An optional intro/how-it-works video next to the hero — same upload flow as
 * ImageUploadField, just against the video-accepting branch of the same storage endpoint. */
export function VideoUploadField({
  label,
  value,
  onChange,
  uploadPath = "/api/platform/uploads",
}: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only MP4, WEBM or MOV videos are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Video must be under 50 MB.");
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadFile(uploadPath, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload this video.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : value ? (
            <video src={resolveUploadUrl(value)} className="h-full w-full object-cover" muted />
          ) : (
            <Video className="h-5 w-5 text-muted-foreground" />
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
              {value ? "Replace video" : "Upload video"}
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
          <p className="text-[11px] text-muted-foreground">MP4, WEBM or MOV, up to 50 MB.</p>
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
