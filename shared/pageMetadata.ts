/**
 * Per-route page titles and link-preview metadata.
 *
 * Why this is shared rather than a client concern: a link scraper never runs
 * our JavaScript. Discord, Slack, X and iMessage read the HTML as it leaves
 * the server and stop there, so a title set in React reaches the browser tab
 * and nothing else. The server injects from this table into index.html before
 * it is sent (see server/_core/vite.ts), and the client applies the same table
 * on in-app navigation, where no new document is served. One table keeps the
 * two from drifting.
 *
 * Sharing a bracket is the Control Room's whole point, so the viewer route is
 * the one that most needed this.
 */

export const SITE_NAME = "Murph Tournaments";
export const SITE_ORIGIN = "https://murphtournaments.com";
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/images/Murph%20Tournaments_logo.png`;

export type PageMetadata = {
  title: string;
  description: string;
  /**
   * Set on routes whose URL is itself the credential, and on owner-only
   * surfaces. robots.txt disallows these too; this covers the crawlers that
   * read the page anyway.
   */
  noindex?: boolean;
};

export const DEFAULT_METADATA: PageMetadata = {
  title: SITE_NAME,
  description:
    "Community tournaments for THE FINALS: live brackets, team finder, weapon balance history and the Tournament Control Room.",
};

type Rule = { pattern: RegExp; metadata: PageMetadata };

/**
 * First match wins, so a more specific path comes before the pattern that
 * would also swallow it: /tcr/templates before /tcr/:id, and /tcr/staff/join
 * before both.
 */
const RULES: Rule[] = [
  {
    pattern: /^\/bracket\/[^/]+$/i,
    metadata: {
      title: `Tournament Bracket | ${SITE_NAME}`,
      description:
        "Follow this tournament live — groups, matches and results update as the organiser runs the bracket. No account needed.",
      noindex: true,
    },
  },
  {
    pattern: /^\/tcr\/staff\/join\/[^/]+$/i,
    metadata: {
      title: `Staff Invite | ${SITE_NAME}`,
      description:
        "Accept an invite to help run this tournament from the Control Room.",
      noindex: true,
    },
  },
  {
    pattern: /^\/tcr\/templates$/i,
    metadata: {
      title: `Control Room Templates | ${SITE_NAME}`,
      description:
        "Start from a ready-made bracket layout instead of an empty board.",
    },
  },
  {
    pattern: /^\/tcr$/i,
    metadata: {
      title: `Tournament Control Room | ${SITE_NAME}`,
      description:
        "Build and run your own tournament bracket, then share one live link with everyone watching. Sign in with Discord to start.",
    },
  },
  {
    pattern: /^\/tcr\/[^/]+$/i,
    metadata: {
      title: `Control Room | ${SITE_NAME}`,
      description:
        "Seed teams, build the bracket, track matches and share a live viewer link.",
      noindex: true,
    },
  },
  {
    pattern: /^\/(admin|api)(\/|$)/i,
    metadata: {
      title: `Admin | ${SITE_NAME}`,
      description: "Staff-only tournament administration.",
      noindex: true,
    },
  },
  {
    pattern: /^\/(invite|teams\/(claim|join))\//i,
    metadata: {
      title: `Invite | ${SITE_NAME}`,
      description: "Accept your Murph Tournaments invite.",
      noindex: true,
    },
  },
  {
    pattern: /^\/team-finder$|^\/lft$/i,
    metadata: {
      title: `Team Finder | ${SITE_NAME}`,
      description:
        "Find a team or a teammate for THE FINALS: post what you play and see who is looking.",
    },
  },
  {
    pattern: /^\/teams$/i,
    metadata: {
      title: `Team Management | ${SITE_NAME}`,
      description: "Manage your roster, map bans and tournament entries.",
    },
  },
  {
    pattern: /^\/tournaments\/community/i,
    metadata: {
      title: `Community Tournaments | ${SITE_NAME}`,
      description:
        "Open community tournaments for THE FINALS — upcoming brackets, formats and past results.",
    },
  },
  {
    pattern: /^\/tournaments/i,
    metadata: {
      title: `Tournaments | ${SITE_NAME}`,
      description:
        "Every Murph Tournaments event: dates, formats, winners and prize pools.",
    },
  },
  {
    pattern: /^\/balance-archive/i,
    metadata: {
      title: `Weapon Balance Archive | ${SITE_NAME}`,
      description:
        "Every balance change to every weapon in THE FINALS, patch by patch, with baseline stats.",
    },
  },
  {
    pattern: /^\/patchnotes$/i,
    metadata: {
      title: `Patch Notes | ${SITE_NAME}`,
      description:
        "THE FINALS patch notes, from Season 1 to the current update.",
    },
  },
  {
    pattern: /^\/loadout-tracker$/i,
    metadata: {
      title: `Loadout Tracker | ${SITE_NAME}`,
      description: "Track what the field is running, weapon by weapon.",
    },
  },
  {
    pattern: /^\/dev-division$/i,
    metadata: {
      title: `Development Division | ${SITE_NAME}`,
      description:
        "The Murph Tournaments development league: schedule, format and how to sign up.",
    },
  },
  {
    pattern: /^\/about$/i,
    metadata: {
      title: `About | ${SITE_NAME}`,
      description: "Who runs Murph Tournaments, and the numbers behind it.",
    },
  },
  {
    pattern: /^\/404$/i,
    metadata: {
      title: `Page Not Found | ${SITE_NAME}`,
      description: DEFAULT_METADATA.description,
      noindex: true,
    },
  },
];

/** Strip query and hash, force a leading slash, drop a trailing slash. */
export function normalizePath(pathname: string): string {
  const bare = (pathname || "/").split("?")[0].split("#")[0];
  const rooted = bare.startsWith("/") ? bare : `/${bare}`;
  return rooted.length > 1 ? rooted.replace(/\/+$/, "") : "/";
}

export function metadataForPath(pathname: string): PageMetadata {
  const path = normalizePath(pathname);
  for (const rule of RULES) {
    if (rule.pattern.test(path)) return rule.metadata;
  }
  return DEFAULT_METADATA;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace index.html's single hard-coded <title> with this route's title and
 * the link-preview tags that belong beside it.
 *
 * The canonical origin is fixed rather than read from the Host header: the
 * header is caller-controlled, and an og:url built from it would let anyone
 * who can reach the server mint a preview pointing somewhere else.
 *
 * A document with no <title> is returned untouched — there is nothing to
 * anchor the injection to, and silently prepending tags to an unexpected
 * document is worse than leaving it alone.
 */
export function injectPageMetadata(html: string, pathname: string): string {
  const metadata = metadataForPath(pathname);
  const canonical = `${SITE_ORIGIN}${normalizePath(pathname)}`;
  const title = escapeAttribute(metadata.title);
  const description = escapeAttribute(metadata.description);

  const tags = [
    `<meta name="description" content="${description}" />`,
    metadata.noindex
      ? `<meta name="robots" content="noindex, nofollow" />`
      : `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeAttribute(SITE_NAME)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${escapeAttribute(SITE_OG_IMAGE)}" />`,
    `<meta property="og:url" content="${escapeAttribute(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(SITE_OG_IMAGE)}" />`,
  ].join("\n    ");

  return html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${title}</title>\n    ${tags}`
  );
}
