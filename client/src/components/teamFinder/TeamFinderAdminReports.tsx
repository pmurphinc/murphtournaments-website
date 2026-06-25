import NeonCard from "@/components/NeonCard";
import { trpc } from "@/lib/trpc";
import { TEAM_FINDER_REPORT_REASON_LABELS } from "@shared/teamFinder";

const REASON_LABELS = TEAM_FINDER_REPORT_REASON_LABELS;

const STATUS_CLASS: Record<string, string> = {
  open: "border-neon-gold/60 text-neon-gold",
  reviewed: "border-neon-lime/60 text-neon-lime",
  dismissed: "border-white/30 text-white/50",
};

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function TeamFinderAdminReports() {
  const utils = trpc.useUtils();
  const reportsQuery = trpc.teamFinder.admin.listReports.useQuery(undefined, {
    staleTime: 1000 * 15,
  });

  const reviewMutation = trpc.teamFinder.admin.reviewReport.useMutation({
    onSuccess: async () => {
      await utils.teamFinder.admin.listReports.invalidate();
    },
  });

  const reports = reportsQuery.data ?? [];
  const openCount = reports.filter(r => r.status === "open").length;

  return (
    <NeonCard variant="magenta">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-xl font-bold uppercase text-neon-magenta">
          Moderation queue
        </h2>
        <span className="font-mono text-xs uppercase tracking-widest text-white/50">
          {openCount} open
        </span>
      </div>

      {reportsQuery.isLoading ? (
        <div className="h-24 animate-pulse rounded border border-white/10 bg-black/40" />
      ) : reports.length === 0 ? (
        <p className="font-mono text-sm text-white/60">
          No reports yet. The queue is clear.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map(report => (
            <li
              key={report.id}
              className="rounded border border-white/10 bg-black/40 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-white">
                  {report.listingTitle}
                </span>
                <span
                  className={`rounded-sm border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest ${
                    STATUS_CLASS[report.status] ??
                    "border-white/30 text-white/50"
                  }`}
                >
                  {report.status}
                </span>
              </div>
              <p className="font-mono text-xs text-white/70">
                Reason: {REASON_LABELS[report.reason] ?? report.reason}
              </p>
              {report.details ? (
                <p className="mt-1 font-mono text-xs text-white/60">
                  “{report.details}”
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[11px] text-white/40">
                Listing #{report.listingId} · {formatDate(report.createdAt)}
              </p>
              {report.status === "open" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        id: report.id,
                        status: "reviewed",
                      })
                    }
                    className="rounded-sm border border-neon-lime/60 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-neon-lime transition-colors hover:bg-neon-lime/10 disabled:opacity-40"
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        id: report.id,
                        status: "dismissed",
                      })
                    }
                    className="rounded-sm border border-white/30 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </NeonCard>
  );
}
