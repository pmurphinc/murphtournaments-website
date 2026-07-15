import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDiscordLoginUrl } from "@/lib/discordLogin";
import { getSafeTournamentControlErrorMessage } from "@/lib/tcrError";

const goldButtonClass =
  "border border-[var(--mt-gold)] bg-[var(--mt-gold)] px-5 font-mono font-black uppercase tracking-wider text-[var(--mt-gold-foreground)] hover:bg-[var(--mt-gold-bright)] hover:text-[var(--mt-gold-foreground)]";

const outlineButtonClass =
  "border-[var(--mt-steel-line)] text-[var(--mt-off-white)] hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)]";

type Visibility = "private" | "public";
type Template = {
  id: number;
  name: string;
  visibility: Visibility;
  createdByUserId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  lobbyCount: number;
  ownedByCurrentUser: boolean;
  creator: {
    id: number | null;
    name: string | null;
    discordDisplayName: string | null;
    discordUsername: string | null;
  } | null;
};

function creatorName(template: Template) {
  return (
    template.creator?.discordDisplayName ||
    template.creator?.discordUsername ||
    template.creator?.name ||
    "TCR organizer"
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function TcrTemplateBrowser({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [view, setView] = useState<"public" | "mine">("public");
  const [useTarget, setUseTarget] = useState<Template | null>(null);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Template | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const query = trpc.personalTcr.listTemplates.useQuery(undefined, {
    retry: false,
  });
  const createFromTemplate =
    trpc.personalTcr.createTournamentFromTemplate.useMutation({
      onSuccess: data => {
        setUseTarget(null);
        setNewTournamentName("");
        void utils.personalTcr.listTournaments.invalidate();
        navigate(`/TCR/${data.createdTournament.id}`);
      },
    });
  const renameTemplate = trpc.personalTcr.renameTemplate.useMutation({
    onSuccess: async () => {
      setRenameTarget(null);
      await utils.personalTcr.listTemplates.invalidate();
      toast.success("Template renamed.");
    },
    onError: error => toast.error(error.message),
  });
  const setTemplateVisibility =
    trpc.personalTcr.setTemplateVisibility.useMutation({
      onSuccess: async () => {
        await utils.personalTcr.listTemplates.invalidate();
        toast.success("Template visibility updated.");
      },
      onError: error => toast.error(error.message),
    });
  const deleteTemplate = trpc.personalTcr.deleteTemplate.useMutation({
    onSuccess: async () => {
      setDeleteTarget(null);
      await utils.personalTcr.listTemplates.invalidate();
      toast.success("Template deleted.");
    },
    onError: error => toast.error(error.message),
  });

  const templates = useMemo(() => {
    const rows = query.data ?? [];
    const filtered =
      view === "mine"
        ? rows.filter(t => t.ownedByCurrentUser)
        : rows.filter(t => t.visibility === "public");
    return compact ? filtered.slice(0, 3) : filtered;
  }, [compact, query.data, view]);

  if (query.isLoading) return <TemplateState title="Loading templates…" />;
  if (query.error)
    return (
      <TemplateState
        title="Templates unavailable"
        description={getSafeTournamentControlErrorMessage(query.error.message)}
      />
    );

  return (
    <div className="rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)]/80 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-mono text-2xl font-black uppercase text-[var(--mt-gold-bright)]">
            Create from Template
          </h2>
          <p className="mt-1 text-sm text-[var(--mt-muted)]">
            Use public layouts or templates you saved from your own rooms.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "public" ? "default" : "outline"}
            className={
              view === "public" ? goldButtonClass : outlineButtonClass
            }
            onClick={() => setView("public")}
          >
            Public Templates
          </Button>
          <Button
            variant={view === "mine" ? "default" : "outline"}
            className={
              view === "mine" ? goldButtonClass : outlineButtonClass
            }
            onClick={() => setView("mine")}
          >
            My Templates
          </Button>
          {compact && (
            <Button
              asChild
              variant="outline"
              className={outlineButtonClass}
            >
              <Link href="/TCR/templates">Manage Templates</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map(template => (
          <article
            key={template.id}
            className="rounded-lg border border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-lg font-bold text-[var(--mt-off-white)]">
                  {template.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--mt-muted)]">
                  By {creatorName(template)}
                </p>
              </div>
              <span className="rounded-full border border-[var(--mt-gold)]/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--mt-gold-bright)]">
                {template.visibility}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--mt-muted)]">
              <div>
                <dt className="font-mono uppercase text-[var(--mt-muted)]">Updated</dt>
                <dd>{formatDate(template.updatedAt ?? template.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase text-[var(--mt-muted)]">Lobbies</dt>
                <dd>{template.lobbyCount}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className={goldButtonClass}
                onClick={() => {
                  setUseTarget(template);
                  setNewTournamentName(`${template.name} Tournament`);
                }}
              >
                Use Template
              </Button>
              {template.ownedByCurrentUser && !compact && (
                <>
                  <Button
                    variant="outline"
                    className={outlineButtonClass}
                    onClick={() => {
                      setRenameTarget(template);
                      setRenameValue(template.name);
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    className={outlineButtonClass}
                    disabled={setTemplateVisibility.isPending}
                    onClick={() =>
                      setTemplateVisibility.mutate({
                        templateId: template.id,
                        visibility:
                          template.visibility === "public"
                            ? "private"
                            : "public",
                      })
                    }
                  >
                    Make{" "}
                    {template.visibility === "public" ? "Private" : "Public"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteTarget(template)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {templates.length === 0 && (
        <TemplateState
          title={
            view === "mine"
              ? "No saved templates yet."
              : "No public templates yet."
          }
          description="Save a room as a template, or check back after organizers share public templates."
        />
      )}

      <Dialog
        open={useTarget !== null}
        onOpenChange={open => !open && setUseTarget(null)}
      >
        <DialogContent className="border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader>
            <DialogTitle className="font-mono text-[var(--mt-gold-bright)]">
              Use Template
            </DialogTitle>
            <DialogDescription>
              Create a new personal TCR from {useTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTournamentName}
            onChange={event => setNewTournamentName(event.target.value)}
            placeholder="New tournament name"
            className="border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]"
          />
          {createFromTemplate.error && (
            <p className="text-sm text-red-200">
              {createFromTemplate.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setUseTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className={goldButtonClass}
              disabled={
                !useTarget ||
                newTournamentName.trim().length < 2 ||
                createFromTemplate.isPending
              }
              onClick={() =>
                useTarget &&
                createFromTemplate.mutate({
                  templateId: useTarget.id,
                  name: newTournamentName,
                })
              }
            >
              Create Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameTarget !== null}
        onOpenChange={open => !open && setRenameTarget(null)}
      >
        <DialogContent className="border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader>
            <DialogTitle className="font-mono text-[var(--mt-gold-bright)]">
              Rename Template
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={event => setRenameValue(event.target.value)}
            className="border-[var(--mt-steel-line)] bg-[var(--mt-black)]/60 text-[var(--mt-off-white)]"
          />
          <DialogFooter>
            <Button
              className={goldButtonClass}
              disabled={
                !renameTarget ||
                renameValue.trim().length < 2 ||
                renameTemplate.isPending
              }
              onClick={() =>
                renameTarget &&
                renameTemplate.mutate({
                  templateId: renameTarget.id,
                  name: renameValue,
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={open => !open && setDeleteTarget(null)}
      >
        <DialogContent className="border-[var(--mt-gold)]/40 bg-[var(--mt-charcoal)] text-[var(--mt-off-white)]">
          <DialogHeader>
            <DialogTitle className="font-mono text-[var(--mt-gold-bright)]">
              Delete Template?
            </DialogTitle>
            <DialogDescription>
              This deletes the saved template only. Source tournaments and
              tournaments already created from it are not changed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className={outlineButtonClass}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteTarget || deleteTemplate.isPending}
              onClick={() =>
                deleteTarget &&
                deleteTemplate.mutate({ templateId: deleteTarget.id })
              }
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--mt-gold)]/25 bg-[var(--mt-black)]/40 p-6 text-center">
      <h3 className="font-mono text-lg font-black text-[var(--mt-gold-bright)]">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-[var(--mt-muted)]">{description}</p>
      )}
    </div>
  );
}

export default function TcrTemplatesPage() {
  const auth = useAuth();
  if (auth.loading) return <State title="Loading templates…" />;
  if (!auth.user || auth.user.loginMethod !== "discord")
    return (
      <State
        title="Discord sign-in required"
        description="Sign in with Discord to browse and manage TCR templates."
        showDiscordSignIn
      />
    );
  return (
    <section className="min-h-screen bg-[var(--mt-black)] px-6 py-12 text-[var(--mt-off-white)]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--mt-gold-bright)]">
              Tournament Organizer
            </p>
            <h1 className="mt-2 font-mono text-4xl font-black uppercase">
              TCR Templates
            </h1>
            <p className="mt-3 text-sm text-[var(--mt-muted)]">
              Browse public templates and manage your saved private or public
              layouts.
            </p>
          </div>
          <Button asChild className={goldButtonClass}>
            <Link href="/TCR">Back to TCR</Link>
          </Button>
        </div>
        <TcrTemplateBrowser />
      </div>
    </section>
  );
}

function State({
  title,
  description,
  showDiscordSignIn,
}: {
  title: string;
  description?: string;
  showDiscordSignIn?: boolean;
}) {
  return (
    <section className="min-h-screen bg-[var(--mt-black)] px-6 py-20 text-[var(--mt-off-white)]">
      <div className="mx-auto max-w-xl rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-8">
        <h1 className="font-mono text-2xl font-black text-[var(--mt-gold-bright)]">
          {title}
        </h1>
        {description && <p className="mt-3 text-[var(--mt-muted)]">{description}</p>}
        {showDiscordSignIn && (
          <a
            href={getDiscordLoginUrl()}
            className="mt-6 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-[var(--mt-gold)]"
          >
            Sign in with Discord
          </a>
        )}
      </div>
    </section>
  );
}
