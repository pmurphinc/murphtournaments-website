import {
  TEAM_FINDER_LIMITS,
  TEAM_FINDER_REPORT_REASONS,
  TEAM_FINDER_REPORT_REASON_LABELS,
  type TeamFinderReportReason,
} from "@shared/teamFinder";
import { X } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    reason: TeamFinderReportReason;
    details?: string;
    website: string;
  }) => void;
};

export default function ReportListingDialog({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState<TeamFinderReportReason>("spam");
  const [details, setDetails] = useState("");
  const [website, setWebsite] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-sm border-2 border-red-500/60 bg-dark-purple/95 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-mono text-xl font-bold uppercase text-red-300">
            Report listing
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            onSubmit({
              reason,
              details: details.trim() || undefined,
              website,
            });
          }}
        >
          <div>
            <label className="mb-2 block font-mono text-sm uppercase tracking-widest text-white/80">
              Reason
            </label>
            <select
              value={reason}
              onChange={e =>
                setReason(e.target.value as TeamFinderReportReason)
              }
              className="w-full rounded border border-red-500/40 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-red-400"
              disabled={submitting}
            >
              {TEAM_FINDER_REPORT_REASONS.map(r => (
                <option key={r} value={r}>
                  {TEAM_FINDER_REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-mono text-sm uppercase tracking-widest text-white/80">
              Details (optional)
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.reportDetails}
              rows={3}
              className="w-full resize-y rounded border border-red-500/40 bg-black/60 px-3 py-2 font-mono text-white outline-none focus:border-red-400"
              placeholder="Anything the moderators should know."
              disabled={submitting}
            />
          </div>

          <div className="hidden" aria-hidden="true">
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={e => setWebsite(e.target.value)}
            />
          </div>

          {error ? (
            <p className="font-mono text-xs text-red-300">{error}</p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-sm border-2 border-red-500/70 px-5 py-2.5 font-mono font-bold uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-sm border border-white/30 px-5 py-2.5 font-mono uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
