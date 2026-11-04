import { useState } from "react";
import { Bug } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

/**
 * Site-wide bug reporting.
 *
 * Mounted once, beside the footer, so it is reachable from every page —
 * including the ones most likely to break. No account is required: the
 * visitor who cannot sign in is exactly the one with something to report.
 *
 * The page URL is captured rather than asked for; nobody describes where
 * they were as accurately as the address bar does.
 */

const MIN_SUMMARY = 8;
const MIN_DETAILS = 20;

export default function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);

  const submit = trpc.bugReports.submit.useMutation({
    onSuccess: () => {
      setSent(true);
      setSummary("");
      setDetails("");
      setContact("");
    },
  });

  const summaryShort = summary.trim().length < MIN_SUMMARY;
  const detailsShort = details.trim().length < MIN_DETAILS;
  const canSend = !summaryShort && !detailsShort && !submit.isPending;

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSent(false);
      submit.reset();
    }
  };

  return (
    <>
      <div className="flex justify-center border-t border-[var(--mt-steel-line)] py-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-9 gap-2 border-[var(--mt-steel-line)] font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)] hover:border-[var(--mt-gold)] hover:text-[var(--mt-gold-bright)]"
        >
          <Bug className="size-4" aria-hidden="true" />
          Report a bug
        </Button>
      </div>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {sent ? "Report sent" : "Report a bug"}
            </DialogTitle>
            <DialogDescription>
              {sent
                ? "Thanks — it is logged and will be looked at. You can close this."
                : "Tell us what went wrong. No account needed, and the page you are on is included automatically."}
            </DialogDescription>
            <DialogDescription className="text-[var(--mt-muted)]">
              {sent
                ? null
                : "What you write here is posted to our public issue tracker, so please leave out passwords and private links. Your Discord tag is kept private and never posted."}
            </DialogDescription>
          </DialogHeader>

          {sent ? null : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bug-summary"
                  className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]"
                >
                  What went wrong?
                </label>
                <Input
                  id="bug-summary"
                  value={summary}
                  maxLength={200}
                  placeholder="The bracket did not update after I scored a match"
                  onChange={event => setSummary(event.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="bug-details"
                  className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]"
                >
                  What were you doing?
                </label>
                <Textarea
                  id="bug-details"
                  value={details}
                  maxLength={5000}
                  rows={5}
                  placeholder="What you did, what you expected, and what happened instead."
                  onChange={event => setDetails(event.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label
                  htmlFor="bug-contact"
                  className="font-mono text-xs uppercase tracking-widest text-[var(--mt-muted)]"
                >
                  Discord tag (optional)
                </label>
                <Input
                  id="bug-contact"
                  value={contact}
                  maxLength={120}
                  placeholder="So we can ask a follow-up question"
                  onChange={event => setContact(event.target.value)}
                  className="mt-1"
                />
              </div>

              {submit.isError ? (
                <p className="text-sm text-[var(--mt-danger)]">
                  That did not send. Wait a moment and try again — reports are
                  limited to a few per minute.
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {sent ? (
              <Button type="button" onClick={() => close(false)}>
                Close
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canSend}
                onClick={() =>
                  submit.mutate({
                    summary: summary.trim(),
                    details: details.trim(),
                    contact: contact.trim() || undefined,
                    pageUrl:
                      typeof window === "undefined"
                        ? undefined
                        : window.location.href,
                  })
                }
              >
                {submit.isPending ? "Sending…" : "Send report"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
