interface StatDisplayProps {
  label: string;
  value: string;
}

export default function StatDisplay({ label, value }: StatDisplayProps) {
  return (
    <div className="mt-panel px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--mt-muted)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold text-[var(--mt-off-white)]">
        {value}
      </p>
    </div>
  );
}
