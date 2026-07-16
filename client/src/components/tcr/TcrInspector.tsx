import type { ReactNode } from "react";
import {
  Boxes,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Crown,
  Group,
  Lock,
  LockOpen,
  LayoutGrid,
  Pencil,
  Plus,
  Radio,
  Shuffle,
  Trash2,
  Undo2,
  Unlink,
  UserMinus,
  Wand2,
} from "lucide-react";
import { DEFAULT_COMPETITIVE_MAP_IDS, THE_FINALS_MAPS } from "@/lib/finalsMaps";
import {
  roundFrameColorIds,
  roundFrameThemes,
  type GameStatus,
  type RoundFrameColorId,
  type ScoreboardRow,
} from "@/lib/tournamentControlBoard";
import {
  tcrDangerButtonClass,
  tcrFieldLabelClass,
  tcrPanelHeadingClass,
  tcrPrimaryButtonClass,
  tcrSecondaryButtonClass,
  tcrSelectClass,
} from "./tcrStyles";
import {
  formatPlacement,
  gameStatusLabels,
  type ControlGameView,
  type ControlTeamView,
  type InspectorSelection,
} from "./types";

const competitiveMaps = THE_FINALS_MAPS.filter(map =>
  DEFAULT_COMPETITIVE_MAP_IDS.includes(map.id)
);
const competitiveMapIds: ReadonlySet<string> = new Set(
  DEFAULT_COMPETITIVE_MAP_IDS
);
const mapsById: ReadonlyMap<string, string> = new Map(
  THE_FINALS_MAPS.map(map => [map.id, map.name])
);

const statusOrder: GameStatus[] = ["draft", "ready", "live", "complete"];

const statusMeta: Record<
  GameStatus,
  { icon: typeof CircleDashed; activeClass: string }
> = {
  draft: {
    icon: CircleDashed,
    activeClass: "border-zinc-400/70 bg-zinc-500/20 text-zinc-100",
  },
  ready: {
    icon: CircleDot,
    activeClass: "border-yellow-300/70 bg-yellow-300/15 text-yellow-100",
  },
  live: {
    icon: Radio,
    activeClass: "border-emerald-400/70 bg-emerald-400/15 text-emerald-100",
  },
  complete: {
    icon: CheckCircle2,
    activeClass: "border-red-400/70 bg-red-500/15 text-red-100",
  },
};

export type TcrInspectorTab = "inspect" | "score";

export type TcrInspectorProps = {
  selection: InspectorSelection;
  isFinalized: boolean;
  tab: TcrInspectorTab;
  onTabChange: (tab: TcrInspectorTab) => void;
  scoreboardRows: ScoreboardRow[];
  championTeamId: number | null;
  teamsById: ReadonlyMap<number, ControlTeamView>;
  // Board quick actions (empty selection)
  onCreateTeam: () => void;
  onCreateCashoutLobby: () => void;
  onCreateFinalRoundMatch: () => void;
  onOpenHelp: () => void;
  // Lobby actions
  onRenameLobby: (game: ControlGameView) => void;
  onSetStatus: (gameId: number, status: GameStatus) => void;
  onSetMap: (gameId: number, mapId: string | null) => void;
  onRandomizeMap: (gameId: number) => void;
  onSetBestOf: (gameId: number, bestOf: 1 | 3 | 5) => void;
  onEditLobbyCode: (game: ControlGameView) => void;
  onEditBroadcast: (game: ControlGameView) => void;
  onAutoFill: (gameId: number) => void;
  autoFillPending: boolean;
  onRemoveAssignedTeams: (gameId: number) => void;
  onDeleteLobby: (game: ControlGameView) => void;
  onSelectAssignment: (assignmentId: number) => void;
  // Assignment actions
  onSetPlacement: (assignmentId: number, placement: number | null) => void;
  onReturnTeamToAvailable: (gameId: number, teamId: number) => void;
  // Connection actions
  onDeleteConnection: (connectionId: number) => void;
  // Group actions
  onCreateGroup: () => void;
  onRenameGroup: () => void;
  onAddSelectedToGroup: () => void;
  onRemoveFromGroup: () => void;
  onClearGroupSelection: () => void;
  onSetGroupColor: (colorId: RoundFrameColorId) => void;
  onToggleGroupLock: () => void;
  onOrganizeGroup: () => void;
  onDeleteGroup: () => void;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className={tcrPanelHeadingClass}>{children}</h3>;
}

function LobbySection(props: TcrInspectorProps) {
  if (props.selection.kind !== "lobby") return null;
  const { game, assignments, capacity } = props.selection;
  const locked = props.isFinalized;
  const isComplete = game.status === "complete";
  const hasOpenSlot = !isComplete && assignments.length < capacity;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500">
            {game.gameType === "cashout"
              ? "Cashout Lobby · places 1st–4th"
              : `Final Round · places 1st–2nd · Best of ${game.seriesBestOf ?? 1}`}
          </p>
          <h3 className="truncate text-base font-semibold text-zinc-50">
            {game.displayLabel}
          </h3>
        </div>
        <button
          type="button"
          className={`${tcrSecondaryButtonClass} h-8 shrink-0 px-2`}
          disabled={locked || isComplete}
          onClick={() => props.onRenameLobby(game)}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Rename
        </button>
      </div>

      <div className="space-y-1.5">
        <span className={tcrFieldLabelClass} id={`status-label-${game.id}`}>
          Status
        </span>
        <div
          role="group"
          aria-labelledby={`status-label-${game.id}`}
          className="grid grid-cols-2 gap-1.5"
        >
          {statusOrder.map(status => {
            const meta = statusMeta[status];
            const Icon = meta.icon;
            const active = game.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                disabled={locked}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40 ${
                  active
                    ? meta.activeClass
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                }`}
                onClick={() => props.onSetStatus(game.id, status)}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {isComplete && !active
                  ? `Reopen as ${gameStatusLabels[status]}`
                  : gameStatusLabels[status]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={tcrFieldLabelClass} htmlFor={`map-${game.id}`}>
          Map
        </label>
        <div className="flex gap-1.5">
          <select
            id={`map-${game.id}`}
            className={tcrSelectClass}
            value={game.mapId ?? ""}
            disabled={locked}
            onChange={event =>
              props.onSetMap(game.id, event.target.value || null)
            }
          >
            <option value="">Map: TBD</option>
            {game.mapId && !competitiveMapIds.has(game.mapId) && (
              <option value={game.mapId}>
                Legacy map: {mapsById.get(game.mapId) ?? game.mapId}
              </option>
            )}
            {competitiveMaps.map(map => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${tcrSecondaryButtonClass} shrink-0 px-2.5`}
            aria-label="Randomize map"
            title="Randomize map"
            disabled={locked}
            onClick={() => props.onRandomizeMap(game.id)}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {game.gameType === "final_round" && (
        <div className="space-y-1.5">
          <span className={tcrFieldLabelClass} id={`bestof-label-${game.id}`}>
            Series length
          </span>
          <div
            role="group"
            aria-labelledby={`bestof-label-${game.id}`}
            className="grid grid-cols-3 gap-1.5"
          >
            {([1, 3, 5] as const).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={(game.seriesBestOf ?? 1) === value}
                disabled={locked || isComplete}
                className={`h-9 rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40 ${
                  (game.seriesBestOf ?? 1) === value
                    ? "border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                }`}
                onClick={() => props.onSetBestOf(game.id, value)}
              >
                Best of {value}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className={tcrSecondaryButtonClass}
          disabled={locked || isComplete}
          onClick={() => props.onEditLobbyCode(game)}
        >
          {game.privateLobbyCode ? "Edit Lobby Code" : "Set Lobby Code"}
        </button>
        <button
          type="button"
          className={tcrSecondaryButtonClass}
          disabled={locked || isComplete}
          onClick={() => props.onEditBroadcast(game)}
        >
          {game.broadcastUrl ? "Edit Broadcast" : "Set Broadcast"}
        </button>
      </div>
      {game.privateLobbyCode && (
        <p className="text-xs text-zinc-500">
          Lobby code:{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-zinc-200">
            {game.privateLobbyCode}
          </code>{" "}
          — send it to captains from the lobby card on the canvas.
        </p>
      )}

      <div className="space-y-1.5">
        <SectionTitle>
          Teams ({assignments.length}/{capacity})
        </SectionTitle>
        {hasOpenSlot && (
          <button
            type="button"
            className={`${tcrSecondaryButtonClass} w-full`}
            disabled={locked || props.autoFillPending}
            onClick={() => props.onAutoFill(game.id)}
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            {props.autoFillPending ? "Auto-filling…" : "Auto-fill open slots"}
          </button>
        )}
        {assignments.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 p-2.5 text-sm text-zinc-500">
            Drag teams from Available Teams onto this lobby.
          </p>
        ) : (
          <ul className="space-y-1">
            {assignments
              .slice()
              .sort((a, b) => a.slotIndex - b.slotIndex)
              .map(assignment => {
                const team = props.teamsById.get(assignment.teamId);
                return (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
                      onClick={() => props.onSelectAssignment(assignment.id)}
                    >
                      <span className="min-w-0 truncate font-medium text-zinc-200">
                        {team?.name ?? "Unknown team"}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {assignment.resultPlacement
                          ? formatPlacement(assignment.resultPlacement)
                          : `Slot ${assignment.slotIndex}`}
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {!locked && (
        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <SectionTitle>Danger zone</SectionTitle>
          <div className="grid gap-1.5">
            <button
              type="button"
              className={tcrDangerButtonClass}
              disabled={isComplete || assignments.length === 0}
              onClick={() => props.onRemoveAssignedTeams(game.id)}
            >
              <UserMinus className="h-4 w-4" aria-hidden="true" />
              Remove Assigned Teams
            </button>
            <button
              type="button"
              className={tcrDangerButtonClass}
              onClick={() => props.onDeleteLobby(game)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Lobby…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssignmentSection(props: TcrInspectorProps) {
  if (props.selection.kind !== "assignment") return null;
  const { assignment, game, team, capacity, eliminated } = props.selection;
  const locked = props.isFinalized;
  const current = assignment.resultPlacement ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-500">
          Team in {game.displayLabel} · Slot {assignment.slotIndex}
        </p>
        <h3 className="flex items-center gap-2 truncate text-base font-semibold text-zinc-50">
          {team?.name ?? "Unknown team"}
          {eliminated && (
            <span className="rounded border border-red-300/50 bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-100">
              Eliminated
            </span>
          )}
        </h3>
      </div>

      <div className="space-y-1.5">
        <span className={tcrFieldLabelClass} id="placement-label">
          Placement
        </span>
        <div
          role="group"
          aria-labelledby="placement-label"
          className={`grid gap-1.5 ${capacity === 4 ? "grid-cols-5" : "grid-cols-3"}`}
        >
          {Array.from({ length: capacity }, (_, index) => index + 1).map(
            placement => (
              <button
                key={placement}
                type="button"
                aria-pressed={current === placement}
                disabled={locked}
                className={`h-9 rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40 ${
                  current === placement
                    ? "border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/10"
                }`}
                onClick={() => props.onSetPlacement(assignment.id, placement)}
              >
                {formatPlacement(placement)}
              </button>
            )
          )}
          <button
            type="button"
            disabled={locked || current === null}
            className="h-9 rounded-md border border-white/10 bg-white/[0.03] text-sm font-medium text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40"
            onClick={() => props.onSetPlacement(assignment.id, null)}
          >
            Clear
          </button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          Keyboard: press 1–{capacity} to place, 0 to clear.
        </p>
      </div>

      {!locked && game.status !== "complete" && (
        <button
          type="button"
          className={`${tcrSecondaryButtonClass} w-full`}
          onClick={() =>
            props.onReturnTeamToAvailable(game.id, assignment.teamId)
          }
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          Return to Available Teams
        </button>
      )}
    </div>
  );
}

function ConnectionSection(props: TcrInspectorProps) {
  if (props.selection.kind !== "connection") return null;
  const { connection, sourceLabel, targetLabel } = props.selection;
  const isLoser = connection.flowType === "loser";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-500">Connection</p>
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-50">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
              isLoser ? "bg-slate-100 text-black" : "bg-[#FFD700] text-black"
            }`}
            aria-hidden="true"
          >
            {isLoser ? "L" : "W"}
          </span>
          {isLoser ? "Losers advance" : "Winners advance"}
        </h3>
      </div>
      <p className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-sm text-zinc-300">
        <span className="font-medium text-zinc-100">{sourceLabel}</span>
        <span className="mx-2 text-zinc-500" aria-hidden="true">
          →
        </span>
        <span className="font-medium text-zinc-100">{targetLabel}</span>
      </p>
      {!props.isFinalized && (
        <button
          type="button"
          className={`${tcrDangerButtonClass} w-full`}
          onClick={() => props.onDeleteConnection(connection.id)}
        >
          <Unlink className="h-4 w-4" aria-hidden="true" />
          Delete Connection
        </button>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">
        Tip: you can also press Delete with a connection selected, or
        double-click it on the canvas.
      </p>
    </div>
  );
}

function GroupSection(props: TcrInspectorProps) {
  if (props.selection.kind !== "group") return null;
  const { gameIds, group } = props.selection;
  const locked = props.isFinalized;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-500">
          {gameIds.length} {gameIds.length === 1 ? "lobby" : "lobbies"} selected
        </p>
        <h3 className="truncate text-base font-semibold text-zinc-50">
          {group ? group.label : "Lobby selection"}
        </h3>
      </div>

      {!group && (
        <button
          type="button"
          className={`${tcrPrimaryButtonClass} w-full`}
          disabled={locked || gameIds.length < 2}
          onClick={props.onCreateGroup}
        >
          <Group className="h-4 w-4" aria-hidden="true" />
          Create Group
        </button>
      )}
      {!group && gameIds.length < 2 && (
        <p className="text-xs leading-relaxed text-zinc-500">
          Ctrl/Shift-click more lobbies to group at least two together.
        </p>
      )}

      {group && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className={tcrSecondaryButtonClass}
              disabled={locked}
              onClick={props.onRenameGroup}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Rename
            </button>
            <button
              type="button"
              className={tcrSecondaryButtonClass}
              disabled={locked}
              onClick={props.onToggleGroupLock}
            >
              {group.locked ? (
                <>
                  <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Unlock
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Lock
                </>
              )}
            </button>
            <button
              type="button"
              className={tcrSecondaryButtonClass}
              disabled={locked}
              onClick={props.onAddSelectedToGroup}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Selected
            </button>
            <button
              type="button"
              className={tcrSecondaryButtonClass}
              disabled={locked}
              onClick={props.onOrganizeGroup}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Organize
            </button>
          </div>

          <div className="space-y-1.5">
            <span className={tcrFieldLabelClass} id="group-color-label">
              Group color
            </span>
            <div
              role="group"
              aria-labelledby="group-color-label"
              className="flex flex-wrap gap-1.5"
            >
              {roundFrameColorIds.map(colorId => (
                <button
                  key={colorId}
                  type="button"
                  aria-label={`Set group color to ${colorId}`}
                  aria-pressed={group.colorId === colorId}
                  disabled={locked}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40 ${
                    group.colorId === colorId
                      ? "border-[#FFD700]/70 bg-[#FFD700]/10 text-zinc-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/10"
                  }`}
                  onClick={() => props.onSetGroupColor(colorId)}
                >
                  <span
                    className={`inline-block h-3 w-3 rounded-full border ${roundFrameThemes[colorId].label}`}
                    aria-hidden="true"
                  />
                  {colorId}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5 border-t border-white/10 pt-3">
            <button
              type="button"
              className={tcrSecondaryButtonClass}
              disabled={locked}
              onClick={props.onRemoveFromGroup}
            >
              Remove Selected From Group
            </button>
            <button
              type="button"
              className={tcrDangerButtonClass}
              disabled={locked}
              onClick={props.onDeleteGroup}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Group…
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        className={`${tcrSecondaryButtonClass} w-full`}
        onClick={props.onClearGroupSelection}
      >
        Clear Selection
      </button>
    </div>
  );
}

function BoardSection(props: TcrInspectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-zinc-500">Nothing selected</p>
        <h3 className="text-base font-semibold text-zinc-50">Board</h3>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">
        Select a lobby, team, connection, or group on the canvas to edit it
        here.
      </p>
      {!props.isFinalized && (
        <div className="grid gap-1.5">
          <button
            type="button"
            className={tcrSecondaryButtonClass}
            onClick={props.onCreateTeam}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Team…
          </button>
          <button
            type="button"
            className={tcrSecondaryButtonClass}
            onClick={props.onCreateCashoutLobby}
          >
            <Boxes className="h-4 w-4" aria-hidden="true" />
            New Cashout Lobby
          </button>
          <button
            type="button"
            className={tcrSecondaryButtonClass}
            onClick={props.onCreateFinalRoundMatch}
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
            New Final Round Match
          </button>
        </div>
      )}
      <button
        type="button"
        className="text-left text-sm font-medium text-[#FFD700] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
        onClick={props.onOpenHelp}
      >
        Open Help for controls and shortcuts
      </button>
    </div>
  );
}

function ScoreboardSection(props: TcrInspectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-zinc-500">
        Counts completed lobby results only. Every tournament team is listed.
      </p>
      {props.scoreboardRows.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/15 p-3 text-sm text-zinc-500">
          No teams yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {props.scoreboardRows.map(row => (
            <li
              key={row.teamId}
              className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-zinc-200">
                {props.championTeamId === row.teamId && (
                  <Crown
                    className="h-3.5 w-3.5 shrink-0 text-[#FFD700]"
                    aria-label="Champion"
                  />
                )}
                {row.teamName}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                <span className="font-semibold text-emerald-200">
                  {row.wins} W
                </span>
                <span className="mx-1 text-zinc-600">·</span>
                <span className="font-semibold text-red-200">
                  {row.losses} L
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Context-sensitive inspector. Shows controls for whatever is selected on
 * the canvas, plus a Scoreboard tab. Rendered inside the right dock on
 * desktop and the bottom dock on smaller screens.
 */
export default function TcrInspector(props: TcrInspectorProps) {
  const selectionTitle =
    props.selection.kind === "lobby"
      ? "Lobby"
      : props.selection.kind === "assignment"
        ? "Team"
        : props.selection.kind === "connection"
          ? "Connection"
          : props.selection.kind === "group"
            ? "Group"
            : "Inspect";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Inspector panels"
        className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={props.tab === "inspect"}
          className={`h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 ${
            props.tab === "inspect"
              ? "bg-[#FFD700]/15 text-[#FFD700]"
              : "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          }`}
          onClick={() => props.onTabChange("inspect")}
        >
          {selectionTitle}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={props.tab === "score"}
          className={`h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 ${
            props.tab === "score"
              ? "bg-[#FFD700]/15 text-[#FFD700]"
              : "text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
          }`}
          onClick={() => props.onTabChange("score")}
        >
          Scoreboard
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {props.tab === "score" ? (
          <ScoreboardSection {...props} />
        ) : props.selection.kind === "lobby" ? (
          <LobbySection {...props} />
        ) : props.selection.kind === "assignment" ? (
          <AssignmentSection {...props} />
        ) : props.selection.kind === "connection" ? (
          <ConnectionSection {...props} />
        ) : props.selection.kind === "group" ? (
          <GroupSection {...props} />
        ) : (
          <BoardSection {...props} />
        )}
      </div>
    </div>
  );
}
