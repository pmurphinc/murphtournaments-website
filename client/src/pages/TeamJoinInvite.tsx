import { LogIn, ShieldCheck, Users } from "lucide-react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useState } from "react";

export default function TeamJoinInvite() {
  const [, params] = useRoute("/teams/join/:token");
  const token = params?.token ?? "";
  const { user } = useAuth();
  const isDiscordUser = user?.loginMethod === "discord";
  const [accepted, setAccepted] = useState(false);
  const preview = trpc.teamManagement.getJoinLinkPreview.useQuery({ token }, { enabled: token.length > 0, retry: false });
  const accept = trpc.teamManagement.acceptJoinLink.useMutation({
    onSuccess: data => { setAccepted(true); toast.success(data.alreadyMember ? "You are already on this team." : "You joined the team."); },
    onError: error => toast.error(error.message),
  });
  const returnTo = encodeURIComponent(`/teams/join/${encodeURIComponent(token)}`);

  return <section className="container flex min-h-[70vh] items-center justify-center py-10 text-white"><Card className="w-full max-w-xl overflow-hidden border-yellow-400/30 bg-black/80 text-white shadow-2xl shadow-yellow-500/10"><div className="h-1 bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500" /><CardHeader className="text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-300/60 bg-yellow-400/15"><Users className="h-8 w-8 text-yellow-200" /></div><p className="font-mono text-xs uppercase tracking-[0.35em] text-yellow-300">Team invite</p><CardTitle className="font-display text-3xl md:text-5xl">{preview.data?.teamName ? `Join ${preview.data.teamName}` : "Join Team"}</CardTitle></CardHeader><CardContent className="space-y-5 p-6 text-center">{preview.isLoading ? <p className="text-white/60">Checking invite link...</p> : preview.isError ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-red-200">{preview.error.message}</p> : preview.data ? <><div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-white/70">Captain</p><p className="font-semibold text-yellow-100">{preview.data.captainDisplayName ?? "Team captain"}</p><p className="mt-2 text-xs text-white/45">Uses {preview.data.useCount}{preview.data.maxUses ? `/${preview.data.maxUses}` : ""}{preview.data.expiresAt ? ` · Expires ${new Date(preview.data.expiresAt).toLocaleDateString()}` : ""}</p></div>{!preview.data.active ? <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-4 text-yellow-100">This invite is {preview.data.revoked ? "revoked" : preview.data.expired ? "expired" : "full"}.</p> : accepted ? <div className="space-y-4"><ShieldCheck className="mx-auto h-10 w-10 text-green-300" /><p className="text-lg font-semibold">You're all set.</p><Button asChild><a href="/teams">Back to Teams</a></Button></div> : isDiscordUser ? <Button className="w-full" size="lg" disabled={accept.isPending} onClick={() => accept.mutate({ token })}>Join Team</Button> : <Button asChild className="w-full" size="lg"><a href={`/api/auth/discord/login?returnTo=${returnTo}`}><LogIn className="mr-2 h-4 w-4" /> Sign in with Discord to Join</a></Button>}</> : null}</CardContent></Card></section>;
}
