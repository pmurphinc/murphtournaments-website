import { Fragment, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";

const goldButtonClass =
  "border border-[var(--mt-gold)] bg-[var(--mt-gold)] px-5 font-mono font-black uppercase tracking-wider text-[var(--mt-gold-foreground)] hover:bg-[var(--mt-gold-bright)] hover:text-[var(--mt-gold-foreground)]";

const outlineButtonClass =
  "border-[var(--mt-steel-line)] text-[var(--mt-off-white)] hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)]";

const menuContentClass =
  "border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]";

const menuItemClass =
  "cursor-pointer focus:bg-[var(--mt-gold)]/15 focus:text-[var(--mt-gold-bright)]";

const menuLabelClass =
  "font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]";

const alphaBadge = (
  <span
    className="inline-flex rounded-full border border-[var(--mt-gold)]/60 bg-[var(--mt-gold)]/10 px-2.5 py-1 align-middle font-mono text-xs font-black uppercase tracking-[0.22em] text-[var(--mt-gold-bright)]"
    title="Tournament Control Room is a work in progress"
  >
    ALPHA
  </span>
);

type CardOwner = {
  name: string | null;
  discordDisplayName: string | null;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
} | null;

/** Creator's Discord avatar, with a lettered fallback when none is set. */
function CreatorAvatar({ owner }: { owner: CardOwner }) {
  const creatorName =
    owner?.discordDisplayName ||
    owner?.discordUsername ||
    owner?.name ||
    "Unassigned";
  const label = `Created by ${creatorName}`;
  if (owner?.discordAvatarUrl)
    return (
      <img
        src={owner.discordAvatarUrl}
        alt={label}
        title={label}
        referrerPolicy="no-referrer"
        className="h-10 w-10 shrink-0 rounded-full border border-[var(--mt-gold)]/40 bg-[var(--mt-black)]/60 object-cover"
      />
    );
  return (
    <span
      title={label}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 font-mono text-sm font-bold text-[var(--mt-muted)]"
    >
      {creatorName.charAt(0).toUpperCase()}
    </span>
  );
}

export default function TournamentControlIndex() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [reviewTournamentId, setReviewTournamentId] = useState<number | null>(null);
  const [activeRejectSubmissionId, setActiveRejectSubmissionId] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ id: number; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const query = trpc.tournamentControl.listTournaments.useQuery(undefined, {
    enabled: auth.user?.loginMethod === "discord",
    retry: false,
  });
  const templatesQuery = trpc.tournamentControl.listTemplates.useQuery(undefined, { enabled: auth.user?.loginMethod === "discord", retry: false });
  const ownersQuery = trpc.tournamentControl.listOwnerCandidates.useQuery(undefined, { enabled: auth.user?.loginMethod === "discord", retry: false });
  const submissionsQuery = trpc.tournamentControl.listTeamSubmissions.useQuery(undefined, { enabled: auth.user?.loginMethod === "discord", retry: false });
  const toggleRegistration = trpc.tournamentControl.setTournamentRegistrationOpen.useMutation({ onSuccess: () => utils.tournamentControl.listTournaments.invalidate() });
  const approveSubmission = trpc.tournamentControl.approveTeamSubmission.useMutation({ onSuccess: async data => { await utils.tournamentControl.listTeamSubmissions.invalidate(); await utils.tournamentControl.get.invalidate({ tournamentId: data.tournament.id }); } });
  const rejectSubmission = trpc.tournamentControl.rejectTeamSubmission.useMutation({ onSuccess: () => { setActiveRejectSubmissionId(null); setRejectionNote(""); return utils.tournamentControl.listTeamSubmissions.invalidate(); } });
  const renameTournament = trpc.tournamentControl.renameTournament.useMutation({ onSuccess: async () => { setRenameTarget(null); await utils.tournamentControl.listTournaments.invalidate(); } });
  const setTournamentOwner = trpc.tournamentControl.setTournamentOwner.useMutation({ onSuccess: () => utils.tournamentControl.listTournaments.invalidate() });
  const deleteTournament = trpc.tournamentControl.deleteTournament.useMutation({ onSuccess: async () => { setDeleteTarget(null); await utils.tournamentControl.listTournaments.invalidate(); } });
  const createFromTemplate = trpc.tournamentControl.createTournamentFromTemplate.useMutation({
    onSuccess: async data => {
      await utils.tournamentControl.listTournaments.invalidate();
      navigate(`/admin/tournaments/${data.createdTournament.id}/control`);
    },
  });
  const createTournament = trpc.tournamentControl.createTournament.useMutation({
    onSuccess: async data => {
      setCreateOpen(false);
      setName("");
      setEventNote("");
      await utils.tournamentControl.listTournaments.invalidate();
      navigate(`/admin/tournaments/${data.createdTournament.id}/control`);
    },
  });

  if (auth.loading) return <IndexState title="Authenticating organizer…" />;
  if (!auth.user)
    return (
      <IndexState
        title="Organizer Discord sign-in required"
        description="Sign in with Discord to open Tournament Control Room tools."
        showDiscordSignIn
      />
    );
  if (auth.user.loginMethod !== "discord")
    return (
      <IndexState
        title="Organizer Discord sign-in required"
        description="Tournament Control uses Discord identity. Sign in with Discord to continue."
        showDiscordSignIn
      />
    );
  if (query.isLoading)
    return <IndexState title="Verifying Discord organizer roles…" />;
  if (query.error)
    return (
      <IndexState
        title={
          query.error.message.includes("configuration")
            ? "Discord role configuration error"
            : query.error.message.includes("Unable to verify")
              ? "Discord service verification failed"
              : "MTC Discord TCR role required"
        }
        description={query.error.message}
      />
    );

  const tournaments = query.data ?? [];
  const term = search.trim().toLowerCase();
  const visibleTournaments = term
    ? tournaments.filter(tournament =>
        tournament.name.toLowerCase().includes(term)
      )
    : tournaments;
  // Live rooms first, then upcoming; finished tournaments sink into their
  // own section at the bottom. Newest first within each group.
  const statusRank: Record<string, number> = {
    live: 0,
    "not-live": 1,
    complete: 2,
  };
  const byStatusThenNewest = (
    a: (typeof visibleTournaments)[number],
    b: (typeof visibleTournaments)[number]
  ) =>
    (statusRank[a.eventStatus] ?? 1) - (statusRank[b.eventStatus] ?? 1) ||
    b.id - a.id;
  const activeTournaments = visibleTournaments
    .filter(tournament => tournament.eventStatus !== "complete")
    .sort(byStatusThenNewest);
  const finishedTournaments = visibleTournaments
    .filter(tournament => tournament.eventStatus === "complete")
    .sort(byStatusThenNewest);
  const orderedTournaments = [...activeTournaments, ...finishedTournaments];
  const canSubmit = name.trim().length >= 2 && !createTournament.isPending;
  const ownerName = (owner?: { id: number | null; discordDisplayName?: string | null; discordUsername?: string | null; name?: string | null } | null) => owner ? (owner.discordDisplayName || owner.discordUsername || owner.name || `User #${owner.id}`) : "Unassigned";

  return (
    <section className="min-h-screen bg-[var(--mt-black)] px-6 py-12 text-[var(--mt-off-white)]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--mt-gold-bright)]">
              Admin
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-4xl font-black uppercase">
                MTC Discord TCR
              </h1>
              {alphaBadge}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-[var(--mt-muted)]">
              Create and enter Discord-protected control rooms for live
              tournament operations.
            </p>
          </div>
          <Button className={goldButtonClass} onClick={() => setCreateOpen(true)}>
            Create Tournament
          </Button>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-b border-[var(--mt-steel-line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-mono text-sm uppercase tracking-[0.28em] text-[var(--mt-muted)]">
            Control Rooms
            <span className="ml-2 text-[var(--mt-gold-bright)]">
              {tournaments.length}
            </span>
          </h2>
          {tournaments.length > 0 && (
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Filter by name…"
              aria-label="Filter tournaments by name"
              className="h-9 w-full border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)] sm:w-64"
            />
          )}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {orderedTournaments.map(tournament => {
            const pendingCount = submissionsQuery.data?.filter(submission => submission.tournamentId === tournament.id && submission.status === "pending").length ?? 0;
            const isFinished = tournament.eventStatus === "complete";
            const startsFinishedSection =
              isFinished && tournament.id === finishedTournaments[0]?.id;
            return (
            <Fragment key={tournament.id}>
            {startsFinishedSection && (
              <h3 className="mt-4 font-mono text-sm uppercase tracking-[0.28em] text-[var(--mt-muted)] md:col-span-2">
                Finished
                <span className="ml-2 text-[var(--mt-gold-bright)]">
                  {finishedTournaments.length}
                </span>
              </h3>
            )}
            <div
              className={`rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-5 transition hover:border-[var(--mt-gold)] ${isFinished ? "opacity-75" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <CreatorAvatar owner={tournament.owner} />
                <Link href={`/admin/tournaments/${tournament.id}/control`} className="min-w-0">
                  <h2 className="font-mono text-xl font-bold text-[var(--mt-gold-bright)]">{tournament.name}</h2>
                </Link>
              </div>
              <p className="mt-2 text-sm text-[var(--mt-muted)]">
                {tournament.eventStatus === "live" && (
                  <span
                    className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400 align-middle"
                    aria-hidden
                  />
                )}
                {tournament.eventStatus} · {tournament.currentStage}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs uppercase">
                <span className={`rounded-full border px-3 py-1 ${tournament.registrationOpen === 1 ? "border-emerald-400/40 text-emerald-200" : "border-[var(--mt-steel-line)] text-[var(--mt-muted)]"}`}>Registration {tournament.registrationOpen === 1 ? "open" : "closed"}</span>
                {pendingCount > 0 && <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-200">{pendingCount} pending approval{pendingCount === 1 ? "" : "s"}</span>}
              </div>
              {tournament.eventNote && <p className="mt-3 line-clamp-2 text-sm text-[var(--mt-muted)]">{tournament.eventNote}</p>}
              <div className="mt-4">
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--mt-muted)]">Owner</label>
                <select className="w-full rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 px-2 py-1 text-sm text-[var(--mt-off-white)]" value={tournament.ownerUserId ?? ""} onChange={event => setTournamentOwner.mutate({ tournamentId: tournament.id, ownerUserId: event.target.value ? Number(event.target.value) : null })}>
                  <option value="">Clear Owner / Unassigned</option>
                  {(ownersQuery.data ?? []).map(owner => <option key={owner.id} value={owner.id}>{ownerName(owner)}</option>)}
                </select>
                <p className="mt-1 text-xs text-[var(--mt-muted)]">Current: {ownerName(tournament.owner)}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--mt-steel-line)]/60 pt-4">
                <Button asChild className={goldButtonClass}><Link href={`/admin/tournaments/${tournament.id}/control`}>Open Room</Link></Button>
                <Button variant="outline" className={outlineButtonClass} onClick={() => setReviewTournamentId(tournament.id)}>
                  Team Approvals
                  {pendingCount > 0 && <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 font-mono text-xs text-amber-200">{pendingCount}</span>}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" aria-label={`Manage ${tournament.name}`} className={`${outlineButtonClass} px-3`}>⋯</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className={menuContentClass}>
                    <DropdownMenuLabel className={menuLabelClass}>Registration</DropdownMenuLabel>
                    <DropdownMenuItem className={menuItemClass} onSelect={() => toggleRegistration.mutate({ tournamentId: tournament.id, registrationOpen: tournament.registrationOpen !== 1 })}>{tournament.registrationOpen === 1 ? "Close registration" : "Open registration"}</DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[var(--mt-steel-line)]" />
                    <DropdownMenuItem className={menuItemClass} onSelect={() => { setRenameTarget({ id: tournament.id, name: tournament.name }); setRenameValue(tournament.name); }}>Rename</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-red-300 focus:bg-red-500/15 focus:text-red-200" onSelect={() => setDeleteTarget({ id: tournament.id, name: tournament.name })}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            </Fragment>
          );})}
          {tournaments.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-dashed border-[var(--mt-gold)]/30 bg-[var(--mt-charcoal)]/70 p-8 text-center">
              <h2 className="font-mono text-2xl font-black text-[var(--mt-gold-bright)]">
                No control-room tournaments yet.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--mt-muted)]">
                Create the first database-backed tournament to unlock the
                control room canvas for teams, lobbies, and final-round matches.
              </p>
              <Button
                className={`mt-6 ${goldButtonClass}`}
                onClick={() => setCreateOpen(true)}
              >
                Create Tournament
              </Button>
            </div>
          )}
          {tournaments.length > 0 && visibleTournaments.length === 0 && (
            <p className="md:col-span-2 rounded-lg border border-dashed border-[var(--mt-steel-line)] p-8 text-center text-sm text-[var(--mt-muted)]">
              No tournaments match “{search.trim()}”.
            </p>
          )}
        </div>
        <div className="mt-12 border-t border-[var(--mt-steel-line)] pt-8">
          <h2 className="font-mono text-sm uppercase tracking-[0.28em] text-[var(--mt-muted)]">Create from Template</h2>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">Reuse a saved control-room layout without private lobby codes or assigned teams.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(templatesQuery.data ?? []).map(template => (
              <div key={template.id} className="flex items-center justify-between gap-3 rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-4">
                <div className="min-w-0">
                  <p className="truncate font-mono font-bold text-[var(--mt-off-white)]">{template.name}</p>
                  <p className="mt-1 font-mono text-xs uppercase text-[var(--mt-muted)]">{template.visibility}</p>
                </div>
                <Button variant="outline" className={`${outlineButtonClass} shrink-0`} disabled={createFromTemplate.isPending} onClick={() => { const name = window.prompt("New tournament name", `${template.name} Tournament`); if (name) createFromTemplate.mutate({ templateId: template.id, name }); }}>Use Template</Button>
              </div>
            ))}
            {templatesQuery.data?.length === 0 && <p className="text-sm text-[var(--mt-muted)]">No templates saved yet.</p>}
          </div>
        </div>
      </div>

      <Dialog open={renameTarget !== null} onOpenChange={open => !open && setRenameTarget(null)}>
        <DialogContent className="border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader><DialogTitle className="font-mono text-[var(--mt-gold-bright)]">Rename Tournament</DialogTitle><DialogDescription>Update the control-room display name. URLs continue to use the tournament ID.</DialogDescription></DialogHeader>
          <Input value={renameValue} onChange={event => setRenameValue(event.target.value)} maxLength={255} className="border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]" />
          <DialogFooter><Button variant="outline" className={outlineButtonClass} onClick={() => setRenameTarget(null)}>Cancel</Button><Button className={goldButtonClass} disabled={renameValue.trim().length < 2 || renameTournament.isPending || !renameTarget} onClick={() => renameTarget && renameTournament.mutate({ tournamentId: renameTarget.id, name: renameValue })}>Save Name</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="border-red-400/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader><DialogTitle className="font-mono text-red-200">Delete Tournament</DialogTitle><DialogDescription>This removes the tournament and control-room data. Saved templates are kept.</DialogDescription></DialogHeader>
          <p className="text-sm text-[var(--mt-muted)]">Delete <span className="font-bold text-[var(--mt-off-white)]">{deleteTarget?.name}</span>?</p>
          <DialogFooter><Button variant="outline" className={outlineButtonClass} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="destructive" disabled={!deleteTarget || deleteTournament.isPending} onClick={() => deleteTarget && deleteTournament.mutate({ tournamentId: deleteTarget.id })}>Delete Tournament</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reviewTournamentId !== null} onOpenChange={open => !open && setReviewTournamentId(null)}>
        <DialogContent className="max-w-3xl border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader><DialogTitle className="font-mono text-[var(--mt-gold-bright)]">Team Approvals</DialogTitle><DialogDescription>Approve managed team submissions into Tournament Control snapshots.</DialogDescription></DialogHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {(submissionsQuery.data?.filter(submission => submission.tournamentId === reviewTournamentId) ?? []).map(submission => (
              <div key={submission.id} className="rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-mono text-lg font-bold text-[var(--mt-gold-bright)]">{submission.managedTeam.name}</h3><p className="text-sm text-[var(--mt-muted)]">Captain: {submission.captain.discordDisplayName || submission.captain.discordUsername || submission.captain.name || "Discord user"}</p><p className="mt-1 font-mono text-xs uppercase text-[var(--mt-muted)]">{submission.status}</p></div>{submission.status === "pending" ? <div className="flex gap-2">{activeRejectSubmissionId === submission.id ? <><Button size="sm" variant="destructive" onClick={() => rejectSubmission.mutate({ submissionId: submission.id, adminNote: rejectionNote.trim() || null })}>Confirm Rejection</Button><Button size="sm" variant="outline" className={outlineButtonClass} onClick={() => { setActiveRejectSubmissionId(null); setRejectionNote(""); }}>Cancel</Button></> : <><Button size="sm" className={goldButtonClass} onClick={() => approveSubmission.mutate({ submissionId: submission.id })}>Approve</Button><Button size="sm" variant="destructive" onClick={() => { setActiveRejectSubmissionId(submission.id); setRejectionNote(""); }}>Reject</Button></>}</div> : null}</div>
                <p className="mt-3 text-xs uppercase tracking-widest text-[var(--mt-muted)]">Roster</p><div className="mt-2 flex flex-wrap gap-2">{submission.roster.map(row => <span key={row.userId} className="rounded-full border border-[var(--mt-steel-line)] px-3 py-1 text-xs text-[var(--mt-muted)]">{row.user.discordDisplayName || row.user.discordUsername || row.user.name || "Discord user"}{row.role === "captain" ? " · Captain" : ""}</span>)}</div>
                {submission.status === "pending" && activeRejectSubmissionId === submission.id ? <Textarea className="mt-3 border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]" placeholder="Optional admin note for rejection" value={rejectionNote} onChange={event => setRejectionNote(event.target.value)} /> : null}
                {submission.status === "rejected" && submission.adminNote ? <p className="mt-3 rounded border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-100">Admin note: {submission.adminNote}</p> : null}
              </div>
            ))}
            {!(submissionsQuery.data?.some(submission => submission.tournamentId === reviewTournamentId)) && <p className="rounded border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/40 p-4 text-sm text-[var(--mt-muted)]">No team submissions for this tournament yet.</p>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader>
            <DialogTitle className="font-mono text-[var(--mt-gold-bright)]">
              Create Tournament
            </DialogTitle>
            <DialogDescription>
              Start a new Tournament Control room with safe defaults. You can
              update live status from the room later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
                Tournament name
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={255}
                placeholder="June 2026 Championship"
                className="border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]">
                Event note (optional)
              </label>
              <Textarea
                value={eventNote}
                onChange={e => setEventNote(e.target.value)}
                maxLength={2000}
                placeholder="Awaiting check-in…"
                className="border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]"
              />
            </div>
            {createTournament.error && (
              <p className="rounded border border-red-400/30 bg-red-950/40 p-3 text-sm text-red-200">
                {createTournament.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              className={goldButtonClass}
              onClick={() =>
                createTournament.mutate({
                  name,
                  eventNote: eventNote.trim() ? eventNote : null,
                })
              }
            >
              {createTournament.isPending ? "Creating…" : "Create Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function IndexState({
  title,
  description,
  showDiscordSignIn,
}: {
  title: string;
  description?: string;
  showDiscordSignIn?: boolean;
}) {
  return (
    <section className="min-h-screen bg-[var(--mt-black)] px-6 py-20 text-[var(--mt-off-white)]">
      <div className="mx-auto max-w-xl rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-8">
        <h1 className="font-mono text-2xl font-black text-[var(--mt-gold-bright)]">
          {title}
        </h1>
        {description && <p className="mt-3 text-[var(--mt-muted)]">{description}</p>}
        {showDiscordSignIn && (
          <a
            href={getDiscordLoginUrl()}
            className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-[var(--mt-gold)]"
          >
            Sign in with Discord
          </a>
        )}
      </div>
    </section>
  );
}
