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

const goldButtonClass =
  "border border-[#FFD700] bg-[#FFD700] px-5 font-mono font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.28)] hover:bg-[#D4AF37] hover:text-black";

export default function TournamentControlIndex() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventNote, setEventNote] = useState("");
  const query = trpc.tournamentControl.listTournaments.useQuery(undefined, {
    enabled: auth.user?.loginMethod === "discord",
    retry: false,
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
              : "Tournament Control role required"
        }
        description={query.error.message}
      />
    );

  const tournaments = query.data ?? [];
  const canSubmit = name.trim().length >= 2 && !createTournament.isPending;

  return (
    <section className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
              Admin
            </p>
            <h1 className="mt-2 font-mono text-4xl font-black uppercase">
              Tournament Control Rooms
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Create and enter Discord-protected control rooms for live
              tournament operations.
            </p>
          </div>
          <Button className={goldButtonClass} onClick={() => setCreateOpen(true)}>
            Create Tournament
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {tournaments.map(tournament => (
            <Link
              key={tournament.id}
              href={`/admin/tournaments/${tournament.id}/control`}
              className="rounded-lg border border-neon-gold/30 bg-zinc-950 p-5 transition hover:border-neon-gold"
            >
              <h2 className="font-mono text-xl font-bold text-neon-gold">
                {tournament.name}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {tournament.eventStatus} · {tournament.currentStage}
              </p>
              {tournament.eventNote && (
                <p className="mt-3 line-clamp-2 text-sm text-white/45">
                  {tournament.eventNote}
                </p>
              )}
            </Link>
          ))}
          {tournaments.length === 0 && (
            <div className="md:col-span-2 rounded-lg border border-dashed border-neon-gold/30 bg-zinc-950/70 p-8 text-center">
              <h2 className="font-mono text-2xl font-black text-neon-gold">
                No control-room tournaments yet.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-white/60">
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
        </div>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-neon-gold/40 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-neon-gold">
              Create Tournament
            </DialogTitle>
            <DialogDescription>
              Start a new Tournament Control room with safe defaults. You can
              update live status from the room later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/60">
                Tournament name
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={255}
                placeholder="June 2026 Championship"
                className="border-white/15 bg-black/60 text-white"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-white/60">
                Event note (optional)
              </label>
              <Textarea
                value={eventNote}
                onChange={e => setEventNote(e.target.value)}
                maxLength={2000}
                placeholder="Awaiting check-in…"
                className="border-white/15 bg-black/60 text-white"
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
              className="border-white/20 text-white hover:bg-white/10"
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
