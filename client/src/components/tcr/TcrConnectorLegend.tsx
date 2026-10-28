/**
 * Always-visible key for the two connector colors on the board.
 *
 * Winner and loser connections are drawn as gold (#FFD700) and near-white
 * (#F8FAFC) lines respectively, so without this key the flow direction is
 * carried by color alone — see the "color is never the only signal" rule in
 * tcrStyles.ts. The W / L ports on each lobby use the same two colors, so the
 * swatches here double as a key for those.
 *
 * Rendered as an overlay above the scrolling canvas and therefore
 * pointer-events-none: the board underneath handles panning and clicks, and a
 * previous overlay regression (a connector <svg> without pointer-events-none)
 * swallowed clicks on the elements below it.
 */

const rows = [
  { label: "W", meaning: "Winners advance", color: "#FFD700" },
  { label: "L", meaning: "Losers drop down", color: "#F8FAFC" },
] as const;

export default function TcrConnectorLegend() {
  return (
    <div
      aria-label="Connector legend"
      className="pointer-events-none absolute bottom-3 left-3 z-10 hidden select-none rounded-md border border-white/10 bg-black/75 px-2.5 py-2 shadow-lg shadow-black/50 backdrop-blur-sm sm:block"
    >
      <ul className="space-y-1">
        {rows.map(row => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span
              aria-hidden="true"
              className="w-3 text-center text-[11px] font-bold leading-none"
              style={{ color: row.color }}
            >
              {row.label}
            </span>
            <span className="text-[11px] leading-none text-zinc-400">
              {row.meaning}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
