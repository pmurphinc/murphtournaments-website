import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";

const MIN_NAME = 2;
const MAX_NAME = 64;

type Mode = "existing" | "new";

export default function TeamClaimLink() {
  const params = useParams<{ token: string }>();
  const auth = useAuth();
  const token = params.token ?? "";
  const signedIn = Boolean(auth.user);

  const preview = trpc.tournamentControl.getTeamClaimLinkPreview.useQuery(
    { token },
    { enabled: Boolean(token), retry: false }
  );
  // Only once they are signed in, which claiming requires anyway — so the
  // server already knows which teams are theirs.
  const claimable = trpc.tournamentControl.listClaimableTeams.useQuery(
    { token },
    { enabled: Boolean(token) && signedIn, retry: false }
  );
  const accept = trpc.tournamentControl.acceptTeamClaimLink.useMutation();

  const myTeams = claimable.data?.teams ?? [];
  const selectable = myTeams.filter(team => !team.alreadyEntered);
  const hasChoice = myTeams.length > 0;

  // Null until they pick. With one of their own teams on the line, nothing
  // is preselected: entering the wrong team commits everyone on it.
  const [mode, setMode] = useState<Mode | null>(null);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [typedName, setTypedName] = useState<string | null>(null);

  // No teams yet means there is nothing to choose between, so creating one
  // is simply what claiming does.
  const effectiveMode: Mode | null = hasChoice ? mode : "new";

  const name = typedName ?? preview.data?.teamName ?? "";
  const trimmed = name.trim();
  const nameValid = trimmed.length >= MIN_NAME && trimmed.length <= MAX_NAME;
  const claimed = Boolean(accept.data?.success);

  const ready =
    effectiveMode === "new"
      ? nameValid
      : effectiveMode === "existing" && existingId !== null;

  const pickExisting = (id: number) => {
    setMode("existing");
    setExistingId(id);
  };

  const submit = () => {
    if (effectiveMode === "existing" && existingId !== null) {
      accept.mutate({ token, existingTeamId: existingId });
    } else if (effectiveMode === "new") {
      accept.mutate({ token, name: trimmed });
    }
  };

  const chosenTeamName =
    myTeams.find(team => team.id === existingId)?.name ?? trimmed;

  const rowClass = (alreadyEntered: boolean) =>
    alreadyEntered
      ? "flex items-center gap-3 rounded border px-3 py-2 cursor-not-allowed border-white/10 text-white/35"
      : "flex items-center gap-3 rounded border px-3 py-2 cursor-pointer border-white/20 text-white hover:border-neon-gold/50";

  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">
          Team Ownership Claim
        </p>

        {preview.isLoading ? (
          <h1 className="mt-3 font-mono text-2xl font-black">Loading…</h1>
        ) : preview.error ? (
          <p className="mt-3 text-red-200">{preview.error.message}</p>
        ) : (
          preview.data && (
            <>
              <h1 className="mt-3 font-mono text-2xl font-black text-white">
                Claim {preview.data.teamName}
              </h1>
              <p className="mt-2 text-white/60">
                Tournament: {preview.data.tournamentName}
              </p>
              {!preview.data.active && (
                <p className="mt-3 rounded border border-red-400/30 bg-red-950/40 p-3 text-red-100">
                  This claim link is not active.
                </p>
              )}
            </>
          )
        )}

        {signedIn && preview.data?.active && !claimed && (
          <div className="mt-6 space-y-5">
            {hasChoice && (
              <fieldset>
                <legend className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">
                  Which team is this?
                </legend>

                <div className="mt-3 space-y-2">
                  {myTeams.map(team => (
                    <label
                      key={team.id}
                      className={rowClass(team.alreadyEntered)}
                    >
                      <input
                        type="radio"
                        name="claim-team"
                        disabled={team.alreadyEntered || accept.isPending}
                        checked={
                          effectiveMode === "existing" && existingId === team.id
                        }
                        onChange={() => pickExisting(team.id)}
                      />
                      <span className="font-mono text-sm">{team.name}</span>
                      {team.alreadyEntered && (
                        <span className="text-xs">
                          already in this tournament
                        </span>
                      )}
                    </label>
                  ))}

                  <label className="flex cursor-pointer items-center gap-3 rounded border border-white/20 px-3 py-2 text-white hover:border-neon-gold/50">
                    <input
                      type="radio"
                      name="claim-team"
                      disabled={accept.isPending}
                      checked={effectiveMode === "new"}
                      onChange={() => setMode("new")}
                    />
                    <span className="font-mono text-sm">Create a new team</span>
                  </label>
                </div>

                {selectable.length === 0 && (
                  <p className="mt-2 text-sm text-amber-200">
                    Every team you captain is already in this tournament, so
                    this slot needs a new one.
                  </p>
                )}
              </fieldset>
            )}

            {effectiveMode === "new" && (
              <div>
                <label
                  className="font-mono text-xs uppercase tracking-[0.2em] text-white/70"
                  htmlFor="claim-team-name"
                >
                  Team name
                </label>
                <input
                  id="claim-team-name"
                  className="mt-2 w-full rounded border border-white/20 bg-black px-3 py-2 font-mono text-white outline-none focus:border-neon-gold/70"
                  value={name}
                  maxLength={MAX_NAME}
                  disabled={accept.isPending}
                  onChange={event => setTypedName(event.target.value)}
                />
                <p className="mt-2 text-sm text-white/50">
                  Your team shows under this name in every tournament you enter.
                  You can rename it later from Team Management.
                </p>
                {!nameValid && (
                  <p className="mt-2 text-sm text-amber-200">
                    Use between {MIN_NAME} and {MAX_NAME} characters.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!signedIn ? (
          <a
            className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white"
            href={getDiscordLoginUrl()}
          >
            Sign in with Discord
          </a>
        ) : (
          <Button
            className="mt-6 border border-[#FFD700] bg-[#FFD700] font-mono font-black uppercase text-black hover:bg-[#D4AF37]"
            disabled={
              !preview.data?.active ||
              claimable.isLoading ||
              !ready ||
              accept.isPending ||
              claimed
            }
            onClick={submit}
          >
            {claimed
              ? "Claimed"
              : accept.isPending
                ? "Claiming…"
                : "Confirm Claim"}
          </Button>
        )}

        {accept.error && (
          <p className="mt-3 text-red-200">{accept.error.message}</p>
        )}
        {claimed && (
          <p className="mt-3 text-emerald-200">
            Claimed as {chosenTeamName}. You are now the captain of this slot.
          </p>
        )}
      </div>
    </section>
  );
}
