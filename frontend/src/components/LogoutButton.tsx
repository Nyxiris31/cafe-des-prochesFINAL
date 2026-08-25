import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      aria-label="Déconnexion"
      title="Déconnexion"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full px-2 text-xs font-medium text-[#2a1810] transition-colors hover:bg-[#f3ece0] sm:h-11 sm:w-auto sm:justify-start sm:gap-1.5 sm:px-4 sm:text-sm"
      data-testid="logout-btn"
    >
      <LogOut className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
