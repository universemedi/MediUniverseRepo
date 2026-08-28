import { LogOut, User, ShieldCheck } from "lucide-react";
import { logoutUser } from "@/lib/api";
import { useAppSelector } from "@/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function UserNav() {
  const user = useAppSelector((state) => state.auth.user);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formatRole = (role?: string) => {
    if (!role) return "User";
    return role.replace(/^(ROLE_|TENANT_|PLATFORM_)/, "").replace(/_/g, " ");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-11 w-full max-w-[240px] items-center justify-start gap-2.5 rounded-lg px-2 hover:bg-accent/70 focus-visible:ring-1"
        >
          <Avatar className="h-8 w-8 shrink-0 rounded-full border border-primary/20 bg-primary/10 text-primary font-medium text-xs">
            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
          </Avatar>

          {/* Responsive label with text truncation & proper subtitle wrap */}
          <div className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-xs font-semibold leading-tight text-foreground">
              {user?.name || "Dr. Neha Kapoor"}
            </span>
            <span className="truncate text-[11px] font-medium leading-tight text-muted-foreground capitalize">
              {formatRole(user?.role) || "Organization Owner"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {user?.name || "Dr. Neha Kapoor"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user?.email || "owner@sunrise.mediunivers.io"}
            </p>
            <div className="mt-1 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider truncate">
                {formatRole(user?.role)}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
          onClick={() => void logoutUser()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
