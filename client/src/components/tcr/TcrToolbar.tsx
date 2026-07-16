import type { ReactNode } from "react";
import {
  CircleHelp,
  Eraser,
  Magnet,
  Maximize2,
  PanelLeft,
  PanelRight,
  Plus,
  SlidersHorizontal,
  Undo2,
  Unlink,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import {
  tcrDangerMenuItemClass,
  tcrToolButtonActiveClass,
  tcrToolButtonClass,
} from "./tcrStyles";

export type TcrToolbarProps = {
  isFinalized: boolean;
  // Creation
  onCreateTeam: () => void;
  onCreateCashoutLobby: () => void;
  onCreateFinalRoundMatch: () => void;
  // Undo
  canUndo: boolean;
  onUndo: () => void;
  // View
  zoomPercent: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToContent: () => void;
  fitLabel: string;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  // Help + board actions
  onOpenHelp: () => void;
  onBulkDeleteConnections: () => void;
  onBulkReturnTeams: () => void;
  onBulkWipeCanvas: () => void;
  // Panels
  teamCount: number;
  teamsOpen: boolean;
  onToggleTeams: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
};

function ToolButton({
  label,
  shortcut,
  active,
  onClick,
  disabled,
  children,
  className,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`${tcrToolButtonClass} ${active ? tcrToolButtonActiveClass : ""} ${className ?? ""}`}
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-1.5">
        {label}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return (
    <div className="mx-0.5 h-6 w-px shrink-0 bg-white/10" aria-hidden="true" />
  );
}

export default function TcrToolbar(props: TcrToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Board tools"
      className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-white/10 bg-zinc-950 px-1.5"
    >
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`${tcrToolButtonClass} text-[#FFD700] hover:text-[#FFD700]`}
                aria-label="Add team or lobby"
                disabled={props.isFinalized}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Add a team or lobby (or right-click the canvas)
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Add to board</DropdownMenuLabel>
          <DropdownMenuItem onClick={props.onCreateTeam}>
            New Team…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={props.onCreateCashoutLobby}>
            Cashout Lobby
            <span className="ml-auto text-xs text-zinc-500">4 teams</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={props.onCreateFinalRoundMatch}>
            Final Round Match
            <span className="ml-auto text-xs text-zinc-500">2 teams</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolButton
        label="Undo last board change"
        shortcut="Ctrl+Z"
        onClick={props.onUndo}
        disabled={!props.canUndo}
      >
        <Undo2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Undo</span>
      </ToolButton>

      <Divider />

      <ToolButton
        label="Zoom out"
        onClick={props.onZoomOut}
        disabled={!props.canZoomOut}
      >
        <ZoomOut className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <span
        className="min-w-12 shrink-0 text-center font-mono text-xs tabular-nums text-zinc-400"
        aria-label={`Zoom ${props.zoomPercent}%`}
      >
        {props.zoomPercent}%
      </span>
      <ToolButton
        label="Zoom in"
        onClick={props.onZoomIn}
        disabled={!props.canZoomIn}
      >
        <ZoomIn className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label={props.fitLabel} onClick={props.onFitToContent}>
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Fit</span>
      </ToolButton>
      <ToolButton
        label={props.snapToGrid ? "Snap to grid: on" : "Snap to grid: off"}
        active={props.snapToGrid}
        onClick={props.onToggleSnap}
      >
        <Magnet className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Snap</span>
      </ToolButton>

      <Divider />

      <ToolButton label="Help and controls" onClick={props.onOpenHelp}>
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">Help</span>
      </ToolButton>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={tcrToolButtonClass}
                aria-label="Board reset actions"
                disabled={props.isFinalized}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Board</span>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Board reset actions (asks to confirm)
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Reset the board</DropdownMenuLabel>
          <DropdownMenuItem
            className={tcrDangerMenuItemClass}
            onClick={props.onBulkDeleteConnections}
          >
            <Unlink className="mr-2 h-4 w-4" aria-hidden="true" />
            Delete All Connections…
          </DropdownMenuItem>
          <DropdownMenuItem
            className={tcrDangerMenuItemClass}
            onClick={props.onBulkReturnTeams}
          >
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
            Return All Teams to Available…
          </DropdownMenuItem>
          <DropdownMenuItem
            className={tcrDangerMenuItemClass}
            onClick={props.onBulkWipeCanvas}
          >
            <Eraser className="mr-2 h-4 w-4" aria-hidden="true" />
            Wipe Canvas…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-0.5">
        <ToolButton
          label={`${props.teamsOpen ? "Hide" : "Show"} Available Teams (${props.teamCount})`}
          active={props.teamsOpen}
          onClick={props.onToggleTeams}
        >
          <PanelLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Teams</span>
          <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums">
            {props.teamCount}
          </span>
        </ToolButton>
        <ToolButton
          label={`${props.inspectorOpen ? "Hide" : "Show"} the Inspect and Scoreboard panel`}
          active={props.inspectorOpen}
          onClick={props.onToggleInspector}
        >
          <PanelRight className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Panel</span>
        </ToolButton>
      </div>
    </div>
  );
}
