import { useState } from "react";
import { CheckCircle2, LogIn, ShieldCheck, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { trpc } from "@/lib/trpc";

export default function DevelopmentDivisionInvite() {
  const { token = "" } = useParams<{ token: string }>();
  const auth = useAuth();
  const utils = trpc.useUtils();
  const [claimed, setClaimed] = useState(false);
  const preview = trpc.developmentDivision.previewInvite.useQuery(
    { token },
    { enabled: token.length >= 16, retry: false }
  );
  const claim = trpc.developmentDivision.claimInvite.useMutation({
    onSuccess: async data => {
      setClaimed(true);
      await utils.auth.me.invalidate();
      toast.success(
        data.alreadyMember
          ? "Your Development Division badge is already active."
          : "Development Division badge unlocked."
      );
    },
    onError: error => toast.error(error.message),
  });

  const isDiscordUser = auth.user?.loginMethod === "discord";
  const isMember = claimed || auth.user?.developmentDivisionMember === 1;
  const returnTo = `/invite/development-division/${encodeURIComponent(token)}`;
  const unavailable = preview.data && !preview.data.active && !isMember;

  return (
    <section className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-[#080808] px-4 py-14 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_42%)]" />
      <Card className="relative w-full max-w-2xl overflow-hidden border-[#d4af37]/45 bg-[#0d0d0d]/95 text-white shadow-2xl shadow-black">
        <div className="h-1 bg-gradient-to-r from-[#8a6a16] via-[#ffe273] to-[#8a6a16]" />
        <CardHeader className="items-center px-6 pb-3 pt-8 text-center sm:px-10">
          <img
            src="/images/development-division-badge.png"
            alt="Development Division"
            className="mb-5 w-44 drop-shadow-[0_0_20px_rgba(255,215,0,0.22)] sm:w-52"
          />
          <p className="font-mono text-xs font-black uppercase tracking-[0.32em] text-[#e8c34a]">
            Private member invitation
          </p>
          <CardTitle className="font-display text-4xl uppercase leading-none sm:text-6xl">
            Claim Your Badge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-9 text-center sm:px-10">
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/68">
            Sign in with Discord to verify this invitation. Your permanent DD
            emblem will appear on your Murph Tournaments profile picture and
            team roster.
          </p>

          {preview.isLoading || auth.loading ? (
            <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-white/60">
              Verifying invitation…
            </p>
          ) : preview.isError ? (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-200">
              {preview.error.message}
            </p>
          ) : unavailable ? (
            <p className="rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 p-4 text-[#ffe994]">
              This invitation is no longer active. Ask Murph for a new link.
            </p>
          ) : isMember ? (
            <div className="space-y-5 rounded-xl border border-emerald-300/30 bg-emerald-400/8 p-6">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
              <div>
                <h2 className="font-display text-3xl uppercase text-emerald-100">
                  Badge Active
                </h2>
                <p className="mt-2 text-white/65">
                  Your Development Division status is permanently attached to
                  this Discord account.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-[#d4af37] text-black hover:bg-[#ffe273]"
              >
                <Link href="/teams">
                  <Users className="mr-2 h-4 w-4" /> Create or Manage Team
                </Link>
              </Button>
            </div>
          ) : isDiscordUser ? (
            <Button
              size="lg"
              className="w-full bg-[#d4af37] font-mono font-black uppercase tracking-wider text-black hover:bg-[#ffe273]"
              disabled={claim.isPending}
              onClick={() => claim.mutate({ token })}
            >
              <ShieldCheck className="mr-2 h-5 w-5" />
              {claim.isPending ? "Activating…" : "Activate DD Membership"}
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="w-full bg-[#5865f2] font-mono font-black uppercase tracking-wider text-white hover:bg-[#6875ff]"
            >
              <a href={getDiscordLoginUrl(returnTo)}>
                <LogIn className="mr-2 h-5 w-5" /> Continue with Discord
              </a>
            </Button>
          )}

          <p className="font-mono text-[11px] uppercase tracking-widest text-white/38">
            Invitation access can be revoked. Claimed member badges remain on
            verified accounts.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
