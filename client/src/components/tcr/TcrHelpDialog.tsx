import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { tcrPanelHeadingClass } from "./tcrStyles";

type ShortcutRow = { keys: string[]; description: string };

const mouseRows: ShortcutRow[] = [
  { keys: ["Drag empty board"], description: "Pan around the bracket" },
  { keys: ["Shift", "Wheel"], description: "Zoom in and out" },
  { keys: ["Right-click empty board"], description: "Add a team or lobby" },
  { keys: ["Drag lobby header"], description: "Reposition a lobby" },
  { keys: ["Drag a team card"], description: "Place or move a team" },
  {
    keys: ["Drag W / L port"],
    description: "Connect winners or losers to the next lobby",
  },
  { keys: ["Double-click a connection"], description: "Remove the connection" },
];

const keyboardRows: ShortcutRow[] = [
  { keys: ["W", "A", "S", "D"], description: "Move around the canvas" },
  { keys: ["Ctrl", "Z"], description: "Undo the last board change" },
  { keys: ["1"], description: "…to 4 — set placement for the selected team" },
  { keys: ["0"], description: "Clear the selected team's placement" },
  { keys: ["Delete"], description: "Delete the selected lobby or connection" },
  { keys: ["Esc"], description: "Clear the current selection" },
];

const selectionRows: ShortcutRow[] = [
  { keys: ["Click lobby"], description: "Inspect and edit the lobby" },
  { keys: ["Click team in lobby"], description: "Inspect and set placement" },
  { keys: ["Ctrl", "Click lobby"], description: "Select lobbies for a group" },
  { keys: ["Click group header"], description: "Select the whole group" },
  { keys: ["Drag group header"], description: "Move the whole group" },
  { keys: ["Click empty board"], description: "Clear the selection" },
];

const touchRows: string[] = [
  "Long-press a team, lobby, or group header to open its options.",
  "Drag teams into lobbies or exact slots.",
  "Double-tap an assigned team to cycle its placement.",
  "Drag the empty grid background to pan.",
  "Pinch with two fingers to zoom the board.",
];

function ShortcutList({ rows }: { rows: ShortcutRow[] }) {
  return (
    <ul className="space-y-1.5">
      {rows.map(row => (
        <li
          key={row.description}
          className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5"
        >
          <span className="text-sm text-zinc-300">{row.description}</span>
          <KbdGroup className="shrink-0">
            {row.keys.map(key => (
              <Kbd key={key} className="bg-white/10 text-zinc-200">
                {key}
              </Kbd>
            ))}
          </KbdGroup>
        </li>
      ))}
    </ul>
  );
}

export default function TcrHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Control Room help</DialogTitle>
          <DialogDescription>
            The quickest workflow: add teams, add lobbies, drag teams into
            slots, connect lobbies with the W and L ports, then set placements
            when games finish.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <section aria-label="Mouse controls" className="space-y-2">
            <h3 className={tcrPanelHeadingClass}>Mouse</h3>
            <ShortcutList rows={mouseRows} />
          </section>
          <section aria-label="Keyboard controls" className="space-y-2">
            <h3 className={tcrPanelHeadingClass}>Keyboard</h3>
            <ShortcutList rows={keyboardRows} />
          </section>
          <section aria-label="Selection controls" className="space-y-2">
            <h3 className={tcrPanelHeadingClass}>Selecting things</h3>
            <ShortcutList rows={selectionRows} />
          </section>
          <section aria-label="Touch controls" className="space-y-2">
            <h3 className={tcrPanelHeadingClass}>Touch</h3>
            <ul className="space-y-1.5">
              {touchRows.map(row => (
                <li
                  key={row}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm text-zinc-300"
                >
                  {row}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Connections: <span className="font-semibold text-[#FFD700]">W</span>{" "}
          ports send winners forward and{" "}
          <span className="font-semibold text-slate-100">L</span> ports send
          losers to a lower bracket. If you lose track of the bracket, use{" "}
          <span className="font-medium text-zinc-300">Fit</span> in the toolbar
          to bring everything back into view.
        </p>
      </DialogContent>
    </Dialog>
  );
}
