import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { bugReports } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { extractInsertId } from "./tournamentControl";

/**
 * Bug reports from the site.
 *
 * Order of operations is deliberate: write the row, then mirror it to a
 * GitHub issue. The mirror is best-effort and its failure is swallowed —
 * a report that reaches the database and not GitHub can be mirrored later,
 * while a report lost because GitHub was unreachable is gone. The reporter
 * is told their report was received either way, because by then it was.
 */

const GITHUB_API = "https://api.github.com";
const ISSUE_LABEL = "bug-report";

export const bugReportInputSchema = z.object({
  summary: z.string().trim().min(8).max(200),
  details: z.string().trim().min(20).max(5000),
  /** Captured by the client, not typed: where the reporter was. */
  pageUrl: z.string().trim().max(512).optional(),
  /** Optional: how to reach them. Free text — a Discord tag, usually. */
  contact: z.string().trim().max(120).optional(),
});

export type BugReportInput = z.infer<typeof bugReportInputSchema>;

/**
 * Trim a captured header to what the column holds. User agents run long and
 * a reporter cannot fix an error caused by their own browser string.
 */
export function truncate(value: string | undefined, max: number) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/**
 * Only our own site's URLs are worth recording, and the value arrives from
 * the client, so anything else is dropped rather than stored and later
 * rendered into a GitHub issue as a link.
 */
export function sanitizePageUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return null;
    if (!/(^|\.)murphtournaments\.com$/i.test(parsed.hostname)) return null;
    return truncate(
      `${parsed.origin}${parsed.pathname}${parsed.search}`,
      512
    );
  } catch {
    return null;
  }
}

/**
 * Build the issue body.
 *
 * Everything interpolated here is reporter-controlled, so it goes inside a
 * fenced block rather than as markdown: a report is data, and a report that
 * renders as instructions is a report that can impersonate one.
 */
export function buildIssueBody(input: {
  details: string;
  pageUrl: string | null;
  userAgent: string | null;
  contact: string | null;
  reporterName: string | null;
  reportId: number;
}) {
  const fence = "```";
  const lines = [
    `**Reported from the site** (bug_reports #${input.reportId})`,
    "",
    "### What happened",
    fence,
    input.details.replace(/```/g, "'''"),
    fence,
    "",
    "### Context",
    `- Page: ${input.pageUrl ?? "not captured"}`,
    `- Reporter: ${input.reporterName ?? "anonymous"}`,
    `- Contact: ${input.contact ? `\`${input.contact.replace(/`/g, "'")}\`` : "none given"}`,
    `- User agent: ${input.userAgent ? `\`${input.userAgent.replace(/`/g, "'")}\`` : "not captured"}`,
    "",
    "_Opened automatically from a site bug report. The reporter's text is quoted above, not interpreted._",
  ];
  return lines.join("\n");
}

type MirrorResult = { number: number; url: string } | null;

/**
 * Open the GitHub issue. Returns null whenever mirroring is not possible —
 * no token, no repo, a non-2xx response, a network failure — so the caller
 * can carry on with a stored report and no issue.
 */
export async function mirrorToGitHub(
  title: string,
  body: string
): Promise<MirrorResult> {
  const token = ENV.githubIssueToken;
  const repo = ENV.githubIssueRepo;
  if (!token || !repo) return null;

  try {
    const response = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ title, body, labels: [ISSUE_LABEL] }),
    });
    if (!response.ok) {
      console.error(
        `[bugReports] GitHub issue creation failed: ${response.status}`
      );
      return null;
    }
    const data = (await response.json()) as {
      number?: number;
      html_url?: string;
    };
    if (typeof data.number !== "number" || !data.html_url) return null;
    return { number: data.number, url: data.html_url };
  } catch (error) {
    console.error("[bugReports] GitHub issue creation threw", error);
    return null;
  }
}

export async function createBugReport(args: {
  input: BugReportInput;
  userAgent: string | undefined;
  reporterUserId: number | null;
  reporterName: string | null;
}) {
  const db = await getDb();
  if (!db) {
    // Nothing can be stored, so do not open an issue either: a GitHub issue
    // with no row behind it is a report nobody can trace back.
    console.error("[bugReports] database unavailable; report not stored");
    throw new Error("Bug report storage is unavailable.");
  }

  const pageUrl = sanitizePageUrl(args.input.pageUrl);
  const userAgent = truncate(args.userAgent, 512);
  const contact = truncate(args.input.contact, 120);
  const reporterName = truncate(args.reporterName ?? undefined, 120);

  const inserted = await db.insert(bugReports).values({
    summary: args.input.summary,
    details: args.input.details,
    pageUrl,
    userAgent,
    contact,
    reporterUserId: args.reporterUserId,
    reporterName,
  });

  // MySQL returns the generated id on the result header, in a shape that
  // varies by driver version; extractInsertId already handles the variants.
  const reportId = extractInsertId(inserted) ?? 0;

  // A structured line so a report is findable in the Railway logs even
  // before anyone opens the database or GitHub.
  console.log(
    `[bugReports] received #${reportId} page=${pageUrl ?? "-"} reporter=${reporterName ?? "anonymous"}`
  );

  const mirror = await mirrorToGitHub(
    args.input.summary,
    buildIssueBody({
      details: args.input.details,
      pageUrl,
      userAgent,
      contact,
      reporterName,
      reportId,
    })
  );

  if (mirror && reportId) {
    try {
      await db
        .update(bugReports)
        .set({ githubIssueNumber: mirror.number, githubIssueUrl: mirror.url })
        .where(eq(bugReports.id, reportId));
    } catch (error) {
      console.error("[bugReports] could not record the issue link", error);
    }
  }

  return { id: reportId, issueUrl: mirror?.url ?? null };
}

export async function listBugReports(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(bugReports)
    .orderBy(desc(bugReports.createdAt))
    .limit(Math.min(200, Math.max(1, limit)));
}
