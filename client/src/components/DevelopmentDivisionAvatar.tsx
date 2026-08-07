import { cn } from "@/lib/utils";

type DevelopmentDivisionAvatarProps = {
  src?: string | null;
  displayName?: string | null;
  isDevelopmentDivisionMember?: boolean | number | null;
  className?: string;
  avatarClassName?: string;
  badgeClassName?: string;
};

function getInitial(displayName?: string | null) {
  return displayName?.trim().charAt(0).toUpperCase() || "?";
}

export default function DevelopmentDivisionAvatar({
  src,
  displayName,
  isDevelopmentDivisionMember,
  className,
  avatarClassName,
  badgeClassName,
}: DevelopmentDivisionAvatarProps) {
  const member = Boolean(isDevelopmentDivisionMember);

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      title={member ? "Development Division member" : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={displayName ? `${displayName}'s profile` : "Profile"}
          className={cn(
            "h-full w-full rounded-full border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] object-cover",
            avatarClassName
          )}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center rounded-full border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] font-mono font-black text-[var(--mt-off-white)]",
            avatarClassName
          )}
          aria-label={displayName ? `${displayName}'s profile` : "Profile"}
        >
          {getInitial(displayName)}
        </span>
      )}
      {member ? (
        <img
          src="/images/development-division-badge.png"
          alt="Development Division member badge"
          className={cn(
            "pointer-events-none absolute -bottom-1 -right-2 z-10 h-auto w-[72%] max-w-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]",
            badgeClassName
          )}
        />
      ) : null}
    </span>
  );
}
