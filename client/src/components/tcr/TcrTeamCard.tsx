import { useRef } from "react";
import { GripVertical, Link as LinkIcon, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPlacement,
  type ControlTeamView,
  type DragPayload,
} from "./types";

/**
 * Draggable team card used in the Available Teams panel and inside lobby
 * slots. Preserves the existing HTML5 drag payload contract and the mobile
 * double-tap placement cycle.
 */
export default function TcrTeamCard({
  team,
  fromGameId,
  onDragStart,
  disabled,
  placement,
  selected,
  onSelect,
  onCyclePlacement,
  onCreateClaimLink,
  onDelete,
  deleteDisabled,
  onDragEnd,
  eliminated,
}: {
  team: ControlTeamView;
  fromGameId?: number;
  onDragStart: () => void;
  disabled?: boolean;
  placement?: number | null;
  selected?: boolean;
  onSelect?: () => void;
  onCyclePlacement?: () => void;
  onCreateClaimLink?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  onDragEnd?: () => void;
  eliminated?: boolean;
}) {
  const lastTouchTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null
  );

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      draggable={!disabled}
      data-no-node-drag="true"
      data-team-card="true"
      aria-label={
        onSelect
          ? `${team.name}${placement ? `, placed ${formatPlacement(placement)}` : ""}${eliminated ? ", eliminated" : ""}`
          : undefined
      }
      onClick={event => {
        event.stopPropagation();
        onSelect?.();
      }}
      onTouchEnd={event => {
        if (!onCyclePlacement || disabled) return;
        const touch = event.changedTouches.item(0);
        if (!touch) return;
        const now = window.performance.now();
        const previous = lastTouchTapRef.current;
        lastTouchTapRef.current = {
          time: now,
          x: touch.clientX,
          y: touch.clientY,
        };
        if (
          previous &&
          now - previous.time <= 320 &&
          Math.hypot(touch.clientX - previous.x, touch.clientY - previous.y) <=
            24
        ) {
          event.preventDefault();
          event.stopPropagation();
          lastTouchTapRef.current = null;
          onSelect?.();
          onCyclePlacement();
        }
      }}
      onKeyDown={event => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      onDragStart={event => {
        event.stopPropagation();
        if (disabled) return;
        const payload: DragPayload = { teamId: team.id, fromGameId };
        event.dataTransfer.setData("application/json", JSON.stringify(payload));
        onDragStart();
      }}
      onDragEnd={event => {
        event.stopPropagation();
        onDragEnd?.();
      }}
      className={`group rounded-md border px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 ${
        eliminated
          ? "border-red-400/50 bg-red-950/40 text-red-100"
          : "border-white/10 bg-white/5 hover:border-white/25"
      } ${selected ? "border-[#FFD700] ring-2 ring-[#FFD700]/50" : ""} ${
        disabled ? "opacity-75" : onSelect ? "cursor-pointer" : "cursor-grab"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {!disabled && (
          <GripVertical
            className="h-4 w-4 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
          {team.name}
        </span>
        {eliminated ? (
          <span className="shrink-0 rounded border border-red-300/50 bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-100">
            Out
          </span>
        ) : null}
        {placement ? (
          <span className="shrink-0 rounded bg-[#FFD700] px-1.5 py-0.5 text-[11px] font-bold text-black">
            {formatPlacement(placement)}
          </span>
        ) : null}
        {onCreateClaimLink ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/10 hover:text-[#FFD700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70"
                aria-label={`Copy claim link for ${team.name}`}
                onClick={event => {
                  event.stopPropagation();
                  onCreateClaimLink();
                }}
              >
                <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Copy team claim link — lets a captain claim this manual team
            </TooltipContent>
          </Tooltip>
        ) : null}
        {onDelete ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-red-950/60 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 disabled:pointer-events-none disabled:opacity-40"
                aria-label={`Delete team ${team.name}`}
                disabled={deleteDisabled}
                onClick={event => {
                  event.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete team…</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
