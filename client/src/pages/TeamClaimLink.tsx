import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { Button } from "@/components/ui/button";

export default function TeamClaimLink() {
  const params = useParams<{ token: string }>();
  const auth = useAuth();
  const token = params.token ?? "";
  const preview = trpc.tournamentControl.getTeamClaimLinkPreview.useQuery({ token }, { enabled: Boolean(token), retry: false });
  const accept = trpc.tournamentControl.acceptTeamClaimLink.useMutation();

  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Team Ownership Claim</p>
        {preview.isLoading ? <h1 className="mt-3 font-mono text-2xl font-black">Loading…</h1> : preview.error ? <p className="mt-3 text-red-200">{preview.error.message}</p> : preview.data && <><h1 className="mt-3 font-mono text-2xl font-black text-white">Claim {preview.data.teamName}</h1><p className="mt-2 text-white/60">Tournament: {preview.data.tournamentName}</p>{!preview.data.active && <p className="mt-3 rounded border border-red-400/30 bg-red-950/40 p-3 text-red-100">This claim link is not active.</p>}</>}
        {!auth.user ? <a className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white" href={getDiscordLoginUrl()}>Sign in with Discord</a> : <Button className="mt-6 border border-[#FFD700] bg-[#FFD700] font-mono font-black uppercase text-black hover:bg-[#D4AF37]" disabled={!preview.data?.active || accept.isPending || accept.data?.success} onClick={() => accept.mutate({ token })}>{accept.data?.success ? "Claimed" : accept.isPending ? "Claiming…" : "Confirm Claim"}</Button>}
        {accept.error && <p className="mt-3 text-red-200">{accept.error.message}</p>}
        {accept.data?.success && <p className="mt-3 text-emerald-200">Team ownership claimed. You are now the captain.</p>}
      </div>
    </section>
  );
}
