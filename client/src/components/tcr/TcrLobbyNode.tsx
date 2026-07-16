import { useState } from "react";
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  CircleDot,
  Radio,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DEFAULT_COMPETITIVE_MAP_IDS, THE_FINALS_MAPS } from "@/lib/finalsMaps";
import {
  getGameStatusClasses,
  hasOpenLobbySlot,
  isTeamEliminated,
  type CanvasPoint,
  type ConnectionFlowType,
  type GameStatus,
} from "@/lib/tournamentControlBoard";
import TcrTeamCard from "./TcrTeamCard";
import {
  formatPlacement,
  gameStatusLabels,
  getLobbyCapacity,
  getLobbyCodeMessage,
  getRecipientWarning,
  parseDragPayload,
  type AssignmentView,
  type ControlGameView,
  type ControlTeamView,
  type DragPayload,
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

const statuses: GameStatus[] = ["draft", "ready", "live", "complete"];

const statusIcons: Record<GameStatus, typeof CircleDashed> = {
  draft: CircleDashed,
  ready: CircleDot,
  live: Radio,
  complete: CheckCircle2,
};

export type TcrLobbyNodeProps = {
  game: ControlGameView;
  assignments: AssignmentView[];
  teamsById: ReadonlyMap<number, ControlTeamView>;
  tournamentName: string;
  discordConfigured: boolean;
  zoom: number;
  isMinimized: boolean;
  isSelected: boolean;
  isGroupSelected: boolean;
  isDragging: boolean;
  visualPosition: CanvasPoint;
  selectedAssignmentId: number | null;
  hasOutgoingLoserConnection: boolean;
  dragPayload: DragPayload | null;
  onNodeClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onNodePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onConnectorPointerDown: (
    flowType: ConnectionFlowType,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => void;
  onDropTeam: (payload: DragPayload, preferredSlotIndex?: number) => void;
  onToggleMinimize: () => void;
  onMeasureHeight: (height: number) => void;
  onSelectAssignment: (assignmentId: number) => void;
  onCyclePlacement: (assignment: AssignmentView) => void;
  onTeamDragStart: (teamId: number) => void;
  onTeamDragEnd: () => void;
  onRename: () => void;
  onEditLobbyCode: () => void;
  onEditBroadcast: () => void;
  onSetBestOf: (bestOf: 1 | 3 | 5) => void;
  onUpdateStatus: (status: GameStatus) => void;
  onRemoveAssignedTeams: () => void;
  onRequestDelete: () => void;
  onAutoFill: () => void;
  autoFillPending: boolean;
  onSetMap: (mapId: string | null) => void;
  onRandomizeMap: () => void;
  sendingTeamId: number | null;
  sendingLobby: boolean;
  onSendTeamCode: (teamId: number) => void;
  onSendLobbyCodes: () => void;
};

function CompactResultList({
  assignments,
  selectedAssignmentId,
  teamsById,
  game,
  hasOutgoingLoserConnection,
  onSelect,
}: {
  assignments: AssignmentView[];
  selectedAssignmentId: number | null;
  teamsById: ReadonlyMap<number, ControlTeamView>;
  game: ControlGameView;
  hasOutgoingLoserConnection: boolean;
  onSelect: (assignmentId: number) => void;
}) {
  const sortedAssignments = [...assignments].sort((a, b) => {
    const aPlacement = a.resultPlacement ?? 99;
    const bPlacement = b.resultPlacement ?? 99;
    if (aPlacement !== bPlacement) return aPlacement - bPlacement;
    return a.slotIndex - b.slotIndex;
  });

  if (sortedAssignments.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-white/15 p-3 text-sm text-zinc-500">
        No teams assigned.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {sortedAssignments.map(assignment => {
        const team = teamsById.get(assignment.teamId);
        const eliminated = isTeamEliminated({
          gameType: game.gameType,
          status: game.status,
          placement: assignment.resultPlacement,
          hasOutgoingLoserConnection,
        });
        return (
          <button
            key={assignment.id}
            type="button"
            data-no-node-drag="true"
            onClick={event => {
              event.stopPropagation();
              onSelect(assignment.id);
            }}
            className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 ${
              selectedAssignmentId === assignment.id
                ? "border-[#FFD700] bg-[#FFD700]/15"
                : eliminated
                  ? "border-red-400/60 bg-red-950/45 text-red-100 hover:border-red-300"
                  : "border-white/10 bg-black/40 hover:border-white/30"
            }`}
          >
            <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
              {team?.name ?? "Unknown team"}
            </span>
            <span className="shrink-0 text-xs text-zinc-400">
              {eliminated ? "Eliminated · " : ""}
              {assignment.resultPlacement
                ? formatPlacement(assignment.resultPlacement)
                : `Slot ${assignment.slotIndex}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LobbyCodeTools({
  tournamentName,
  game,
  assignments,
  teamsById,
  discordConfigured,
  sendingTeamId,
  sendingLobby,
  onSendTeam,
  onSendLobby,
}: {
  tournamentName: string;
  game: ControlGameView;
  assignments: AssignmentView[];
  teamsById: ReadonlyMap<number, ControlTeamView>;
  discordConfigured: boolean;
  sendingTeamId: number | null;
  sendingLobby: boolean;
  onSendTeam: (teamId: number) => void;
  onSendLobby: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasCode = Boolean(game.privateLobbyCode?.trim());
  const assignedTeams = assignments
    .map(assignment => teamsById.get(assignment.teamId))
    .filter((team): team is ControlTeamView => Boolean(team));
  const sendableTeams = assignedTeams.filter(
    team => !getRecipientWarning(team)
  );
  const sendDisabledReason = !hasCode
    ? "Set a lobby code before sending."
    : !discordConfigured
      ? "Discord sending is not configured on the server. Use Copy Message."
      : sendableTeams.length === 0
        ? "No assigned captains can receive Discord DMs."
        : null;
  const lobbyMessage = assignedTeams
    .map(team =>
      getLobbyCodeMessage(
        tournamentName,
        game.displayLabel,
        team.name,
        game.privateLobbyCode ?? ""
      )
    )
    .join("\n\n---\n\n");
  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Lobby code message copied");
  };

  return (
    <div
      data-no-node-drag="true"
      data-no-canvas-pan="true"
      className="mt-3 rounded-md border border-white/10 bg-black/30 p-2"
    >
      <button
        type="button"
        data-no-node-drag="true"
        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
        onClick={event => {
          event.stopPropagation();
          setExpanded(value => !value);
        }}
        aria-expanded={expanded}
      >
        <span className="text-xs font-semibold text-zinc-300">
          Lobby code DMs ({assignedTeams.length})
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 text-zinc-500"
            aria-hidden="true"
          />
        )}
      </button>
      {expanded && (
        <div className="mt-2">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="rounded-md border border-[#FFD700]/40 bg-[#FFD700]/10 px-2 py-1 text-xs font-medium text-[#FFD700] transition-colors hover:bg-[#FFD700]/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500"
              disabled={Boolean(sendDisabledReason) || sendingLobby}
              onClick={onSendLobby}
              title={
                sendDisabledReason ?? "Send to all assigned team captains."
              }
            >
              {sendingLobby ? "Sending…" : "Send Code to Lobby"}
            </button>
            {assignedTeams.length > 0 && hasCode && (
              <button
                type="button"
                className="rounded-md border border-white/15 px-2 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10"
                onClick={() => copyText(lobbyMessage)}
              >
                Copy Lobby Messages
              </button>
            )}
          </div>
          {sendDisabledReason && (
            <p className="mb-2 text-xs leading-relaxed text-amber-200/90">
              {sendDisabledReason}
            </p>
          )}
          <div className="space-y-1.5 pr-1">
            {assignedTeams.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Assign teams to send or copy lobby-code messages.
              </p>
            ) : (
              assignedTeams.map(team => {
                const warning = getRecipientWarning(team);
                const message = getLobbyCodeMessage(
                  tournamentName,
                  game.displayLabel,
                  team.name,
                  game.privateLobbyCode ?? ""
                );
                return (
                  <div
                    key={team.id}
                    className="rounded-md border border-white/10 bg-zinc-950/80 p-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-medium text-zinc-200">
                        {team.name}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded border border-white/15 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                          disabled={!hasCode}
                          onClick={() => copyText(message)}
                        >
                          Copy Message
                        </button>
                        <button
                          type="button"
                          className="rounded border border-[#FFD700]/40 bg-[#FFD700]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#FFD700] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-zinc-500"
                          disabled={
                            !hasCode ||
                            !discordConfigured ||
                            Boolean(warning) ||
                            sendingTeamId === team.id
                          }
                          onClick={() => onSendTeam(team.id)}
                          title={
                            !discordConfigured
                              ? "Discord sending is not configured on the server. Use Copy Message."
                              : (warning ?? "Send code to this team's captain.")
                          }
                        >
                          {sendingTeamId === team.id ? "Sending…" : "Send Code"}
                        </button>
                      </div>
                    </div>
                    {(warning || !hasCode || !discordConfigured) && (
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                        {!hasCode
                          ? "No lobby code set."
                          : !discordConfigured
                            ? "Discord sending not configured; use Copy Message."
                            : warning}
                      </p>
                    )}
                    {!warning && team.captainDisplayName && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Captain: {team.captainDisplayName}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A lobby card on the canvas. Pointer, drag, and connection behavior is
 * delegated to the page so the board math lives in one place.
 */
export default function TcrLobbyNode(props: TcrLobbyNodeProps) {
  const { game, assignments } = props;
  const capacity = getLobbyCapacity(game.gameType);
  const isComplete = game.status === "complete";
  const statusClasses = getGameStatusClasses(game.status);
  const StatusIcon = statusIcons[game.status];

  const handleDrop = (
    event: ReactDragEvent<HTMLElement>,
    preferredSlotIndex?: number
  ) => {
    if (isComplete) return;
    const payload =
      parseDragPayload(event.dataTransfer.getData("application/json")) ??
      props.dragPayload;
    if (!payload) return;
    props.onDropTeam(payload, preferredSlotIndex);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-control-node="true"
          onContextMenu={event => event.stopPropagation()}
          onClick={props.onNodeClick}
          onPointerDown={props.onNodePointerDown}
          onDragOver={event => {
            if (!isComplete) event.preventDefault();
          }}
          onDrop={event => handleDrop(event)}
          data-connection-target-game-id={game.id}
          className={`absolute z-10 w-80 cursor-default rounded-lg border bg-zinc-950/95 p-3.5 shadow-xl ${statusClasses.nodeBorder} ${statusClasses.accent} ${props.isGroupSelected ? "ring-4 ring-[#FFD700]" : ""} ${props.isDragging || props.isSelected ? "z-50 ring-2 ring-[#FFD700]/80" : ""}`}
          style={{
            left: props.visualPosition.x,
            top: props.visualPosition.y,
          }}
          ref={element => {
            if (!element) return;
            props.onMeasureHeight(
              Math.ceil(element.getBoundingClientRect().height / props.zoom)
            );
          }}
        >
          <button
            type="button"
            data-no-node-drag="true"
            data-input-port-game-id={game.id}
            title="Receive from previous lobby"
            aria-label={`${game.displayLabel} input port — drop a W or L connection here`}
            data-connector-port="true"
            data-game-id={game.id}
            data-port="top"
            className="absolute -top-3 left-1/2 z-20 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-[#FFD700] bg-black transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
          />
          {(["winner", "loser"] as const).map(flowType => (
            <button
              key={flowType}
              type="button"
              data-no-node-drag="true"
              title={`Drag to connect ${flowType === "winner" ? "winners" : "losers"} from this lobby`}
              aria-label={`Drag to connect ${flowType === "winner" ? "winners" : "losers"} from ${game.displayLabel}`}
              data-connector-port="true"
              data-game-id={game.id}
              data-port="bottom"
              data-flow-type={flowType}
              className={`absolute -bottom-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 font-mono text-[11px] font-black leading-none transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 ${
                flowType === "winner"
                  ? "left-[calc(50%-44px)] -translate-x-1/2 border-[#FFD700] bg-[#FFD700] text-black"
                  : "left-[calc(50%+44px)] -translate-x-1/2 border-slate-100 bg-slate-100 text-black"
              }`}
              onPointerDown={event =>
                props.onConnectorPointerDown(flowType, event)
              }
            >
              {flowType === "winner" ? "W" : "L"}
            </button>
          ))}
          <div
            data-node-drag-handle="true"
            className="mb-3 flex cursor-grab items-start justify-between gap-2 active:cursor-grabbing"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {game.gameType === "cashout" ? "Cashout Lobby" : "Final Round"}
              </p>
              <h3 className="truncate text-lg font-bold text-zinc-50">
                {game.displayLabel}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                data-no-node-drag="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
                onClick={event => {
                  event.stopPropagation();
                  props.onToggleMinimize();
                }}
                aria-label={
                  props.isMinimized
                    ? `Expand ${game.displayLabel}`
                    : `Minimize ${game.displayLabel}`
                }
                title={props.isMinimized ? "Expand lobby" : "Minimize lobby"}
              >
                {props.isMinimized ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {hasOpenLobbySlot(game, assignments.length) && (
                <button
                  type="button"
                  data-no-node-drag="true"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-400/30 bg-red-950/40 text-red-200 transition-colors hover:border-red-300 hover:bg-red-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70"
                  onClick={event => {
                    event.stopPropagation();
                    props.onRequestDelete();
                  }}
                  aria-label={`Delete ${game.displayLabel}`}
                  title="Delete lobby"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="mb-3 space-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${statusClasses.statusPill}`}
              >
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {gameStatusLabels[game.status]}
              </span>
              <select
                data-no-node-drag="true"
                className="h-7 min-w-0 flex-1 rounded-md border border-white/15 bg-zinc-900 px-1.5 text-xs text-zinc-200 outline-none transition-colors hover:border-white/30 focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
                value={game.mapId ?? ""}
                title="Select map"
                aria-label={`Map for ${game.displayLabel}`}
                onChange={event => {
                  event.stopPropagation();
                  const value = event.target.value;
                  if (value === "__random") {
                    props.onRandomizeMap();
                    return;
                  }
                  props.onSetMap(value || null);
                }}
              >
                <option value="">Map: TBD</option>
                <option value="__random">Randomize Map</option>
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
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              {game.broadcastUrl && (
                <span className="shrink-0 whitespace-nowrap rounded-md border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 text-[11px] font-medium text-cyan-100">
                  Broadcast Link Set
                </span>
              )}
              <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
                {game.gameType === "cashout"
                  ? "Places 1st–4th"
                  : `Places 1st–2nd · Best of ${game.seriesBestOf ?? 1}`}
              </span>
            </div>
          </div>
          {props.isMinimized ? (
            <CompactResultList
              assignments={assignments}
              selectedAssignmentId={props.selectedAssignmentId}
              teamsById={props.teamsById}
              game={game}
              hasOutgoingLoserConnection={props.hasOutgoingLoserConnection}
              onSelect={props.onSelectAssignment}
            />
          ) : (
            <div
              className="space-y-2"
              data-no-node-drag="true"
              onDragOver={event => {
                if (!isComplete) event.preventDefault();
              }}
              onDrop={event => handleDrop(event)}
            >
              {hasOpenLobbySlot(game, assignments.length) && (
                <button
                  type="button"
                  data-no-node-drag="true"
                  className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#FFD700]/40 bg-[#FFD700]/10 text-xs font-semibold text-[#FFD700] transition-colors hover:bg-[#FFD700]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40"
                  disabled={props.autoFillPending}
                  onClick={event => {
                    event.stopPropagation();
                    props.onAutoFill();
                  }}
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {props.autoFillPending ? "Auto-filling…" : "Auto-fill Lobby"}
                </button>
              )}
              {Array.from({ length: capacity }, (_, index) => {
                const slot = index + 1;
                const assignment = assignments.find(
                  item => item.slotIndex === slot
                );
                const team = assignment
                  ? props.teamsById.get(assignment.teamId)
                  : undefined;
                return (
                  <div
                    key={slot}
                    data-no-node-drag="true"
                    onDragOver={event => {
                      if (!isComplete) event.preventDefault();
                    }}
                    onDrop={event => {
                      if (isComplete) return;
                      event.stopPropagation();
                      handleDrop(event, slot);
                    }}
                    className="min-h-12 rounded-md border border-white/10 bg-black/40 p-1.5"
                  >
                    <p className="mb-1 text-[11px] font-medium text-zinc-500">
                      Slot {slot}
                    </p>
                    {team && assignment ? (
                      <TcrTeamCard
                        team={team}
                        fromGameId={isComplete ? undefined : game.id}
                        disabled={isComplete}
                        placement={assignment.resultPlacement ?? null}
                        selected={props.selectedAssignmentId === assignment.id}
                        onSelect={() => props.onSelectAssignment(assignment.id)}
                        onCyclePlacement={() =>
                          props.onCyclePlacement(assignment)
                        }
                        onDragStart={() => props.onTeamDragStart(team.id)}
                        onDragEnd={props.onTeamDragEnd}
                        eliminated={isTeamEliminated({
                          gameType: game.gameType,
                          status: game.status,
                          placement: assignment.resultPlacement,
                          hasOutgoingLoserConnection:
                            props.hasOutgoingLoserConnection,
                        })}
                      />
                    ) : (
                      <p className="text-sm text-zinc-500">
                        {isComplete
                          ? "Empty historical slot"
                          : "Drop team here"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!props.isMinimized && (
            <LobbyCodeTools
              tournamentName={props.tournamentName}
              game={game}
              assignments={assignments}
              teamsById={props.teamsById}
              discordConfigured={props.discordConfigured}
              sendingTeamId={props.sendingTeamId}
              sendingLobby={props.sendingLobby}
              onSendTeam={props.onSendTeamCode}
              onSendLobby={props.onSendLobbyCodes}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {isComplete ? (
          <>
            {statuses
              .filter(status => status !== "complete")
              .map(status => (
                <ContextMenuItem
                  key={status}
                  onClick={() => props.onUpdateStatus(status)}
                >
                  Reopen Game as {status}
                </ContextMenuItem>
              ))}
          </>
        ) : (
          <>
            <ContextMenuItem onClick={props.onRename}>
              Rename Game
            </ContextMenuItem>
            <ContextMenuItem onClick={props.onEditLobbyCode}>
              Set/Clear Lobby Code
            </ContextMenuItem>
            <ContextMenuItem onClick={props.onEditBroadcast}>
              Set/Clear Broadcast Link
            </ContextMenuItem>
            <ContextMenuSeparator />
            {game.gameType === "final_round" && (
              <>
                {([1, 3, 5] as const).map(value => (
                  <ContextMenuItem
                    key={value}
                    onClick={() => props.onSetBestOf(value)}
                  >
                    Set Final Round BO{value}
                  </ContextMenuItem>
                ))}
                <ContextMenuSeparator />
              </>
            )}
            {statuses.map(status => (
              <ContextMenuItem
                key={status}
                onClick={() => props.onUpdateStatus(status)}
              >
                Mark {status}
              </ContextMenuItem>
            ))}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={props.onRemoveAssignedTeams}>
              Remove Assigned Teams
            </ContextMenuItem>
            <ContextMenuItem
              className="text-red-300"
              onClick={props.onRequestDelete}
            >
              Delete Game
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
