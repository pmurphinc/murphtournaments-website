import { TRPCError } from "@trpc/server";

export type TournamentTeamSubmissionStatus = "pending" | "approved" | "rejected";

export function assertManagedTeamSubmissionAllowed(input: {
  isCaptain: boolean;
  registrationOpen: boolean;
  hasExistingSubmission: boolean;
}) {
  if (!input.isCaptain) throw new TRPCError({ code: "FORBIDDEN", message: "Only a managed team captain can submit this team." });
  if (!input.registrationOpen) throw new TRPCError({ code: "BAD_REQUEST", message: "Registration is closed for this tournament." });
  if (input.hasExistingSubmission) throw new TRPCError({ code: "CONFLICT", message: "This team has already been submitted to that tournament." });
}

export function shouldCreateTournamentTeamForApproval(input: {
  status: TournamentTeamSubmissionStatus;
  existingTournamentTeamCount: number;
}) {
  return input.status !== "approved" && input.existingTournamentTeamCount === 0;
}

export function canCreateManualTournamentTeam(input: { managedTeamId?: number | null }) {
  return input.managedTeamId == null;
}
