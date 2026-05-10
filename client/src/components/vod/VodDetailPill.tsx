export function VodDetailPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm text-white/85">{value}</div>
    </div>
  );
}
