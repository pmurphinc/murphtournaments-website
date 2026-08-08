import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import GlitchText from "@/components/GlitchText";
import LoadingThrobber from "@/components/LoadingThrobber";
import TeamFinderListingCard from "@/components/TeamFinderListingCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import DevelopmentDivisionAvatar from "@/components/DevelopmentDivisionAvatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TeamFinderListing =
  inferRouterOutputs<AppRouter>["teamFinder"]["list"][number];

type FormState = {
  listingType: "lft" | "lfp";
  platform: "PC" | "Console" | "Crossplay";
  region: "NA" | "EU" | "SA" | "OCE" | "Asia" | "MENA";
  availability: "Weeknights" | "Weekends" | "Flexible";
  preferredRole: "Light" | "Medium" | "Heavy" | "Flex";
  notes: string;
};

const defaults: FormState = {
  listingType: "lft",
  platform: "PC",
  region: "NA",
  availability: "Flexible",
  preferredRole: "Flex",
  notes: "",
};
const groups = {
  platform: ["PC", "Console", "Crossplay"],
  region: ["NA", "EU", "SA", "OCE", "Asia", "MENA"],
  availability: ["Weeknights", "Weekends", "Flexible"],
  preferredRole: ["Light", "Medium", "Heavy", "Flex"],
} as const;

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (T | readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/50">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const key = Array.isArray(option) ? option[0] : option;
          const text = Array.isArray(option) ? option[1] : option;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`rounded border px-3 py-2 text-sm transition ${value === key ? "border-yellow-400 bg-yellow-400 text-black" : "border-white/15 bg-black/50 text-white hover:border-yellow-400/70"}`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamFinder() {
  const utils = trpc.useUtils();
  const auth = trpc.auth.me.useQuery();
  const listings = trpc.teamFinder.list.useQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(defaults);
  const [inviteListing, setInviteListing] = useState<TeamFinderListing | null>(
    null
  );
  const [inviteTeamId, setInviteTeamId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("discord") === "error") {
      toast.error("Discord sign-in failed. Please try again.");
    }
    if (params.get("post") === "1") {
      setFormOpen(true);
    }
  }, []);

  const user = auth.data;
  const isAdmin = user?.role === "admin";
  const isDiscordUser = user?.loginMethod === "discord";
  const displayName = user?.discordDisplayName || user?.name || "Discord user";
  const myTeams = trpc.teamManagement.myTeams.useQuery(undefined, {
    enabled: !!isDiscordUser,
  });
  const captainTeams = (myTeams.data?.teams ?? []).filter(
    team => team.role === "captain"
  );
  const payload = useMemo(
    () => ({ ...form, notes: form.notes.trim() || null }),
    [form]
  );

  const afterWrite = (message: string) => {
    toast.success(message);
    setFormOpen(false);
    setEditingId(null);
    setForm(defaults);
    utils.teamFinder.list.invalidate();
  };
  const create = trpc.teamFinder.create.useMutation({
    onSuccess: () => afterWrite("Listing posted."),
    onError: e => toast.error(e.message),
  });
  const update = trpc.teamFinder.update.useMutation({
    onSuccess: () => afterWrite("Listing updated."),
    onError: e => toast.error(e.message),
  });
  const remove = trpc.teamFinder.delete.useMutation({
    onSuccess: () => afterWrite("Listing deleted."),
    onError: e => toast.error(e.message),
  });
  const report = trpc.teamFinder.report.useMutation({
    onSuccess: () => toast.success("Listing reported."),
    onError: e => toast.error(e.message),
  });
  const setHidden = trpc.teamFinder.setHidden.useMutation({
    onSuccess: () => {
      toast.success("Listing moderation updated.");
      utils.teamFinder.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const invite = trpc.teamManagement.inviteByDiscordUsername.useMutation({
    onSuccess: () => {
      toast.success("Team invitation sent.");
      setInviteListing(null);
      utils.teamManagement.myTeams.invalidate();
    },
    onError: e =>
      toast.error(e.data?.code === "CONFLICT" ? e.message : e.message),
  });

  const sendInvite = (listing: TeamFinderListing) => {
    if (!listing.discordUsername)
      return toast.error(
        "That player does not have a Discord username available."
      );
    if (captainTeams.length === 0)
      return toast.error("Only managed-team captains can invite players.");
    if (captainTeams.length === 1) {
      invite.mutate({
        teamId: captainTeams[0].id,
        discordUsername: listing.discordUsername,
      });
      return;
    }
    setInviteTeamId(captainTeams[0]?.id ?? null);
    setInviteListing(listing);
  };

  const startEdit = (listing: TeamFinderListing) => {
    setEditingId(listing.id);
    setForm({
      listingType: listing.listingType,
      platform: (listing.platform ??
        defaults.platform) as FormState["platform"],
      region: (listing.region ?? defaults.region) as FormState["region"],
      availability: (listing.availability ??
        defaults.availability) as FormState["availability"],
      preferredRole: (listing.preferredRole ??
        defaults.preferredRole) as FormState["preferredRole"],
      notes: listing.description ?? "",
    });
    setFormOpen(true);
  };

  return (
    <div className="container py-10 md:py-16">
      <div className="mb-10 max-w-4xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-yellow-400">
          Find your next squad
        </p>
        <GlitchText className="mb-4 font-display text-5xl text-white">
          LFT — Looking for Team
        </GlitchText>
        <p className="text-lg text-white/75">
          Put your play style, region, and schedule in front of captains
          building their next competitive roster.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-yellow-400/25 bg-black/60 p-5">
        {!isDiscordUser ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-white/75">
              Continue with Discord to post, edit, delete, or report listings.
            </p>
            <Button asChild>
              <a href="/api/auth/discord/login">Continue with Discord</a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="flex items-center gap-2 text-sm text-white/70">
              Signed in as{" "}
              <DevelopmentDivisionAvatar
                src={user?.discordAvatarUrl}
                displayName={displayName}
                isDevelopmentDivisionMember={user?.developmentDivisionMember}
                className="h-7 w-7"
                avatarClassName="border-neon-cyan/40"
              />
              <span className="text-white">{displayName}</span>
              {user?.discordUsername ? (
                <span className="text-white/50">(@{user.discordUsername})</span>
              ) : null}
            </p>
            <Button
              onClick={() => {
                setEditingId(null);
                setForm(defaults);
                setFormOpen(v => !v);
              }}
            >
              {formOpen ? "Close form" : "Post your LFT"}
            </Button>
          </div>
        )}
      </div>

      {formOpen && isDiscordUser && (
        <form
          className="mb-8 grid gap-5 rounded-lg border border-neon-cyan/25 bg-black/70 p-5"
          onSubmit={e => {
            e.preventDefault();
            editingId
              ? update.mutate({ id: editingId, ...payload })
              : create.mutate(payload);
          }}
        >
          <Segmented
            label="Platform"
            value={form.platform}
            options={groups.platform}
            onChange={platform => setForm({ ...form, platform })}
          />
          <Segmented
            label="Region"
            value={form.region}
            options={groups.region}
            onChange={region => setForm({ ...form, region })}
          />
          <Segmented
            label="Availability"
            value={form.availability}
            options={groups.availability}
            onChange={availability => setForm({ ...form, availability })}
          />
          <Segmented
            label="Preferred role"
            value={form.preferredRole}
            options={groups.preferredRole}
            onChange={preferredRole => setForm({ ...form, preferredRole })}
          />
          <Textarea
            value={form.notes}
            maxLength={500}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes (500 characters max)"
            className="min-h-28 bg-black/60 text-white"
          />
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {editingId ? "Save LFT" : "Post LFT"}
          </Button>
        </form>
      )}

      {listings.isLoading ? (
        <LoadingThrobber />
      ) : listings.isError ? (
        <p className="rounded border border-neon-magenta/50 bg-neon-magenta/10 p-4 text-neon-magenta">
          We couldn't load LFT listings. Please try again shortly.
        </p>
      ) : listings.data && listings.data.length > 0 ? (
        <div className="grid gap-5">
          {listings.data.map(listing => (
            <TeamFinderListingCard
              key={listing.id}
              listing={listing}
              isAdmin={!!isAdmin}
              isDiscordUser={!!isDiscordUser}
              currentUserId={user?.id}
              onEdit={startEdit}
              onDelete={id => remove.mutate({ id })}
              onReport={id =>
                report.mutate({
                  id,
                  reason: "Reported by Discord user for moderator review.",
                })
              }
              onToggleHidden={(id, hiddenByAdmin) =>
                setHidden.mutate({ id, hiddenByAdmin })
              }
              isToggling={setHidden.isPending}
              canInvite={captainTeams.length > 0}
              invitePending={invite.isPending}
              onInvite={sendInvite}
            />
          ))}
        </div>
      ) : (
        <p className="rounded border border-neon-cyan/30 bg-black/50 p-6 text-white/70">
          No players have posted an LFT yet. Sign in with Discord and be the
          first player captains see.
        </p>
      )}
      <Dialog
        open={!!inviteListing}
        onOpenChange={open => !open && setInviteListing(null)}
      >
        <DialogContent className="border-yellow-400/30 bg-black text-white">
          <DialogHeader>
            <DialogTitle>Invite player to a team</DialogTitle>
            <DialogDescription className="text-white/60">
              Choose which managed team should invite @
              {inviteListing?.discordUsername}.
            </DialogDescription>
          </DialogHeader>
          <label
            htmlFor="invite-team"
            className="font-mono text-xs uppercase text-yellow-300"
          >
            Your team
          </label>
          <select
            id="invite-team"
            value={inviteTeamId ?? ""}
            onChange={event => setInviteTeamId(Number(event.target.value))}
            className="w-full rounded border border-white/20 bg-black px-3 py-2 text-white"
          >
            {captainTeams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteListing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!inviteTeamId || invite.isPending}
              onClick={() => {
                if (inviteTeamId && inviteListing?.discordUsername)
                  invite.mutate({
                    teamId: inviteTeamId,
                    discordUsername: inviteListing.discordUsername,
                  });
              }}
            >
              {invite.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
