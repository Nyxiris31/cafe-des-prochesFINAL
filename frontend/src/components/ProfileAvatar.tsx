import { Link } from "react-router-dom";
import type { User } from "@/lib/types";

interface ProfileAvatarProps {
  user: User | null;
}

export default function ProfileAvatar({ user }: ProfileAvatarProps) {
  const source = user?.name?.trim() || user?.email?.trim() || "?";
  const initial = Array.from(source)[0]?.toLocaleUpperCase("fr-FR") || "?";

  return (
    <Link
      to="/profil"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6f3f24] text-sm font-bold text-[#f8eee2] shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a4b20] focus-visible:ring-offset-2 sm:h-11 sm:w-11"
      title={user?.email ?? "Profil"}
      aria-label="Voir mon profil"
      data-testid="profile-avatar"
    >
        {initial}
    </Link>
  );
}
