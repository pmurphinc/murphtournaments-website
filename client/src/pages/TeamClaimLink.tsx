import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";

const MIN_NAME = 2;
const MAX_NAME = 64;

export default function TeamClaimLink() {
  const params = useParams<{ token: string }>();
  const auth = useAuth();
  const token = params.token ?? "";
  const preview = trpc.tournamentControl.getTeamClaimLinkPreview.useQuery(
    { token },
    { enabled: Boolean(token), retry: false }
  );
  const accept = trpc.tournamentControl.acceptTeamClaimLink.useMutation();

  // Null until the captain types, so the field shows the name the organiser
  // gave the slot ("Team 3") without an effect to seed it, and their own
  // edit wins from the first keystroke.
  const [typedName, setTypedName] = useState<string | null>(null);
  const name = typedName ?? preview.data?.teamName ?? "";
  const trimmed = name.trim();
  const nameValid = trimmed.length >= MIN_NAME && trimmed.length <= MAX_NAME;
  const claimed = Boolean(accept.data?.success);

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

        {auth.user && preview.data?.active && !claimed && (
          <div className="mt-6">
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
              Your team shows under this name in every tournament you enter. You
              can rename it later from Team Management.
            </p>
            {!nameValid && (
              <p className="mt-2 text-sm text-amber-200">
                Use between {MIN_NAME} and {MAX_NAME} characters.
              </p>
            )}
          </div>
        )}

        {!auth.user ? (
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
              !preview.data?.active || !nameValid || accept.isPending || claimed
            }
            onClick={() => accept.mutate({ token, name: trimmed })}
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
            Team ownership claimed. You are now the captain of {trimmed}.
          </p>
        )}
      </div>
    </section>
  );
}
