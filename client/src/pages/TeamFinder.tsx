import GlitchText from "@/components/GlitchText";
import NeonCard from "@/components/NeonCard";
import ReportListingDialog from "@/components/teamFinder/ReportListingDialog";
import TeamFinderAdminReports from "@/components/teamFinder/TeamFinderAdminReports";
import TeamFinderForm, {
  type TeamFinderFormPayload,
} from "@/components/teamFinder/TeamFinderForm";
import TeamFinderListingCard, {
  type TeamFinderListingView,
} from "@/components/teamFinder/TeamFinderListingCard";
import { getDiscordLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import {
  FINALS_CLASSES,
  TEAM_FINDER_REGIONS,
  TEAM_FINDER_REGION_LABELS,
  type FinalsClass,
  type TeamFinderListingType,
  type TeamFinderRegion,
} from "@shared/teamFinder";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Pull per-field validation messages out of a tRPC Zod error, if present. */
function extractFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof TRPCClientError)) return {};
  const zod = error.data?.zodError as
    | { fieldErrors?: Record<string, string[]> }
    | undefined;
  if (!zod?.fieldErrors) return {};
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(zod.fieldErrors)) {
    if (messages && messages.length > 0) out[key] = messages[0];
  }
  return out;
}

type TypeFilter = "all" | TeamFinderListingType;

export default function TeamFinder() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const hasDiscordIdentity = Boolean(user?.discordId);
  const utils = trpc.useUtils();

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [regionFilter, setRegionFilter] = useState<TeamFinderRegion | "all">(
    "all"
  );
  const [classFilter, setClassFilter] = useState<FinalsClass | "all">("all");
  const [tournamentFilter, setTournamentFilter] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamFinderListingView | null>(null);
  const [reportTarget, setReportTarget] =
    useState<TeamFinderListingView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [reportError, setReportError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  const listQuery = trpc.teamFinder.list.useQuery(
    {
      listingType: typeFilter === "all" ? undefined : typeFilter,
      region: regionFilter === "all" ? undefined : regionFilter,
      mainClass: classFilter === "all" ? undefined : classFilter,
      targetTournament: tournamentFilter.trim() || undefined,
      includeInactive: false,
    },
    { staleTime: 1000 * 15 }
  );

  const myListingsQuery = trpc.teamFinder.myListings.useQuery(undefined, {
    enabled: hasDiscordIdentity,
    staleTime: 1000 * 15,
  });

  const refreshAll = async () => {
    await Promise.all([
      utils.teamFinder.list.invalidate(),
      utils.teamFinder.myListings.invalidate(),
    ]);
  };

  const createMutation = trpc.teamFinder.create.useMutation();
  const updateMutation = trpc.teamFinder.update.useMutation();
  const renewMutation = trpc.teamFinder.renew.useMutation();
  const statusMutation = trpc.teamFinder.setStatus.useMutation();
  const deleteMutation = trpc.teamFinder.delete.useMutation();
  const reportMutation = trpc.teamFinder.report.useMutation();
  const hideMutation = trpc.teamFinder.admin.hide.useMutation();
  const unhideMutation = trpc.teamFinder.admin.unhide.useMutation();

  const submitting = createMutation.isPending || updateMutation.isPending;

  const listings = (listQuery.data ?? []) as TeamFinderListingView[];
  const myListings = (myListingsQuery.data ?? []) as TeamFinderListingView[];

  // Exclude the viewer's own listings from the public board to avoid duplicates
  // with the My Listings section.
  const publicListings = useMemo(
    () => listings.filter(listing => !listing.isOwner),
    [listings]
  );

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (listing: TeamFinderListingView) => {
    setEditing(listing);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (payload: TeamFinderFormPayload) => {
    setFormError(null);
    setFieldErrors({});
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          ...payload,
        });
        toast.success("Listing updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Listing posted.");
      }
      await refreshAll();
      closeForm();
    } catch (error) {
      const fields = extractFieldErrors(error);
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields);
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(getErrorMessage(error, "Could not save the listing."));
      }
    }
  };

  const withPending = async (id: number, fn: () => Promise<unknown>) => {
    setPendingActionId(id);
    try {
      await fn();
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRenew = (listing: TeamFinderListingView) =>
    withPending(listing.id, async () => {
      try {
        await renewMutation.mutateAsync({ id: listing.id });
        toast.success("Listing renewed for 30 days.");
        await refreshAll();
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not renew listing."));
      }
    });

  const handleClose = (listing: TeamFinderListingView) =>
    withPending(listing.id, async () => {
      try {
        await statusMutation.mutateAsync({ id: listing.id, status: "closed" });
        toast.success("Listing closed.");
        await refreshAll();
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not close listing."));
      }
    });

  const handleDelete = (listing: TeamFinderListingView) =>
    withPending(listing.id, async () => {
      if (!window.confirm("Delete this listing? This cannot be undone.")) {
        return;
      }
      try {
        await deleteMutation.mutateAsync({ id: listing.id });
        toast.success("Listing deleted.");
        await refreshAll();
      } catch (error) {
        toast.error(getErrorMessage(error, "Could not delete listing."));
      }
    });

  const handleToggleHidden = async (listing: TeamFinderListingView) => {
    try {
      if (listing.hiddenByAdmin) {
        await unhideMutation.mutateAsync({ id: listing.id });
        toast.success("Listing is visible again.");
      } else {
        await hideMutation.mutateAsync({ id: listing.id });
        toast.success("Listing hidden from the board.");
      }
      await refreshAll();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update listing."));
    }
  };

  const handleReport = async (payload: {
    reason: "spam" | "inappropriate" | "scam" | "impersonation" | "other";
    details?: string;
    website: string;
  }) => {
    if (!reportTarget) return;
    setReportError(null);
    try {
      await reportMutation.mutateAsync({
        listingId: reportTarget.id,
        reason: payload.reason,
        details: payload.details,
        website: payload.website,
      });
      toast.success("Report submitted. Thank you.");
      setReportTarget(null);
    } catch (error) {
      setReportError(getErrorMessage(error, "Could not submit report."));
    }
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setRegionFilter("all");
    setClassFilter("all");
    setTournamentFilter("");
  };

  const hasActiveFilters =
    typeFilter !== "all" ||
    regionFilter !== "all" ||
    classFilter !== "all" ||
    tournamentFilter.trim().length > 0;

  const selectClass =
    "rounded border border-neon-cyan/40 bg-black/60 px-3 py-2 font-mono text-sm text-white outline-none focus:border-neon-cyan";

  return (
    <div className="min-h-screen bg-dark-charcoal py-12 px-4">
      <div className="container max-w-6xl space-y-10">
        {/* Header */}
        <div className="space-y-4 text-center">
          <GlitchText size="2xl" variant="gold">
            TEAM FINDER
          </GlitchText>
          <p className="mx-auto max-w-2xl font-mono text-white/70">
            Find a squad or recruit teammates for Murph Tournaments and the
            Development Division. Sign in with Discord to post your own listing.
          </p>
        </div>

        {/* Action bar */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="font-mono text-sm uppercase tracking-widest text-neon-cyan">
            {listQuery.isLoading
              ? "Loading listings…"
              : `${publicListings.length + myListings.length} open listing${
                  publicListings.length + myListings.length === 1 ? "" : "s"
                }`}
          </div>
          {hasDiscordIdentity ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-sm border-2 border-neon-magenta px-5 py-2.5 font-mono font-bold uppercase tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover-glow-magenta"
            >
              <Plus size={16} /> Post a listing
            </button>
          ) : null}
        </div>

        {/* Sign-in gate */}
        {!authLoading && !hasDiscordIdentity ? (
          <NeonCard variant="magenta" className="text-center">
            <h2 className="mb-2 font-mono text-lg font-bold uppercase text-white">
              Continue with Discord to post
            </h2>
            <p className="mx-auto mb-5 max-w-xl font-mono text-sm text-white/70">
              Browsing is open to everyone. To post a listing, renew it, or
              report a problem, continue with Discord so players can contact
              your public username.
            </p>
            <a
              href={getDiscordLoginUrl("/team-finder")}
              className="inline-flex items-center gap-2 rounded-sm border-2 border-[#5865F2] bg-[#5865F2]/15 px-6 py-3 font-mono font-bold uppercase tracking-widest text-white transition-all hover:bg-[#5865F2]/25"
            >
              Continue with Discord
            </a>
          </NeonCard>
        ) : null}

        {/* My Listings */}
        {hasDiscordIdentity && myListings.length > 0 ? (
          <section className="space-y-4">
            <h2 className="font-mono text-xl font-bold uppercase tracking-widest text-neon-lime">
              My Listings
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {myListings.map(listing => (
                <TeamFinderListingCard
                  key={listing.id}
                  listing={listing}
                  ownerActions={{
                    onEdit: openEdit,
                    onRenew: handleRenew,
                    onClose: handleClose,
                    onDelete: handleDelete,
                    pendingAction:
                      pendingActionId === listing.id ? "pending" : null,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Admin moderation */}
        {isAdmin ? <TeamFinderAdminReports /> : null}

        {/* Filters */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                className={selectClass}
              >
                <option value="all">All</option>
                <option value="player">Players (LFT)</option>
                <option value="team">Teams (LFP)</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
                Region
              </label>
              <select
                value={regionFilter}
                onChange={e =>
                  setRegionFilter(e.target.value as TeamFinderRegion | "all")
                }
                className={selectClass}
              >
                <option value="all">All regions</option>
                {TEAM_FINDER_REGIONS.map(r => (
                  <option key={r} value={r}>
                    {TEAM_FINDER_REGION_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
                Class
              </label>
              <select
                value={classFilter}
                onChange={e =>
                  setClassFilter(e.target.value as FinalsClass | "all")
                }
                className={selectClass}
              >
                <option value="all">Any class</option>
                {FINALS_CLASSES.map(cls => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">
                Tournament
              </label>
              <input
                value={tournamentFilter}
                onChange={e => setTournamentFilter(e.target.value)}
                placeholder="Search tournament"
                className={selectClass}
              />
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-sm border border-white/20 px-3 py-2 font-mono text-xs uppercase tracking-widest text-white/60 transition-colors hover:bg-white/10"
              >
                <X size={12} /> Clear
              </button>
            ) : null}
          </div>
        </section>

        {/* Public board */}
        <section className="space-y-4">
          {listQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-sm border border-white/10 bg-dark-purple/40"
                />
              ))}
            </div>
          ) : listQuery.isError ? (
            <NeonCard variant="magenta" className="text-center">
              <p className="font-mono text-sm text-red-300">
                Could not load listings. Please try again shortly.
              </p>
              <button
                type="button"
                onClick={() => listQuery.refetch()}
                className="mt-4 rounded-sm border border-neon-cyan/60 px-4 py-2 font-mono text-xs uppercase tracking-widest text-neon-cyan hover:bg-neon-cyan/10"
              >
                Retry
              </button>
            </NeonCard>
          ) : publicListings.length === 0 ? (
            <NeonCard variant="cyan" className="text-center">
              <p className="font-mono text-white/70">
                {hasActiveFilters
                  ? "No listings match your filters yet."
                  : "No open listings yet. Be the first to post one."}
              </p>
            </NeonCard>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {publicListings.map(listing => (
                <TeamFinderListingCard
                  key={listing.id}
                  listing={listing}
                  isAdmin={isAdmin}
                  onReport={hasDiscordIdentity ? setReportTarget : undefined}
                  onToggleHidden={isAdmin ? handleToggleHidden : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create / edit dialog */}
      {formOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 py-10"
          role="dialog"
          aria-modal="true"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-2xl rounded-sm border-2 border-neon-magenta/60 bg-dark-purple/95 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-mono text-xl font-bold uppercase text-neon-magenta">
                {editing ? "Edit listing" : "New listing"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-white/50 hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <TeamFinderForm
              mode={editing ? "edit" : "create"}
              initial={editing ?? undefined}
              submitting={submitting}
              formError={formError}
              fieldErrors={fieldErrors}
              discordUsername={user?.discordUsername ?? null}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      ) : null}

      {/* Report dialog */}
      <ReportListingDialog
        open={reportTarget != null}
        submitting={reportMutation.isPending}
        error={reportError}
        onClose={() => {
          setReportTarget(null);
          setReportError(null);
        }}
        onSubmit={handleReport}
      />
    </div>
  );
}
