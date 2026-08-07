import { useState } from "react";
import { Copy, LinkIcon, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!copied) throw new Error("Copy command was rejected.");
    }
    toast.success("Development Division invite copied.");
    return true;
  } catch {
    toast.error("Copy failed. Select the invite link and copy it manually.");
    return false;
  }
}

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toLocaleString() : "No expiration";
}

export default function DevelopmentDivisionAdmin() {
  const auth = useAuth();
  const utils = trpc.useUtils();
  const [expiresInDays, setExpiresInDays] = useState<number | null>(90);
  const [maxUses, setMaxUses] = useState<number | null>(100);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const list = trpc.developmentDivision.listInvites.useQuery(undefined, {
    enabled: auth.user?.role === "admin",
    retry: false,
  });
  const create = trpc.developmentDivision.createInvite.useMutation({
    onSuccess: async data => {
      const url = `${window.location.origin}${data.path}`;
      setLatestUrl(url);
      await utils.developmentDivision.listInvites.invalidate();
      await copyText(url);
    },
    onError: error => toast.error(error.message),
  });
  const revoke = trpc.developmentDivision.revokeInvite.useMutation({
    onSuccess: async () => {
      await utils.developmentDivision.listInvites.invalidate();
      toast.success("Invite revoked.");
    },
    onError: error => toast.error(error.message),
  });

  if (auth.loading) return <AdminState title="Checking organizer access…" />;
  if (auth.user?.role !== "admin")
    return (
      <AdminState
        title="Organizer access required"
        description="Only Murph Tournaments administrators can create Development Division invite links."
      />
    );

  return (
    <section className="min-h-screen bg-[#080808] px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            src="/images/development-division-badge.png"
            alt="Development Division"
            className="w-44"
          />
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.3em] text-[#d4af37]">
              Organizer controls
            </p>
            <h1 className="font-display text-4xl uppercase sm:text-6xl">
              Member Invites
            </h1>
            <p className="mt-2 max-w-2xl text-white/60">
              Generate a private link for Development Division members. The link
              is only shown in full when it is created.
            </p>
          </div>
        </header>

        <Card className="border-[#d4af37]/35 bg-black/70 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-2xl uppercase">
              <LinkIcon className="h-5 w-5 text-[#d4af37]" /> Create Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="dd-expiration">Expiration</Label>
              <select
                id="dd-expiration"
                value={expiresInDays ?? "never"}
                onChange={event =>
                  setExpiresInDays(
                    event.target.value === "never"
                      ? null
                      : Number(event.target.value)
                  )
                }
                className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dd-max-uses">Member limit</Label>
              <select
                id="dd-max-uses"
                value={maxUses ?? "unlimited"}
                onChange={event =>
                  setMaxUses(
                    event.target.value === "unlimited"
                      ? null
                      : Number(event.target.value)
                  )
                }
                className="h-10 w-full rounded-md border border-white/15 bg-black px-3 text-sm text-white"
              >
                <option value={25}>25 members</option>
                <option value={50}>50 members</option>
                <option value={100}>100 members</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>
            <Button
              className="bg-[#d4af37] font-mono font-black uppercase tracking-wider text-black hover:bg-[#ffe273]"
              disabled={create.isPending}
              onClick={() => create.mutate({ expiresInDays, maxUses })}
            >
              {create.isPending ? "Creating…" : "Generate Link"}
            </Button>
          </CardContent>
        </Card>

        {latestUrl ? (
          <Card className="border-emerald-300/35 bg-emerald-400/8 text-white">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-200">
                  New invite ready
                </p>
                <p className="mt-2 break-all text-sm text-white/75">
                  {latestUrl}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void copyText(latestUrl)}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          <h2 className="font-display text-3xl uppercase">Invite History</h2>
          {list.isLoading ? (
            <p className="text-white/55">Loading invite history…</p>
          ) : list.data?.length ? (
            list.data.map(invite => {
              const state = invite.revoked
                ? "Revoked"
                : invite.expired
                  ? "Expired"
                  : invite.full
                    ? "Limit reached"
                    : "Active";
              const creator =
                invite.creator.discordDisplayName ||
                invite.creator.discordUsername ||
                invite.creator.name ||
                "Administrator";
              return (
                <Card
                  key={invite.id}
                  className="border-white/10 bg-black/60 text-white"
                >
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      {invite.active ? (
                        <Shield className="mt-0.5 h-5 w-5 text-emerald-300" />
                      ) : (
                        <ShieldOff className="mt-0.5 h-5 w-5 text-white/35" />
                      )}
                      <div>
                        <p className="font-mono text-sm font-black uppercase tracking-wider">
                          {state} · {invite.useCount}
                          {invite.maxUses ? `/${invite.maxUses}` : ""} claimed
                        </p>
                        <p className="mt-1 text-xs text-white/48">
                          Created by {creator} on {formatDate(invite.createdAt)}
                          {" · "}Expires {formatDate(invite.expiresAt)}
                        </p>
                      </div>
                    </div>
                    {invite.active ? (
                      <Button
                        variant="destructive"
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate({ inviteId: invite.id })}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/5 p-5 text-white/55">
              No Development Division invites have been created yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-black px-5 text-white">
      <div className="max-w-xl rounded-xl border border-[#d4af37]/30 bg-[#0d0d0d] p-8 text-center">
        <h1 className="font-display text-4xl uppercase text-[#ffe273]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-white/60">{description}</p>
        ) : null}
      </div>
    </section>
  );
}
