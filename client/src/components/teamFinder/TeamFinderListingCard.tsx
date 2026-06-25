import NeonCard from "@/components/NeonCard";
import {
  TEAM_FINDER_REGION_LABELS,
  type TeamFinderRegion,
} from "@shared/teamFinder";
import {
  Clock,
  Flag,
  Globe2,
  Pencil,
  RefreshCw,
  ShieldOff,
  ShieldCheck,
  Trash2,
  Twitch,
  Users,
  Youtube,
} from "lucide-react";

/**
 * Public shape returned by the teamFinder router. Kept structurally in sync with
 * `TeamFinderListingPublic` on the server without importing server code.
 */
export type TeamFinderListingView = {
  id: number;
  listingType: "player" | "team";
  status: "active" | "filled" | "closed" | "expired";
  region: TeamFinderRegion;
  targetTournament: string | null;
  description: string;
  embarkId: string | null;
  mainClasses: Array<"Light" | "Medium" | "Heavy">;
  preferredRole: string | null;
  experience: string | null;
  availability: string | null;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  teamName: string | null;
  rosterCount: number | null;
  neededClass: string | null;
  practiceAvailability: string | null;
  hiddenByAdmin: boolean;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    displayName: string;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
  };
  isOwner: boolean;
};

const STATUS_STYLES: Record<
  TeamFinderListingView["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "border-neon-lime/60 text-neon-lime",
  },
  filled: {
    label: "Filled",
    className: "border-neon-cyan/60 text-neon-cyan",
  },
  closed: {
    label: "Closed",
    className: "border-white/30 text-white/50",
  },
  expired: {
    label: "Expired",
    className: "border-white/20 text-white/40",
  },
};

const CLASS_STYLES: Record<string, string> = {
  Light: "border-neon-cyan/60 text-neon-cyan",
  Medium: "border-neon-gold/60 text-neon-gold",
  Heavy: "border-neon-magenta/60 text-neon-magenta",
};

function formatRelativeExpiry(expiresAt: string, isExpired: boolean): string {
  if (isExpired) return "Expired";
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(0, Math.floor(ms / (60 * 60 * 1000)));
  return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}

type OwnerActions = {
  onEdit: (listing: TeamFinderListingView) => void;
  onRenew: (listing: TeamFinderListingView) => void;
  onClose: (listing: TeamFinderListingView) => void;
  onDelete: (listing: TeamFinderListingView) => void;
  pendingAction: string | null;
};

type Props = {
  listing: TeamFinderListingView;
  isAdmin?: boolean;
  onReport?: (listing: TeamFinderListingView) => void;
  onToggleHidden?: (listing: TeamFinderListingView) => void;
  ownerActions?: OwnerActions;
};

const Pill = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest ${className}`}
  >
    {children}
  </span>
);

export default function TeamFinderListingCard({
  listing,
  isAdmin = false,
  onReport,
  onToggleHidden,
  ownerActions,
}: Props) {
  const isPlayer = listing.listingType === "player";
  const variant = isPlayer ? "cyan" : "gold";
  const accentText = isPlayer ? "text-neon-cyan" : "text-neon-gold";
  const status = STATUS_STYLES[listing.status];

  const title = isPlayer
    ? listing.embarkId || "Player looking for team"
    : listing.teamName || "Team recruiting";

  const busy = ownerActions?.pendingAction != null;

  return (
    <NeonCard variant={variant} className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Pill className={`${accentText} border-current/60 mb-2`}>
            {isPlayer ? (
              <>
                <Users size={11} /> Player LFT
              </>
            ) : (
              <>
                <Users size={11} /> Team LFP
              </>
            )}
          </Pill>
          <h3 className="truncate font-mono text-xl font-bold text-white">
            {title}
          </h3>
        </div>
        <Pill className={status.className}>{status.label}</Pill>
      </div>

      {/* Meta row */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill className="border-white/20 text-white/70">
          <Globe2 size={11} /> {TEAM_FINDER_REGION_LABELS[listing.region]}
        </Pill>
        {isPlayer &&
          listing.mainClasses.map(cls => (
            <Pill
              key={cls}
              className={CLASS_STYLES[cls] ?? "border-white/20 text-white/70"}
            >
              {cls}
            </Pill>
          ))}
        {!isPlayer && listing.neededClass ? (
          <Pill className="border-neon-magenta/60 text-neon-magenta">
            Needs: {listing.neededClass}
          </Pill>
        ) : null}
        {!isPlayer && listing.rosterCount != null ? (
          <Pill className="border-white/20 text-white/70">
            Roster {listing.rosterCount}
          </Pill>
        ) : null}
        {listing.targetTournament ? (
          <Pill className="border-neon-gold/50 text-neon-gold">
            {listing.targetTournament}
          </Pill>
        ) : null}
      </div>

      {/* Description */}
      <p className="mb-4 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-white/80">
        {listing.description}
      </p>

      {/* Detail grid */}
      <dl className="mb-4 grid grid-cols-1 gap-2 font-mono text-xs text-white/60 sm:grid-cols-2">
        {isPlayer && listing.preferredRole ? (
          <div>
            <dt className="uppercase tracking-widest text-white/40">Role</dt>
            <dd className="text-white/80">{listing.preferredRole}</dd>
          </div>
        ) : null}
        {listing.experience ? (
          <div>
            <dt className="uppercase tracking-widest text-white/40">
              Experience
            </dt>
            <dd className="text-white/80">{listing.experience}</dd>
          </div>
        ) : null}
        {isPlayer && listing.availability ? (
          <div>
            <dt className="uppercase tracking-widest text-white/40">
              Availability
            </dt>
            <dd className="text-white/80">{listing.availability}</dd>
          </div>
        ) : null}
        {!isPlayer && listing.practiceAvailability ? (
          <div>
            <dt className="uppercase tracking-widest text-white/40">
              Practice
            </dt>
            <dd className="text-white/80">{listing.practiceAvailability}</dd>
          </div>
        ) : null}
      </dl>

      {/* Links */}
      {(listing.twitchUrl || listing.youtubeUrl) && (
        <div className="mb-4 flex flex-wrap gap-3">
          {listing.twitchUrl ? (
            <a
              href={listing.twitchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-neon-magenta hover:underline"
            >
              <Twitch size={13} /> Twitch
            </a>
          ) : null}
          {listing.youtubeUrl ? (
            <a
              href={listing.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-neon-magenta hover:underline"
            >
              <Youtube size={14} /> YouTube
            </a>
          ) : null}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {listing.owner.discordAvatarUrl ? (
              <img
                src={listing.owner.discordAvatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full border border-white/20"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/50 font-mono text-[10px] text-white/60">
                {listing.owner.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate font-mono text-xs text-white/70">
              {listing.owner.displayName}
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
            <Clock size={11} />
            {formatRelativeExpiry(listing.expiresAt, listing.isExpired)}
          </span>
        </div>

        {/* Owner action row */}
        {ownerActions ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => ownerActions.onEdit(listing)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-neon-cyan/60 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-neon-cyan transition-colors hover:bg-neon-cyan/10 disabled:opacity-40"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => ownerActions.onRenew(listing)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-neon-lime/60 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-neon-lime transition-colors hover:bg-neon-lime/10 disabled:opacity-40"
            >
              <RefreshCw size={12} /> Renew
            </button>
            {listing.status === "active" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => ownerActions.onClose(listing)}
                className="inline-flex items-center gap-1.5 rounded-sm border border-white/30 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
              >
                Close
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => ownerActions.onDelete(listing)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-red-500/50 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-40"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        ) : null}

        {/* Viewer / admin action row */}
        {(onReport || (isAdmin && onToggleHidden)) && !ownerActions ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onReport ? (
              <button
                type="button"
                onClick={() => onReport(listing)}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-red-300"
              >
                <Flag size={12} /> Report
              </button>
            ) : null}
            {isAdmin && onToggleHidden ? (
              <button
                type="button"
                onClick={() => onToggleHidden(listing)}
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/40 transition-colors hover:text-neon-gold"
              >
                {listing.hiddenByAdmin ? (
                  <>
                    <ShieldCheck size={12} /> Unhide
                  </>
                ) : (
                  <>
                    <ShieldOff size={12} /> Hide
                  </>
                )}
              </button>
            ) : null}
            {listing.hiddenByAdmin ? (
              <Pill className="border-red-500/50 text-red-300">Hidden</Pill>
            ) : null}
          </div>
        ) : null}
      </div>
    </NeonCard>
  );
}
