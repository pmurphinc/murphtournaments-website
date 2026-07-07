import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function TournamentControlIndex() {
  const auth = useAuth({ redirectOnUnauthenticated: true });
  const query = trpc.tournamentControl.listTournaments.useQuery(undefined, { enabled: auth.user?.role === "admin", retry: false });

  if (auth.loading) return <IndexState title="Authenticating organizer…" />;
  if (auth.user?.role !== "admin") return <IndexState title="Admin access required" description="Tournament control rooms are private organizer tools." />;
  if (query.isLoading) return <IndexState title="Loading tournaments…" />;
  if (query.error) return <IndexState title="Could not load tournaments" description={query.error.message} />;

  return <section className="min-h-screen bg-black px-6 py-12 text-white"><div className="mx-auto max-w-5xl"><p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Admin</p><h1 className="mt-2 font-mono text-4xl font-black uppercase">Tournament Control Rooms</h1><div className="mt-8 grid gap-4 md:grid-cols-2">{query.data?.map(tournament => <Link key={tournament.id} href={`/admin/tournaments/${tournament.id}/control`} className="rounded-lg border border-neon-gold/30 bg-zinc-950 p-5 transition hover:border-neon-gold"><h2 className="font-mono text-xl font-bold text-neon-gold">{tournament.name}</h2><p className="mt-2 text-sm text-white/60">{tournament.eventStatus} · {tournament.currentStage}</p></Link>)}{query.data?.length === 0 && <p className="rounded border border-dashed border-white/20 p-6 text-white/60">No tournaments found.</p>}</div></div></section>;
}

function IndexState({ title, description }: { title: string; description?: string }) {
  return <section className="min-h-screen bg-black px-6 py-20 text-white"><div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8"><h1 className="font-mono text-2xl font-black text-neon-gold">{title}</h1>{description && <p className="mt-3 text-white/60">{description}</p>}</div></section>;
}
