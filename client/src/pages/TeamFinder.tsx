import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import GlitchText from "@/components/GlitchText";
import LoadingThrobber from "@/components/LoadingThrobber";
import TeamFinderListingCard from "@/components/TeamFinderListingCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type FormState = {
  listingType: "lft" | "lfp";
  platform: "PC" | "Console" | "Crossplay";
  region: "NA" | "EU" | "SA" | "OCE" | "Asia" | "MENA";
  availability: "Weeknights" | "Weekends" | "Flexible";
  preferredRole: "Light" | "Medium" | "Heavy" | "Flex";
  notes: string;
};

const defaults: FormState = { listingType: "lft", platform: "PC", region: "NA", availability: "Flexible", preferredRole: "Flex", notes: "" };
const groups = {
  listingType: [["lft", "Looking for Team"], ["lfp", "Looking for Players"]],
  platform: ["PC", "Console", "Crossplay"],
  region: ["NA", "EU", "SA", "OCE", "Asia", "MENA"],
  availability: ["Weeknights", "Weekends", "Flexible"],
  preferredRole: ["Light", "Medium", "Heavy", "Flex"],
} as const;

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly (T | readonly [T, string])[]; onChange: (value: T) => void }) {
  return <div><p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/50">{label}</p><div className="flex flex-wrap gap-2">{options.map(option => { const key = Array.isArray(option) ? option[0] : option; const text = Array.isArray(option) ? option[1] : option; return <button key={key} type="button" onClick={() => onChange(key)} className={`rounded border px-3 py-2 text-sm transition ${value === key ? "border-yellow-400 bg-yellow-400 text-black" : "border-white/15 bg-black/50 text-white hover:border-yellow-400/70"}`}>{text}</button>; })}</div></div>;
}

export default function TeamFinder() {
  const utils = trpc.useUtils();
  const auth = trpc.auth.me.useQuery();
  const listings = trpc.teamFinder.list.useQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(defaults);

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
  const payload = useMemo(() => ({ ...form, notes: form.notes.trim() || null }), [form]);

  const afterWrite = (message: string) => { toast.success(message); setFormOpen(false); setEditingId(null); setForm(defaults); utils.teamFinder.list.invalidate(); };
  const create = trpc.teamFinder.create.useMutation({ onSuccess: () => afterWrite("Listing posted."), onError: e => toast.error(e.message) });
  const update = trpc.teamFinder.update.useMutation({ onSuccess: () => afterWrite("Listing updated."), onError: e => toast.error(e.message) });
  const remove = trpc.teamFinder.delete.useMutation({ onSuccess: () => afterWrite("Listing deleted."), onError: e => toast.error(e.message) });
  const report = trpc.teamFinder.report.useMutation({ onSuccess: () => toast.success("Listing reported."), onError: e => toast.error(e.message) });
  const setHidden = trpc.teamFinder.setHidden.useMutation({ onSuccess: () => { toast.success("Listing moderation updated."); utils.teamFinder.list.invalidate(); }, onError: e => toast.error(e.message) });

  const startEdit = (listing: any) => { setEditingId(listing.id); setForm({ listingType: listing.listingType, platform: listing.platform, region: listing.region, availability: listing.availability, preferredRole: listing.preferredRole, notes: listing.description ?? "" }); setFormOpen(true); };

  return (
    <div className="container py-12">
      <div className="mb-8 max-w-3xl">
        <GlitchText className="mb-4 font-display text-5xl text-white">Team Finder</GlitchText>
        <p className="text-lg text-white/75">A Discord-authenticated, click-first LFT/LFP board for Murph Tournaments players.</p>
      </div>

      <div className="mb-8 rounded-lg border border-yellow-400/25 bg-black/60 p-5">
        {!isDiscordUser ? <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-white/75">Continue with Discord to post, edit, delete, or report listings.</p><Button asChild><a href="/api/auth/discord/login">Continue with Discord</a></Button></div> : <div className="flex flex-wrap items-center justify-between gap-4"><p className="flex items-center gap-2 text-sm text-white/70">Signed in as {user?.discordAvatarUrl ? <img src={user.discordAvatarUrl} alt="" className="h-7 w-7 rounded-full border border-neon-cyan/40 object-cover" referrerPolicy="no-referrer" /> : null}<span className="text-white">{displayName}</span>{user?.discordUsername ? <span className="text-white/50">(@{user.discordUsername})</span> : null}</p><Button onClick={() => { setEditingId(null); setForm(defaults); setFormOpen(v => !v); }}>{formOpen ? "Close form" : "Post listing"}</Button></div>}
      </div>

      {formOpen && isDiscordUser && <form className="mb-8 grid gap-5 rounded-lg border border-neon-cyan/25 bg-black/70 p-5" onSubmit={e => { e.preventDefault(); editingId ? update.mutate({ id: editingId, ...payload }) : create.mutate(payload); }}>
        <Segmented label="Goal" value={form.listingType} options={groups.listingType} onChange={listingType => setForm({ ...form, listingType })} />
        <Segmented label="Platform" value={form.platform} options={groups.platform} onChange={platform => setForm({ ...form, platform })} />
        <Segmented label="Region" value={form.region} options={groups.region} onChange={region => setForm({ ...form, region })} />
        <Segmented label="Availability" value={form.availability} options={groups.availability} onChange={availability => setForm({ ...form, availability })} />
        <Segmented label="Preferred role" value={form.preferredRole} options={groups.preferredRole} onChange={preferredRole => setForm({ ...form, preferredRole })} />
        <Textarea value={form.notes} maxLength={500} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes (500 characters max)" className="min-h-28 bg-black/60 text-white" />
        <Button type="submit" disabled={create.isPending || update.isPending}>{editingId ? "Save listing" : "Post listing"}</Button>
      </form>}

      {listings.isLoading ? <LoadingThrobber /> : listings.isError ? <p className="rounded border border-neon-magenta/50 bg-neon-magenta/10 p-4 text-neon-magenta">Unable to load Team Finder listings.</p> : listings.data && listings.data.length > 0 ? <div className="grid gap-5">{listings.data.map(listing => <TeamFinderListingCard key={listing.id} listing={listing} isAdmin={!!isAdmin} isDiscordUser={!!isDiscordUser} currentUserId={user?.id} onEdit={startEdit} onDelete={id => remove.mutate({ id })} onReport={id => report.mutate({ id, reason: "Reported by Discord user for moderator review." })} onToggleHidden={(id, hiddenByAdmin) => setHidden.mutate({ id, hiddenByAdmin })} isToggling={setHidden.isPending} />)}</div> : <p className="rounded border border-neon-cyan/30 bg-black/50 p-6 text-white/70">No Team Finder listings are live yet. Check back soon.</p>}
    </div>
  );
}
