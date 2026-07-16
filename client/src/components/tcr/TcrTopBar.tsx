import { Link } from "wouter";
import {
  ArrowLeft,
  BookmarkPlus,
  Crown,
  Link2,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Users,
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
import {
  tcrDangerMenuItemClass,
  tcrPrimaryButtonClass,
  tcrToolButtonClass,
} from "./tcrStyles";
import type { StaffMemberView } from "./types";

const alphaBadge = (
  <span
    className="inline-flex shrink-0 items-center rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-2 py-0.5 text-[11px] font-semibold text-[#FFD700]"
    title="Tournament Control Room is a work in progress"
  >
    ALPHA
  </span>
);

export type TcrTopBarProps = {
  tournamentName: string;
  eventStatus: string;
  currentStage: string;
  backHref: string;
  isFinalized: boolean;
  finalizedAtLabel: string | null;
  championName: string | null;
  onRenameTournament: () => void;
  // Sharing
  viewerLinkPending: boolean;
  onCopyViewerLink: () => void;
  onRegenerateViewerLink: () => void;
  // Template
  onSaveTemplate: () => void;
  // Finalization
  canFinalize: boolean;
  finalizePending: boolean;
  onFinalize: () => void;
  canUnlock: boolean;
  unlockPending: boolean;
  onUnlock: () => void;
  // Staff (personal mode, owner/admin only)
  canManageStaff: boolean;
  hasActiveStaffInvite: boolean;
  staffMembers: StaffMemberView[];
  staffInvitePending: boolean;
  onCreateStaffInvite: () => void;
  onRegenerateStaffInvite: () => void;
  onRevokeStaffInvite: () => void;
  removeStaffPending: boolean;
  onRemoveStaffMember: (memberId: number) => void;
};

function staffMemberName(member: StaffMemberView) {
  return (
    member.user.discordDisplayName ||
    member.user.discordUsername ||
    member.user.name ||
    `User ${member.user.id}`
  );
}

export default function TcrTopBar(props: TcrTopBarProps) {
  const finalizedSummary = props.isFinalized
    ? `Finalized${props.championName ? ` — Champion: ${props.championName}` : ""}${props.finalizedAtLabel ? ` · ${props.finalizedAtLabel}` : ""}`
    : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950 px-2 sm:px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={props.backHref}
            className={`${tcrToolButtonClass} shrink-0`}
            aria-label="Back to Tournament Rooms"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden md:inline">Rooms</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to Tournament Rooms</TooltipContent>
      </Tooltip>
      <div className="h-6 w-px shrink-0 bg-white/10" aria-hidden="true" />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-mono text-base font-bold tracking-normal text-zinc-50">
              {props.tournamentName}
            </h1>
            {!props.isFinalized && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`${tcrToolButtonClass} h-7 min-w-7 shrink-0`}
                    aria-label="Rename tournament"
                    onClick={props.onRenameTournament}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Rename tournament</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="hidden truncate text-xs text-zinc-400 sm:block">
            {props.eventStatus} · {props.currentStage}
          </p>
        </div>
        {alphaBadge}
        {props.isFinalized && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-2 py-0.5 text-[11px] font-semibold text-[#FFD700]">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Finalized
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">{finalizedSummary}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={tcrToolButtonClass}
                  aria-label="Share viewer bracket"
                >
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden lg:inline">Share</span>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Share the read-only viewer bracket
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Viewer bracket</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={props.viewerLinkPending}
              onClick={props.onCopyViewerLink}
            >
              <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Copy Viewer Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={tcrDangerMenuItemClass}
              disabled={props.viewerLinkPending}
              onClick={props.onRegenerateViewerLink}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Regenerate Viewer Link…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {props.canManageStaff && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={tcrToolButtonClass}
                    aria-label="Manage staff"
                  >
                    <Users className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden lg:inline">Staff</span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Invite Staff and manage members
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Staff invite
              </p>
              {props.hasActiveStaffInvite ? (
                <div className="space-y-2 py-2">
                  <p className="rounded-md border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-1.5 text-xs font-medium text-[#FFD700]">
                    Staff invite active
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Regenerating creates a new single-use link and invalidates
                    the previous unclaimed invite.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-40"
                      disabled={props.staffInvitePending}
                      onClick={props.onRegenerateStaffInvite}
                    >
                      Regenerate & Copy Link
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-400/30 bg-red-950/30 px-2.5 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-950/60 disabled:opacity-40"
                      disabled={props.staffInvitePending}
                      onClick={props.onRevokeStaffInvite}
                    >
                      Revoke Invite
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Create a single-use staff invite and copy the fresh link.
                  </p>
                  <button
                    type="button"
                    className="rounded-md border border-[#FFD700]/40 bg-[#FFD700]/10 px-2.5 py-1.5 text-xs font-medium text-[#FFD700] transition-colors hover:bg-[#FFD700]/20 disabled:opacity-40"
                    disabled={props.staffInvitePending}
                    onClick={props.onCreateStaffInvite}
                  >
                    Create & Copy Invite Link
                  </button>
                </div>
              )}
              <DropdownMenuSeparator />
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Staff Members
                </p>
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                  {props.staffMembers.length ? (
                    props.staffMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-300"
                      >
                        <span className="min-w-0 truncate">
                          {staffMemberName(member)} ·{" "}
                          {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-red-300 transition-colors hover:bg-red-950/50 hover:text-red-200 disabled:opacity-40"
                          disabled={props.removeStaffPending}
                          onClick={() => props.onRemoveStaffMember(member.id)}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs text-zinc-500">
                      No staff members have joined yet
                    </p>
                  )}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!props.isFinalized && props.canFinalize && (
          <button
            type="button"
            className={`${tcrPrimaryButtonClass} hidden xl:inline-flex`}
            disabled={props.finalizePending}
            onClick={props.onFinalize}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Finalize
          </button>
        )}
        {props.isFinalized && props.canUnlock && (
          <button
            type="button"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-red-400/40 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/40 disabled:opacity-40 xl:inline-flex"
            disabled={props.unlockPending}
            onClick={props.onUnlock}
          >
            <LockOpen className="h-4 w-4" aria-hidden="true" />
            Unlock
          </button>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={tcrToolButtonClass}
                  aria-label="More tournament actions"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Tournament menu</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Tournament</DropdownMenuLabel>
            <DropdownMenuItem onClick={props.onSaveTemplate}>
              <BookmarkPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Save Template
            </DropdownMenuItem>
            {props.isFinalized && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1 font-medium text-[#FFD700]">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    {props.championName
                      ? `Champion: ${props.championName}`
                      : "Champion saved"}
                  </span>
                  {props.finalizedAtLabel && (
                    <span className="mt-0.5 block">
                      Finalized {props.finalizedAtLabel}
                    </span>
                  )}
                </div>
              </>
            )}
            {!props.isFinalized && props.canFinalize && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={props.finalizePending}
                  onClick={props.onFinalize}
                >
                  <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                  Finalize Tournament…
                </DropdownMenuItem>
              </>
            )}
            {props.isFinalized && props.canUnlock && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={tcrDangerMenuItemClass}
                  disabled={props.unlockPending}
                  onClick={props.onUnlock}
                >
                  <LockOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  Unlock for Editing…
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
