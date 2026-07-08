import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";

export default function TournamentControlIndex() {
  const auth = useAuth();
  const query = trpc.tournamentControl.listTournaments.useQuery(undefined, { enabled: auth.user?.loginMethod === "discord", retry: false });

  if (auth.loading) return <IndexState title="Authenticating organizer…" />;
  if (!auth.user) return <IndexState title="Organizer Discord sign-in required" description="Sign in with Discord to open Tournament Control Room tools." showDiscordSignIn />;
  if (auth.user.loginMethod !== "discord") return <IndexState title="Organizer Discord sign-in required" description="Tournament Control uses Discord identity. Sign in with Discord to continue." showDiscordSignIn />;
  if (query.isLoading) return <IndexState title="Verifying Discord organizer roles…" />;
  if (query.error) return <IndexState title={query.error.message.includes("configuration") ? "Discord role configuration error" : query.error.message.includes("Unable to verify") ? "Discord service verification failed" : "Tournament Control role required"} description={query.error.message} />;

  return <section className="min-h-screen bg-black px-6 py-12 text-white"><div className="mx-auto max-w-5xl"><p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Admin</p><h1 className="mt-2 font-mono text-4xl font-black uppercase">Tournament Control Rooms</h1><div className="mt-8 grid gap-4 md:grid-cols-2">{query.data?.map(tournament => <Link key={tournament.id} href={`/admin/tournaments/${tournament.id}/control`} className="rounded-lg border border-neon-gold/30 bg-zinc-950 p-5 transition hover:border-neon-gold"><h2 className="font-mono text-xl font-bold text-neon-gold">{tournament.name}</h2><p className="mt-2 text-sm text-white/60">{tournament.eventStatus} · {tournament.currentStage}</p></Link>)}{query.data?.length === 0 && <p className="rounded border border-dashed border-white/20 p-6 text-white/60">No tournaments found.</p>}</div></div></section>;
}

function IndexState({ title, description, showDiscordSignIn }: { title: string; description?: string; showDiscordSignIn?: boolean }) {
  return <section className="min-h-screen bg-black px-6 py-20 text-white"><div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8"><h1 className="font-mono text-2xl font-black text-neon-gold">{title}</h1>{description && <p className="mt-3 text-white/60">{description}</p>}{showDiscordSignIn && <a href={getDiscordLoginUrl()} className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-neon-gold">Sign in with Discord</a>}</div></section>;
}
