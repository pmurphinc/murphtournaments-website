import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type Listing = {
  id: number;
  userId: number;
  title: string;
  description: string;
  platform: string | null;
  region: string | null;
  availability: string | null;
  contact: string | null;
  hiddenByAdmin: number;
};

type Props = {
  listing: Listing;
  isAdmin: boolean;
  currentUserId?: number;
  onToggleHidden: (id: number, hiddenByAdmin: boolean) => void;
  isToggling?: boolean;
};

export default function TeamFinderListingCard({
  listing,
  isAdmin,
  currentUserId,
  onToggleHidden,
  isToggling,
}: Props) {
  const isHidden = listing.hiddenByAdmin === 1;
  const isOwner = currentUserId === listing.userId;

  return (
    <article className="rounded-lg border border-neon-cyan/30 bg-black/60 p-5 shadow-lg shadow-neon-cyan/10">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">{listing.title}</h2>
          <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
            {[listing.platform, listing.region].filter(Boolean).join(" • ") || "Any platform"}
          </p>
        </div>
        {isHidden && (
          <span className="inline-flex items-center gap-2 rounded border border-neon-magenta/50 bg-neon-magenta/10 px-3 py-1 font-mono text-xs uppercase text-neon-magenta">
            <ShieldAlert size={14} /> Hidden by admin
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-white/80">{listing.description}</p>
      <dl className="mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-2">
        <div>
          <dt className="font-mono uppercase tracking-widest text-white/50">Availability</dt>
          <dd>{listing.availability || "Ask player"}</dd>
        </div>
        <div>
          <dt className="font-mono uppercase tracking-widest text-white/50">Contact</dt>
          <dd>{listing.contact || "Sign in to coordinate"}</dd>
        </div>
      </dl>
      {isAdmin && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          <Button
            type="button"
            variant={isHidden ? "default" : "outline"}
            onClick={() => onToggleHidden(listing.id, !isHidden)}
            disabled={isToggling}
          >
            {isHidden ? "Unhide listing" : "Hide listing"}
          </Button>
          {isOwner && <span className="text-xs text-white/50">This is your listing.</span>}
        </div>
      )}
    </article>
  );
}
