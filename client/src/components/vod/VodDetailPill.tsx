export function VodDetailPill({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded border border-white/10 bg-black/30 px-3 py-2 ${
        compact ? "sm:flex sm:items-center sm:justify-between sm:gap-3" : ""
      }`}
    >
      <div className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div
        className={`min-w-0 font-mono text-sm text-white/85 ${
          compact ? "mt-1 sm:mt-0 sm:text-right" : "mt-1"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
