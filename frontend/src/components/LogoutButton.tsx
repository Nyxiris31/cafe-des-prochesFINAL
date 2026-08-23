import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#2a1810] transition-colors hover:bg-[#f3ece0] sm:h-11 sm:px-4 sm:text-sm"
      data-testid="logout-btn"
    >
      <LogOut className="h-4 w-4" /> Déconnexion
    </button>
  );
}
