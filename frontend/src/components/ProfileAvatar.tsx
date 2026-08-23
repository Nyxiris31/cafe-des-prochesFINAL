import type { User } from "@/lib/types";

interface ProfileAvatarProps {
  user: User | null;
}

export default function ProfileAvatar({ user }: ProfileAvatarProps) {
  const source = user?.name?.trim() || user?.email?.trim() || "?";
  const initial = Array.from(source)[0]?.toLocaleUpperCase("fr-FR") || "?";

  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6f3f24] text-sm font-bold text-[#f8eee2] shadow-sm sm:h-11 sm:w-11"
      title={user?.email ?? "Profil"}
      aria-label={`Profil de ${user?.email ?? "l'utilisateur"}`}
      data-testid="profile-avatar"
    >
      {initial}
    </span>
  );
}
