import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { getSafeTournamentControlErrorMessage } from "@/lib/tcrError";

const goldButtonClass =
  "border border-[#FFD700] bg-[#FFD700] px-5 font-mono font-black uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,215,0,0.28)] hover:bg-[#D4AF37] hover:text-black";

export default function TournamentStaffInviteJoin() {
  const { token = "" } = useParams<{ token: string }>();
  const auth = useAuth();
  const [, navigate] = useLocation();
  const preview = trpc.personalTcr.previewStaffInvite.useQuery(
    { token },
    {
      enabled: auth.user?.loginMethod === "discord" && token.length > 0,
      retry: false,
    }
  );
  const accept = trpc.personalTcr.acceptStaffInvite.useMutation({
    onSuccess: data => navigate(`/TCR/${data.tournamentId}`),
  });

  if (auth.loading) return <State title="Loading staff invite…" />;
  if (!auth.user || auth.user.loginMethod !== "discord") {
    const returnTo = `/TCR/staff/join/${encodeURIComponent(token)}`;
    return (
      <State
        title="Discord sign-in required"
        description="Sign in with Discord, then return here to accept this staff invite."
      >
        <a
          className={goldButtonClass + " mt-6 inline-flex rounded px-4 py-2"}
          href={getDiscordLoginUrl(returnTo)}
        >
          Sign in with Discord
        </a>
      </State>
    );
  }
  if (preview.isLoading) return <State title="Checking staff invite…" />;
  if (preview.error)
    return (
      <State
        title="Staff invite unavailable"
        description={getSafeTournamentControlErrorMessage(
          preview.error.message
        )}
      />
    );
  const data = preview.data;
  return (
    <State
      title="Accept Staff Invite"
      description={`You are joining ${data?.tournament.name ?? "this tournament"} as event staff. Owner: ${data?.owner.name ?? "Tournament owner"}.`}
    >
      {accept.error && (
        <p className="mt-4 text-sm text-red-200">
          {getSafeTournamentControlErrorMessage(accept.error.message)}
        </p>
      )}
      <Button
        className={goldButtonClass + " mt-6"}
        disabled={accept.isPending}
        onClick={() => accept.mutate({ token })}
      >
        {accept.isPending ? "Accepting…" : "Accept Staff Invite"}
      </Button>
    </State>
  );
}

function State({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-xl rounded border border-neon-gold/30 bg-zinc-950 p-8">
        <h1 className="font-mono text-2xl font-black text-neon-gold">
          {title}
        </h1>
        {description && <p className="mt-3 text-white/60">{description}</p>}
        {children}
      </div>
    </section>
  );
}
