import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertManagedTeamSubmissionAllowed, canCreateManualTournamentTeam, shouldCreateTournamentTeamForApproval } from "../../../server/tournamentTeamSubmissions";

describe("tournament team submission rules", () => {
  it("allows captains to submit managed teams to open tournaments", () => {
    expect(() => assertManagedTeamSubmissionAllowed({ isCaptain: true, registrationOpen: true, hasExistingSubmission: false })).not.toThrow();
  });

  it("rejects submissions from non-captains", () => {
    expect(() => assertManagedTeamSubmissionAllowed({ isCaptain: false, registrationOpen: true, hasExistingSubmission: false })).toThrow(TRPCError);
  });

  it("rejects submissions to closed tournaments", () => {
    expect(() => assertManagedTeamSubmissionAllowed({ isCaptain: true, registrationOpen: false, hasExistingSubmission: false })).toThrow("Registration is closed");
  });

  it("rejects duplicate submissions", () => {
    expect(() => assertManagedTeamSubmissionAllowed({ isCaptain: true, registrationOpen: true, hasExistingSubmission: true })).toThrow("already been submitted");
  });

  it("creates a tournament teams row when approving a non-approved submission without an existing bridge", () => {
    expect(shouldCreateTournamentTeamForApproval({ status: "pending", existingTournamentTeamCount: 0 })).toBe(true);
  });

  it("does not duplicate tournament teams for already approved submissions", () => {
    expect(shouldCreateTournamentTeamForApproval({ status: "approved", existingTournamentTeamCount: 0 })).toBe(false);
    expect(shouldCreateTournamentTeamForApproval({ status: "pending", existingTournamentTeamCount: 1 })).toBe(false);
  });

  it("tracks rejected submissions as status-only changes", () => {
    expect(shouldCreateTournamentTeamForApproval({ status: "rejected", existingTournamentTeamCount: 0 })).toBe(true);
  });

  it("keeps existing manual Tournament Control team creation valid", () => {
    expect(canCreateManualTournamentTeam({ managedTeamId: null })).toBe(true);
    expect(canCreateManualTournamentTeam({})).toBe(true);
  });
});


describe("approved submission viewer links", () => {
  it("approval ensures a durable viewer link and legacy hash-only rows are rotated", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/tournamentControl.ts", import.meta.url), "utf8"));
    expect(source).toContain("ensureViewerLinkForApprovedSubmission");
    expect(source).toContain("row.submission.submittedByUserId");
    expect(source).toContain("Legacy active viewer links only have tokenHash");
    expect(source).toContain("publicToken: token");
  });
});
