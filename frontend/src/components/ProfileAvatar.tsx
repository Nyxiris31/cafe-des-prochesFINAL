import type { User } from "@/lib/types";
import { useAuth } from "@/lib/auth";

interface ProfileAvatarProps {
  user: User | null;
}

export default function ProfileAvatar({ user }: ProfileAvatarProps) {
  const { switchAccount } = useAuth();
  const source = user?.name?.trim() || user?.email?.trim() || "?";
  const initial = Array.from(source)[0]?.toLocaleUpperCase("fr-FR") || "?";

  return (
    <button
      type="button"
      onClick={() => void switchAccount()}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6f3f24] text-sm font-bold text-[#f8eee2] shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a4b20] focus-visible:ring-offset-2 sm:h-11 sm:w-11"
      title={user?.email ?? "Profil"}
      aria-label="Changer de compte"
      data-testid="profile-avatar"
    >
      {initial}
    </button>
  );
}
