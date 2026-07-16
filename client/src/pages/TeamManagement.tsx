import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Crown,
  LinkIcon,
  LogIn,
  Shield,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type TeamManagementData =
  inferRouterOutputs<AppRouter>["teamManagement"]["myTeams"];
type ManagedTeamRosterRow =
  TeamManagementData["teams"][number]["roster"][number];
type ManagedTeamPendingInvite =
  TeamManagementData["teams"][number]["pendingInvites"][number];
type ManagedTeam = TeamManagementData["teams"][number];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MT";
const displayUser = (user: {
  discordDisplayName?: string | null;
  discordUsername?: string | null;
  name?: string | null;
}) =>
  user.discordDisplayName ||
  user.discordUsername ||
  user.name ||
  "Discord user";
const formatDate = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleDateString() : "No expiration";
const toShareUrl = (path: string) => `${window.location.origin}${path}`;

async function copyInviteLink(shareUrl: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (!copied) throw new Error("Copy command was rejected.");
    }
    toast.success("Invite link copied.");
  } catch {
    toast.error("Copy failed. Select the invite link and copy it manually.");
  }
}

function InviteLinks({
  team,
  latestLink,
  createJoinLink,
  revokeJoinLink,
  isBusy,
}: {
  team: ManagedTeam;
  latestLink?: { id: number; path: string };
  createJoinLink: (teamId: number) => void;
  revokeJoinLink: (linkId: number) => void;
  isBusy: boolean;
}) {
  const links = trpc.teamManagement.listJoinLinks.useQuery({ teamId: team.id });
  const activeLinks =
    links.data?.filter(link => link.status === "active" && link.state.active) ??
    [];
  return (
    <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-mono text-sm uppercase text-yellow-300">
            <LinkIcon className="h-4 w-4" /> Invite Link
          </h3>
          <p className="mt-1 text-xs text-white/55">
            Create a temporary Discord sign-in join link for new teammates.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => createJoinLink(team.id)}
          disabled={isBusy}
        >
          Create Invite Link
        </Button>
      </div>
      {links.isLoading ? (
        <p className="text-sm text-white/55">Loading invite links...</p>
      ) : activeLinks.length ? (
        <div className="space-y-2">
          {activeLinks.map(link => {
            const shareUrl =
              latestLink?.id === link.id ? toShareUrl(latestLink.path) : null;
            return (
              <div
                key={link.id}
                className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-white/70">
                    {shareUrl ?? "Link available only when first created"}
                  </p>
                  <p className="text-xs text-white/45">
                    Expires {formatDate(link.expiresAt)} · Uses {link.useCount}
                    {link.maxUses ? `/${link.maxUses}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!shareUrl}
                    onClick={() => {
                      if (shareUrl) void copyInviteLink(shareUrl);
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy Link
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revokeJoinLink(link.id)}
                    disabled={isBusy}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/55">No active invite links.</p>
      )}
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const isDiscordUser = user?.loginMethod === "discord";
  const utils = trpc.useUtils();
  const [teamName, setTeamName] = useState("");
  const [renameByTeam, setRenameByTeam] = useState<Record<number, string>>({});
  const [inviteByTeam, setInviteByTeam] = useState<Record<number, string>>({});
  const [latestJoinLinkByTeam, setLatestJoinLinkByTeam] = useState<
    Record<number, { id: number; path: string }>
  >({});
  const query = trpc.teamManagement.myTeams.useQuery(undefined, {
    enabled: !!isDiscordUser,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const tournamentQuery =
    trpc.teamManagement.listAvailableTournamentsForMyTeams.useQuery(undefined, {
      enabled: !!isDiscordUser,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
    });
  const invalidate = () => {
    utils.teamManagement.myTeams.invalidate();
    utils.teamManagement.listAvailableTournamentsForMyTeams.invalidate();
    utils.teamManagement.listJoinLinks.invalidate();
  };
  const ok = (message: string) => {
    toast.success(message);
    invalidate();
  };
  const create = trpc.teamManagement.create.useMutation({
    onSuccess: () => {
      setTeamName("");
      ok("Team created.");
    },
    onError: e => toast.error(e.message),
  });
  const rename = trpc.teamManagement.rename.useMutation({
    onSuccess: () => ok("Team renamed."),
    onError: e => toast.error(e.message),
  });
  const invite = trpc.teamManagement.inviteByDiscordUsername.useMutation({
    onSuccess: data => {
      if (data.discordDelivery.delivered) {
        ok("Invite sent and the player was notified on Discord.");
        return;
      }
      toast.warning(
        "Invite sent, but the Discord notification could not be delivered. The player can still see it after signing into /teams."
      );
      invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const cancelInvite = trpc.teamManagement.cancelInvite.useMutation({
    onSuccess: () => ok("Invite canceled."),
    onError: e => toast.error(e.message),
  });
  const removeMember = trpc.teamManagement.removeMember.useMutation({
    onSuccess: () => ok("Member removed."),
    onError: e => toast.error(e.message),
  });
  const transferCaptain = trpc.teamManagement.transferCaptain.useMutation({
    onSuccess: () => ok("Captain transferred."),
    onError: e => toast.error(e.message),
  });
  const disband = trpc.teamManagement.disband.useMutation({
    onSuccess: () => ok("Team disbanded."),
    onError: e => toast.error(e.message),
  });
  const respond = trpc.teamManagement.respondToInvite.useMutation({
    onSuccess: () => ok("Invite updated."),
    onError: e => toast.error(e.message),
  });
  const leave = trpc.teamManagement.leaveTeam.useMutation({
    onSuccess: () => ok("You left the team."),
    onError: e => toast.error(e.message),
  });
  const submitToTournament =
    trpc.teamManagement.submitTeamToTournament.useMutation({
      onSuccess: () => ok("Team submitted for approval."),
      onError: e => toast.error(e.message),
    });
  const createJoinLink = trpc.teamManagement.createJoinLink.useMutation({
    onSuccess: (data, variables) => {
      setLatestJoinLinkByTeam(prev => ({
        ...prev,
        [variables.teamId]: { id: data.id, path: data.path },
      }));
      void copyInviteLink(toShareUrl(data.path));
      ok("Invite link created.");
    },
    onError: e => toast.error(e.message),
  });
  const revokeJoinLink = trpc.teamManagement.revokeJoinLink.useMutation({
    onSuccess: () => ok("Invite link revoked."),
    onError: e => toast.error(e.message),
  });
  const hasTeamMembership = (query.data?.teams.length ?? 0) > 0;

  if (!isDiscordUser)
    return (
      <section className="container py-16">
        <Card className="mx-auto max-w-xl border-yellow-400/30 bg-black/70 text-white">
          <CardHeader>
            <CardTitle className="font-display text-3xl text-yellow-300">
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white/70">
              Sign in with Discord to create teams, manage rosters, and accept
              invitations.
            </p>
            <Button asChild>
              <a href="/api/auth/discord/login">
                <LogIn className="mr-2 h-4 w-4" /> Continue with Discord
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    );

  return (
    <section className="container py-10 text-white">
      <div className="mb-8">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-yellow-400">
          Discord roster tools
        </p>
        <h1 className="font-display text-4xl md:text-6xl">Team Management</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          {!query.isLoading && !hasTeamMembership ? (
            <Card className="border-yellow-400/30 bg-black/70 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-300" /> Create Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="Team Name"
                  maxLength={64}
                />
                <Button
                  className="w-full"
                  onClick={() => create.mutate({ name: teamName })}
                  disabled={create.isPending || teamName.trim().length < 2}
                >
                  Create Team
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-neon-cyan/30 bg-black/70 text-white">
            <CardHeader>
              <CardTitle>Pending Invites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {query.data?.receivedInvites.length ? (
                query.data.receivedInvites.map(inv => (
                  <div
                    key={inv.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <p className="font-bold">{inv.team.name}</p>
                    <p className="text-xs text-white/55">
                      From {displayUser(inv.createdBy)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          respond.mutate({
                            inviteId: inv.id,
                            response: "accept",
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          respond.mutate({
                            inviteId: inv.id,
                            response: "decline",
                          })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/60">No pending invitations.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {query.isLoading ? (
            <p>Loading teams...</p>
          ) : query.data?.teams.length ? (
            query.data.teams.map(team => {
              const isCaptain = team.role === "captain";
              return (
                <Card
                  key={team.id}
                  className="overflow-hidden border-yellow-400/25 bg-black/75 text-white"
                >
                  <CardHeader className="border-b border-white/10 bg-gradient-to-r from-yellow-400/10 to-transparent">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-yellow-300 bg-yellow-400/15 font-display text-xl text-yellow-200">
                          {initials(team.name)}
                        </div>
                        <div>
                          <CardTitle>{team.name}</CardTitle>
                          <p className="text-xs uppercase tracking-widest text-white/50">
                            /{team.slug}
                          </p>
                        </div>
                      </div>
                      {isCaptain ? (
                        <span className="flex items-center gap-1 text-sm text-yellow-300">
                          <Crown className="h-4 w-4" /> Captain
                        </span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline">Leave Team</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Leave {team.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                You will need a new invite to rejoin.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  leave.mutate({ teamId: team.id })
                                }
                              >
                                Leave Team
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-5">
                    {isCaptain ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex gap-2">
                          <Input
                            value={renameByTeam[team.id] ?? team.name}
                            onChange={e =>
                              setRenameByTeam({
                                ...renameByTeam,
                                [team.id]: e.target.value,
                              })
                            }
                          />
                          <Button
                            onClick={() =>
                              rename.mutate({
                                teamId: team.id,
                                name: renameByTeam[team.id] ?? team.name,
                              })
                            }
                          >
                            Rename
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={inviteByTeam[team.id] ?? ""}
                            onChange={e =>
                              setInviteByTeam({
                                ...inviteByTeam,
                                [team.id]: e.target.value,
                              })
                            }
                            placeholder="Discord username"
                          />
                          <Button
                            onClick={() =>
                              invite.mutate({
                                teamId: team.id,
                                discordUsername: inviteByTeam[team.id] ?? "",
                              })
                            }
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <div>
                      <h3 className="mb-2 font-mono text-sm uppercase text-yellow-300">
                        Roster
                      </h3>
                      <div className="grid gap-2">
                        {team.roster.map((row: ManagedTeamRosterRow) => (
                          <div
                            key={row.userId}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {row.user.discordAvatarUrl ? (
                                <img
                                  src={row.user.discordAvatarUrl}
                                  alt=""
                                  className="h-10 w-10 rounded-full border border-neon-cyan/40"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-yellow-400/20" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-semibold">
                                  {displayUser(row.user)}
                                </p>
                                <p className="text-xs text-white/50">
                                  {row.user.discordUsername
                                    ? `@${row.user.discordUsername}`
                                    : "Discord"}
                                </p>
                              </div>
                              {row.role === "captain" ? (
                                <Shield className="h-4 w-4 text-yellow-300" />
                              ) : null}
                            </div>
                            {isCaptain && row.userId !== user?.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    transferCaptain.mutate({
                                      teamId: team.id,
                                      newCaptainUserId: row.userId,
                                    })
                                  }
                                >
                                  Make Captain
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      Remove
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Remove {displayUser(row.user)}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This removes the player from the roster.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          removeMember.mutate({
                                            teamId: team.id,
                                            memberUserId: row.userId,
                                          })
                                        }
                                      >
                                        Remove Member
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#FFD700]/25 bg-[#FFD700]/5 p-4">
                      <h3 className="mb-2 flex items-center gap-2 font-mono text-sm uppercase text-yellow-300">
                        <Trophy className="h-4 w-4" /> Tournament Record
                      </h3>
                      {team.tournamentRecord ? (
                        <div className="space-y-3 text-sm text-white/70">
                          <div className="grid gap-2 sm:grid-cols-4">
                            <div>
                              Overall{" "}
                              <strong className="text-white">
                                {team.tournamentRecord.wins}-
                                {team.tournamentRecord.losses}
                              </strong>
                            </div>
                            <div>
                              Cashout{" "}
                              <strong className="text-white">
                                {team.tournamentRecord.cashoutWins}-
                                {team.tournamentRecord.cashoutLosses}
                              </strong>
                            </div>
                            <div>
                              Final{" "}
                              <strong className="text-white">
                                {team.tournamentRecord.finalRoundWins}-
                                {team.tournamentRecord.finalRoundLosses}
                              </strong>
                            </div>
                            <div>
                              🏆{" "}
                              <strong className="text-white">
                                {team.tournamentRecord.championships}
                              </strong>{" "}
                              / {team.tournamentRecord.tournamentsPlayed} played
                            </div>
                          </div>
                          {team.tournamentRecord.tournaments.length ? (
                            team.tournamentRecord.tournaments.map(result => (
                              <a
                                key={result.tournamentId}
                                href={result.resultsPath}
                                className="block rounded border border-white/10 bg-black/40 p-3 hover:border-[#FFD700]/40"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold text-white">
                                    {result.tournamentName}
                                  </span>
                                  {result.isChampion ? (
                                    <span className="rounded bg-[#FFD700] px-2 py-0.5 font-mono text-[10px] uppercase text-black">
                                      Champion
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-white/55">
                                  {result.completedAt
                                    ? new Date(
                                        result.completedAt
                                      ).toLocaleDateString()
                                    : "Finalized"}{" "}
                                  · Score {result.scoreSnapshot} · Overall{" "}
                                  {result.wins}-{result.losses} · Cashout{" "}
                                  {result.cashoutWins}-{result.cashoutLosses} ·
                                  Final {result.finalRoundWins}-
                                  {result.finalRoundLosses} · Place{" "}
                                  {result.finalPlacement ?? "—"}
                                </p>
                              </a>
                            ))
                          ) : (
                            <p className="text-sm text-white/55">
                              No finalized tournament records yet.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-white/55">
                          No finalized tournament records yet.
                        </p>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 font-mono text-sm uppercase text-yellow-300">
                        Pending Invitations
                      </h3>
                      {team.pendingInvites.length ? (
                        team.pendingInvites.map(
                          (inv: ManagedTeamPendingInvite) => (
                            <div
                              key={inv.id}
                              className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                            >
                              <span>{displayUser(inv.invitedUser)}</span>
                              {isCaptain ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    cancelInvite.mutate({ inviteId: inv.id })
                                  }
                                >
                                  Cancel
                                </Button>
                              ) : null}
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-white/55">
                          No pending invitations.
                        </p>
                      )}
                    </div>
                    {isCaptain ? (
                      <InviteLinks
                        team={team}
                        latestLink={latestJoinLinkByTeam[team.id]}
                        createJoinLink={teamId =>
                          createJoinLink.mutate({ teamId })
                        }
                        revokeJoinLink={linkId =>
                          revokeJoinLink.mutate({ linkId })
                        }
                        isBusy={
                          createJoinLink.isPending || revokeJoinLink.isPending
                        }
                      />
                    ) : null}
                    {isCaptain ? (
                      <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-mono text-sm uppercase text-yellow-300">
                          <Trophy className="h-4 w-4" /> Submit to Tournament
                        </h3>
                        <div className="space-y-2">
                          {tournamentQuery.data?.teams
                            .find(item => item.id === team.id)
                            ?.submissions.map(submission => (
                              <div
                                key={submission.id}
                                className="flex flex-col gap-3 rounded border border-white/10 bg-black/40 p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold">
                                    {submission.tournament.name}
                                  </span>
                                  <span className="ml-2 uppercase text-white/55">
                                    {submission.status === "pending"
                                      ? "Pending approval"
                                      : submission.status}
                                  </span>
                                  {submission.adminNote ? (
                                    <p className="mt-1 text-xs text-white/50">
                                      Admin note: {submission.adminNote}
                                    </p>
                                  ) : null}
                                </div>
                                {submission.status === "approved" &&
                                submission.viewerPath ? (
                                  <Button
                                    asChild
                                    size="sm"
                                    className="shrink-0 border border-yellow-300 bg-yellow-300 font-mono font-bold uppercase text-black hover:bg-yellow-200"
                                  >
                                    <a href={submission.viewerPath}>
                                      <ExternalLink className="mr-1 h-3 w-3" />
                                      Open Viewer Room
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          {tournamentQuery.data?.tournaments.length ? (
                            tournamentQuery.data.tournaments.map(tournament => {
                              const alreadySubmitted =
                                tournamentQuery.data?.teams
                                  .find(item => item.id === team.id)
                                  ?.submissions.some(
                                    submission =>
                                      submission.tournamentId === tournament.id
                                  );
                              return (
                                <div
                                  key={tournament.id}
                                  className="flex flex-col gap-2 rounded border border-white/10 bg-black/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="font-semibold">
                                      {tournament.name}
                                    </p>
                                    <p className="text-xs text-white/50">
                                      Registration open
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    disabled={
                                      alreadySubmitted ||
                                      submitToTournament.isPending
                                    }
                                    onClick={() =>
                                      submitToTournament.mutate({
                                        teamId: team.id,
                                        tournamentId: tournament.id,
                                      })
                                    }
                                  >
                                    {alreadySubmitted ? "Submitted" : "Submit"}
                                  </Button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-white/55">
                              No tournaments are currently open for
                              registration.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                    {isCaptain ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Disband Team</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Disband {team.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the managed team and
                              roster.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                disband.mutate({
                                  teamId: team.id,
                                  confirmation: "DISBAND",
                                })
                              }
                            >
                              Disband Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-yellow-400/30 bg-black/70 text-white">
              <CardContent className="p-8 text-center">
                <p className="mb-4 text-white/70">
                  You are not on any managed teams yet.
                </p>
                {!query.isLoading && !hasTeamMembership ? (
                  <p className="text-sm text-yellow-200">
                    Use the Create Team form to start a roster.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
