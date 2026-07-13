import { MessageCircle, Send, ShieldAlert } from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { Button } from "@/components/ui/button";

type Listing = inferRouterOutputs<AppRouter>["teamFinder"]["list"][number];

type Props = {
  listing: Listing;
  isAdmin: boolean;
  currentUserId?: number;
  isDiscordUser: boolean;
  onEdit: (listing: Listing) => void;
  onDelete: (id: number) => void;
  onReport: (id: number) => void;
  onToggleHidden: (id: number, hiddenByAdmin: boolean) => void;
  isToggling?: boolean;
  canInvite?: boolean;
  invitePending?: boolean;
  onInvite?: (listing: Listing) => void;
};

export default function TeamFinderListingCard({
  listing,
  isAdmin,
  currentUserId,
  isDiscordUser,
  onEdit,
  onDelete,
  onReport,
  onToggleHidden,
  isToggling,
  canInvite,
  invitePending,
  onInvite,
}: Props) {
  const isHidden = listing.hiddenByAdmin === 1;
  const isOwner = currentUserId === listing.userId;
  const badge = listing.listingType.toUpperCase();

  return (
    <article className="rounded-lg border border-yellow-400/30 bg-black/70 p-5 shadow-lg shadow-yellow-400/10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-yellow-400 px-2 py-1 font-mono text-xs font-black text-black">{badge}</span>
            <h2 className="font-display text-2xl text-white">{listing.title}</h2>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
            {[listing.platform, listing.region, listing.availability, listing.preferredRole].filter(Boolean).join(" • ")}
          </p>
        </div>
        {isHidden && (
          <span className="inline-flex items-center gap-2 rounded border border-neon-magenta/50 bg-neon-magenta/10 px-3 py-1 font-mono text-xs uppercase text-neon-magenta">
            <ShieldAlert size={14} /> Hidden by admin
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-white/80">{listing.description}</p>
      <dl className="mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="font-mono uppercase tracking-widest text-white/50">Platform</dt><dd>{listing.platform}</dd></div>
        <div><dt className="font-mono uppercase tracking-widest text-white/50">Region</dt><dd>{listing.region}</dd></div>
        <div><dt className="font-mono uppercase tracking-widest text-white/50">Availability</dt><dd>{listing.availability}</dd></div>
        <div><dt className="font-mono uppercase tracking-widest text-white/50">Role</dt><dd>{listing.preferredRole}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-white/70">
        Discord: <span className="font-semibold text-white">{listing.discordDisplayName || listing.discordUsername || "Unknown"}</span>
        {listing.discordUsername ? <span className="text-white/50"> (@{listing.discordUsername})</span> : null}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        {isOwner && <Button type="button" onClick={() => onEdit(listing)}>Edit</Button>}
        {isOwner && <Button type="button" variant="destructive" onClick={() => onDelete(listing.id)}>Delete</Button>}
        {!isOwner && listing.discordUserId && <Button asChild type="button" variant="outline"><a href={`https://discord.com/users/${listing.discordUserId}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Message in Discord</a></Button>}
        {!isOwner && listing.listingType === "lft" && canInvite && <Button type="button" onClick={() => onInvite?.(listing)} disabled={invitePending}><Send size={16} /> {invitePending ? "Inviting…" : "Invite to Team"}</Button>}
        {!isOwner && isDiscordUser && <Button type="button" variant="outline" onClick={() => onReport(listing.id)}>Report</Button>}
        {isAdmin && (
          <Button type="button" variant={isHidden ? "default" : "outline"} onClick={() => onToggleHidden(listing.id, !isHidden)} disabled={isToggling}>
            {isHidden ? "Unhide listing" : "Hide listing"}
          </Button>
        )}
        {!isDiscordUser && !isOwner && <span className="text-xs text-white/50">Sign in with Discord to report or post.</span>}
      </div>
    </article>
  );
}
