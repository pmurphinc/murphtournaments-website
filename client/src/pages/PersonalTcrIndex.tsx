import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { getSafeTournamentControlErrorMessage } from "@/lib/tcrError";
import { TcrTemplateBrowser } from "./TcrTemplates";

const goldButtonClass =
  "border border-[#FFD700] bg-[#FFD700] px-5 font-mono font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.28)] hover:bg-[#D4AF37] hover:text-black";

const alphaBadge = (
  <span
    className="inline-flex rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-2.5 py-1 align-middle font-mono text-xs font-black uppercase tracking-[0.22em] text-[#FFD700] shadow-[0_0_14px_rgba(255,215,0,0.18)]"
    title="Tournament Control Room is a work in progress"
  >
    ALPHA
  </span>
);

type Visibility = "private" | "public";

export default function PersonalTcrIndex() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [renameTarget, setRenameTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const query = trpc.personalTcr.listTournaments.useQuery(undefined, {
    enabled: auth.user?.loginMethod === "discord",
    retry: false,
  });
  const submissionsQuery = trpc.personalTcr.listTeamSubmissions.useQuery(
    undefined,
    { enabled: auth.user?.loginMethod === "discord", retry: false }
  );
  const createTournament = trpc.personalTcr.createTournament.useMutation({
    onSuccess: data => {
      setCreateOpen(false);
      void utils.personalTcr.listTournaments.invalidate();
      navigate(`/TCR/${data.createdTournament.id}`);
    },
  });
  const renameTournament = trpc.personalTcr.renameTournament.useMutation({
    onSuccess: () => {
      setRenameTarget(null);
      void utils.personalTcr.listTournaments.invalidate();
    },
  });
  const deleteTournament = trpc.personalTcr.deleteTournament.useMutation({
    onSuccess: () => void utils.personalTcr.listTournaments.invalidate(),
  });
  const toggleRegistration =
    trpc.personalTcr.setTournamentRegistrationOpen.useMutation({
      onSuccess: () => void utils.personalTcr.listTournaments.invalidate(),
    });
  const setTournamentVisibility =
    trpc.personalTcr.setTournamentVisibility.useMutation({
      onSuccess: () => void utils.personalTcr.listTournaments.invalidate(),
    });
  const publishTournament = trpc.personalTcr.publishTournament.useMutation({
    onSuccess: () => void utils.personalTcr.listTournaments.invalidate(),
  });
  const viewerLink = trpc.personalTcr.enableViewerLink.useMutation();

  const copyText = async (value: string) =>
    navigator.clipboard?.writeText(
      new URL(value, window.location.origin).toString()
    );

  if (auth.loading) return <State title="Loading TCR…" />;
  if (!auth.user || auth.user.loginMethod !== "discord")
    return (
      <State
        title="Discord sign-in required"
        description="Sign in with Discord to create and manage your Tournament Control Rooms."
        showDiscordSignIn
      />
    );
  if (query.isLoading)
    return <State title="Loading your Tournament Control Rooms…" />;
  if (query.error)
    return (
      <State
        title="TCR unavailable"
        description={getSafeTournamentControlErrorMessage(query.error.message)}
      />
    );

  return (
    <section className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
              Tournament Organizer
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-4xl font-black uppercase">
                Tournament Control Rooms
              </h1>
              {alphaBadge}
            </div>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Create and manage your own tournaments with Discord sign-in.
            </p>
            <p className="mt-2 text-xs text-white/45">
              Signed in as{" "}
              {auth.user.discordDisplayName ||
                auth.user.discordUsername ||
                auth.user.name ||
                "Discord user"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              asChild
            >
              <Link href="/TCR/templates">Manage Templates</Link>
            </Button>
            <Button
              className={goldButtonClass}
              onClick={() => setCreateOpen(true)}
            >
              Create Tournament
            </Button>
          </div>
        </div>
        <div className="mt-8">
          <TcrTemplateBrowser compact />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(query.data ?? []).map(tournament => {
            const pendingCount =
              submissionsQuery.data?.filter(
                submission =>
                  submission.tournamentId === tournament.id &&
                  submission.status === "pending"
              ).length ?? 0;
            const publicUrl = tournament.publicSlug
              ? `/tournaments/community/${tournament.publicSlug}`
              : null;
            return (
              <div
                key={tournament.id}
                className="rounded-lg border border-neon-gold/30 bg-zinc-950 p-5"
              >
                <h2 className="font-mono text-xl font-bold text-neon-gold">
                  <Link
                    href={`/TCR/${tournament.id}`}
                    className="rounded outline-none transition hover:text-[#FFD700] hover:underline focus-visible:ring-2 focus-visible:ring-[#FFD700] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    {tournament.name}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {tournament.eventStatus} · {tournament.currentStage}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono uppercase">
                  <span className="rounded-full border border-white/15 px-3 py-1 text-white/60">
                    {tournament.visibility}
                  </span>
                  <span className="rounded-full border border-neon-gold/30 px-3 py-1 text-neon-gold/80">
                    {tournament.staffRole === "collaborator"
                      ? "Collaborator"
                      : "Owner"}
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-white/60">
                    {tournament.publishedAt ? "Published" : "Unpublished"}
                  </span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-white/60">
                    Registration{" "}
                    {tournament.registrationOpen === 1 ? "open" : "closed"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/60">
                  {pendingCount} pending team approval
                  {pendingCount === 1 ? "" : "s"}
                </p>
                {tournament.eventNote && (
                  <p className="mt-3 line-clamp-2 text-sm text-white/45">
                    {tournament.eventNote}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild className={goldButtonClass}>
                    <Link href={`/TCR/${tournament.id}`}>
                      Open Control Room
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() =>
                      toggleRegistration.mutate({
                        tournamentId: tournament.id,
                        registrationOpen: tournament.registrationOpen !== 1,
                      })
                    }
                  >
                    {tournament.registrationOpen === 1
                      ? "Close Registration"
                      : "Open Registration"}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() =>
                      setTournamentVisibility.mutate({
                        tournamentId: tournament.id,
                        visibility:
                          tournament.visibility === "public"
                            ? "private"
                            : "public",
                      })
                    }
                  >
                    Make{" "}
                    {tournament.visibility === "public" ? "Private" : "Public"}
                  </Button>
                  {tournament.visibility === "public" && (
                    <Button
                      variant="outline"
                      className="border-white/20 text-white"
                      onClick={() =>
                        publishTournament.mutate({
                          tournamentId: tournament.id,
                          publish: !tournament.publishedAt,
                        })
                      }
                    >
                      {tournament.publishedAt ? "Unpublish" : "Publish"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => {
                      void utils.personalTcr.getPrivateInviteLink
                        .fetch({ tournamentId: tournament.id })
                        .then(data => copyText(data.url));
                    }}
                  >
                    Copy Invite Link
                  </Button>
                  {publicUrl && (
                    <Button
                      variant="outline"
                      className="border-white/20 text-white"
                      onClick={() => void copyText(publicUrl)}
                    >
                      Copy Public Link
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() =>
                      viewerLink.mutate(
                        { tournamentId: tournament.id },
                        { onSuccess: data => void copyText(data.url) }
                      )
                    }
                  >
                    Copy Viewer Link
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                    onClick={() => {
                      setRenameTarget({
                        id: tournament.id,
                        name: tournament.name,
                      });
                      setRenameValue(tournament.name);
                    }}
                  >
                    Rename
                  </Button>
                  {tournament.staffRole !== "collaborator" && (
                    <Button
                      variant="destructive"
                      onClick={() =>
                        window.confirm(`Delete ${tournament.name}?`) &&
                        deleteTournament.mutate({ tournamentId: tournament.id })
                      }
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {query.data?.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-dashed border-neon-gold/30 bg-zinc-950/70 p-8 text-center">
              <h2 className="font-mono text-2xl font-black text-neon-gold">
                No personal tournaments yet.
              </h2>
              <p className="mt-3 text-sm text-white/60">
                Create your first private TCR and invite teams when ready.
              </p>
            </div>
          )}
        </div>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-neon-gold/40 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-neon-gold">
              Create Tournament
            </DialogTitle>
            <DialogDescription>
              Private is the safe default. Public tournaments remain unpublished
              until you publish them.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Tournament name"
            className="border-white/15 bg-black/60 text-white"
          />
          <Textarea
            value={eventNote}
            onChange={event => setEventNote(event.target.value)}
            placeholder="Event note (optional)"
            className="border-white/15 bg-black/60 text-white"
          />
          <select
            className="rounded border border-white/15 bg-black/60 px-3 py-2 text-white"
            value={visibility}
            onChange={event => setVisibility(event.target.value as Visibility)}
          >
            <option value="private">Private</option>
            <option value="public">Public (unpublished)</option>
          </select>
          {createTournament.error && (
            <p className="text-sm text-red-200">
              {createTournament.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className={goldButtonClass}
              disabled={name.trim().length < 2 || createTournament.isPending}
              onClick={() =>
                createTournament.mutate({
                  name,
                  eventNote: eventNote.trim() || null,
                  visibility,
                })
              }
            >
              Create Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={renameTarget !== null}
        onOpenChange={open => !open && setRenameTarget(null)}
      >
        <DialogContent className="border-neon-gold/40 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-neon-gold">
              Rename Tournament
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={event => setRenameValue(event.target.value)}
            className="border-white/15 bg-black/60 text-white"
          />
          <DialogFooter>
            <Button
              className={goldButtonClass}
              disabled={!renameTarget || renameValue.trim().length < 2}
              onClick={() =>
                renameTarget &&
                renameTournament.mutate({
                  tournamentId: renameTarget.id,
                  name: renameValue,
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function State({
  title,
  description,
  showDiscordSignIn,
}: {
  title: string;
  description?: string;
  showDiscordSignIn?: boolean;
}) {
  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <h1 className="font-mono text-2xl font-black text-neon-gold">
          {title}
        </h1>
        {description && <p className="mt-3 text-white/60">{description}</p>}
        {showDiscordSignIn && (
          <a
            href={getDiscordLoginUrl()}
            className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-neon-gold"
          >
            Sign in with Discord
          </a>
        )}
      </div>
    </section>
  );
}
