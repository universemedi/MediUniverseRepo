import { useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ChangePasswordErrors {
  currentPassword?: string | undefined;
  newPassword?: string | undefined;
  confirmPassword?: string | undefined;
}

export function ChangePasswordDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<ChangePasswordErrors>({});

  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setApiError(null);
    setSuccess(false);
  }

  function validate(): boolean {
    const err: ChangePasswordErrors = {};

    if (!currentPassword) {
      err.currentPassword = "Current password is required.";
    }
    if (!newPassword) {
      err.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      err.newPassword = "Password must be at least 8 characters.";
    } else if (newPassword === currentPassword) {
      err.newPassword = "New password must be different from current password.";
    }

    if (!confirmPassword) {
      err.confirmPassword = "Confirm password is required.";
    } else if (newPassword !== confirmPassword) {
      err.confirmPassword = "Passwords do not match.";
    }

    setErrors(err);

    if (err.currentPassword) {
      currentRef.current?.focus();
      return false;
    }
    if (err.newPassword) {
      newRef.current?.focus();
      return false;
    }
    if (err.confirmPassword) {
      confirmRef.current?.focus();
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      // apiFetch now wraps Axios under the hood
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        data: {
          currentPassword,
          newPassword,
        },
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Update your account password. You will need your current password to continue.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-sm font-medium text-emerald-600">
            Password changed successfully!
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs font-medium">
                Current Password <span className="font-bold text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={currentRef}
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "pl-9 pr-9 text-sm",
                    errors.currentPassword && "border-destructive focus-visible:ring-destructive",
                  )}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (errors.currentPassword) {
                      setErrors(({ currentPassword: _, ...rest }) => rest);
                    }
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.currentPassword ? (
                <p className="text-[11px] font-medium text-destructive">{errors.currentPassword}</p>
              ) : null}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-medium">
                New Password <span className="font-bold text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={newRef}
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "pl-9 text-sm",
                    errors.newPassword && "border-destructive focus-visible:ring-destructive",
                  )}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) {
                      setErrors(({ newPassword: _, ...rest }) => rest);
                    }
                  }}
                  disabled={loading}
                />
              </div>
              {errors.newPassword ? (
                <p className="text-[11px] font-medium text-destructive">{errors.newPassword}</p>
              ) : null}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmNewPassword" className="text-xs font-medium">
                Confirm New Password <span className="font-bold text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={confirmRef}
                  id="confirmNewPassword"
                  type={showPassword ? "text" : "password"}
                  className={cn(
                    "pl-9 text-sm",
                    errors.confirmPassword && "border-destructive focus-visible:ring-destructive",
                  )}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors(({ confirmPassword: _, ...rest }) => rest);
                    }
                  }}
                  disabled={loading}
                />
              </div>
              {errors.confirmPassword ? (
                <p className="text-[11px] font-medium text-destructive">{errors.confirmPassword}</p>
              ) : null}
            </div>

            {apiError ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {apiError}
              </p>
            ) : null}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
