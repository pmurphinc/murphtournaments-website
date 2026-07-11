import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";

export default function CommunityTournaments() {
  const params = useParams<{ slug?: string }>();
  if (params.slug) return <CommunityTournamentDetail slug={params.slug} />;
  const query = trpc.communityTournaments.list.useQuery();
  return <section className="min-h-screen bg-black px-6 py-12 text-white"><div className="mx-auto max-w-5xl"><p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Community Tournaments</p><h1 className="mt-2 font-mono text-4xl font-black uppercase">Published Tournaments</h1><div className="mt-8 grid gap-4 md:grid-cols-2">{query.data?.map(tournament => <Link key={tournament.id} href={`/tournaments/community/${tournament.publicSlug}`} className="rounded-lg border border-neon-gold/30 bg-zinc-950 p-5 hover:border-neon-gold"><h2 className="font-mono text-xl font-bold text-neon-gold">{tournament.name}</h2><p className="mt-2 text-sm text-white/60">{tournament.eventStatus} · Registration {tournament.registrationOpen === 1 ? "open" : "closed"}</p>{tournament.eventNote && <p className="mt-3 line-clamp-3 text-sm text-white/45">{tournament.eventNote}</p>}</Link>)}{query.data?.length === 0 && <p className="rounded border border-white/10 bg-zinc-950 p-5 text-white/60">No public tournaments are published yet.</p>}</div></div></section>;
}

function CommunityTournamentDetail({ slug }: { slug: string }) {
  const query = trpc.communityTournaments.getBySlug.useQuery({ slug }, { retry: false });
  if (query.isLoading) return <section className="min-h-screen bg-black px-6 py-20 text-white">Loading tournament…</section>;
  if (query.error) return <section className="min-h-screen bg-black px-6 py-20 text-white">{query.error.message}</section>;
  const data = query.data;
  if (!data) return <section className="min-h-screen bg-black px-6 py-20 text-white">Tournament unavailable.</section>;
  return <section className="min-h-screen bg-black px-6 py-12 text-white"><div className="mx-auto max-w-4xl rounded-lg border border-neon-gold/30 bg-zinc-950 p-6"><p className="font-mono text-xs uppercase tracking-[0.35em] text-neon-gold">Tournament</p><h1 className="mt-2 font-mono text-4xl font-black uppercase">{data.tournament.name}</h1><p className="mt-2 text-sm text-white/60">Organizer: {data.organizer?.name ?? "Discord organizer"}</p>{data.tournament.eventNote && <p className="mt-5 text-white/70">{data.tournament.eventNote}</p>}<div className="mt-5 flex flex-wrap gap-2 font-mono text-xs uppercase"><span className="rounded-full border border-white/15 px-3 py-1">{data.tournament.eventStatus}</span><span className="rounded-full border border-white/15 px-3 py-1">Registration {data.tournament.registrationOpen === 1 ? "open" : "closed"}</span><span className="rounded-full border border-white/15 px-3 py-1">{data.approvedTeams.length}{data.tournament.maxTeams ? `/${data.tournament.maxTeams}` : ""} teams</span></div><h2 className="mt-8 font-mono text-xl font-bold text-neon-gold">Approved Teams</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.approvedTeams.map(team => <div key={team.id} className="rounded border border-white/10 bg-black/40 px-3 py-2 text-white/80">{team.name}</div>)}{data.approvedTeams.length === 0 && <p className="text-white/45">No teams approved yet.</p>}</div></div></section>;
}
