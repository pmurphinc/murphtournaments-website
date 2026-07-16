import type { DragEvent } from "react";
import { Plus } from "lucide-react";
import TcrTeamCard from "./TcrTeamCard";
import { tcrPanelHeadingClass, tcrToolButtonClass } from "./tcrStyles";
import type { ControlTeamView } from "./types";

export type TcrTeamsPanelProps = {
  teams: ControlTeamView[];
  isFinalized: boolean;
  deletePending: boolean;
  onCreateTeam: () => void;
  onTeamDragStart: (teamId: number) => void;
  onTeamDragEnd: () => void;
  onCreateClaimLink: (teamId: number) => void;
  onDeleteTeam: (teamId: number, teamName: string) => void;
  /** Drag-over handler for returning assigned teams; page owns the rules. */
  onReturnDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onReturnDrop: (event: DragEvent<HTMLDivElement>) => void;
};

/**
 * Available Teams dock. The whole list is a drop target for returning an
 * assigned team to the pool (drag a team out of a lobby and drop it here).
 */
export default function TcrTeamsPanel(props: TcrTeamsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h2 className={tcrPanelHeadingClass}>
          Available Teams{" "}
          <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-300">
            {props.teams.length}
          </span>
        </h2>
        <button
          type="button"
          className={`${tcrToolButtonClass} h-8 text-[#FFD700] hover:text-[#FFD700]`}
          disabled={props.isFinalized}
          onClick={props.onCreateTeam}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Team
        </button>
      </div>
      <p className="shrink-0 px-3 pt-2 text-xs leading-relaxed text-zinc-500">
        Drag a team onto a lobby slot. Drop an assigned team back here to return
        it.
      </p>
      <div
        className="mx-2 mb-2 mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border border-dashed border-white/15 bg-white/[0.02] p-2 transition-colors"
        onDragOver={props.onReturnDragOver}
        onDrop={props.onReturnDrop}
      >
        {props.teams.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 p-3 text-sm leading-relaxed text-zinc-500">
            No teams are available. Teams assigned only to completed games
            return here automatically.
          </p>
        ) : (
          props.teams.map(team => (
            <TcrTeamCard
              key={team.id}
              team={team}
              onDragStart={() => props.onTeamDragStart(team.id)}
              onDragEnd={props.onTeamDragEnd}
              onCreateClaimLink={
                !team.managedTeamId
                  ? () => props.onCreateClaimLink(team.id)
                  : undefined
              }
              onDelete={() => props.onDeleteTeam(team.id, team.name)}
              deleteDisabled={props.deletePending}
            />
          ))
        )}
      </div>
    </div>
  );
}
