/**
 * Redaction for the routes whose URL is itself a credential.
 *
 * Five route families put a token in the path: a bracket viewer link, a
 * staff join, a team claim, a team join and a division invite. Anyone
 * holding one of those URLs can use it, so a URL that leaves the browser
 * and gets stored — in our database, in a public GitHub issue, in an error
 * report held by a third party — has to have the token taken out first.
 *
 * This lives in shared/ because it was written twice otherwise. The bug
 * report pipeline redacted correctly and Sentry was then wired up sending
 * `window.location.href` untouched, which is the same leak into a different
 * sink. One implementation, used by every caller that sends a URL anywhere.
 */

const TOKEN_BEARING_PATHS: RegExp[] = [
  /^(\/bracket\/)[^/]+/i,
  /^(\/tcr\/staff\/join\/)[^/]+/i,
  /^(\/teams\/(?:claim|join)\/)[^/]+/i,
  /^(\/invite\/[^/]+\/)[^/]+/i,
];

/** Replace a credential in the path with `:token`, leaving the route legible. */
export function redactTokenPath(pathname: string): string {
  for (const pattern of TOKEN_BEARING_PATHS) {
    if (pattern.test(pathname))
      return pathname.replace(pattern, (_match, prefix) => `${prefix}:token`);
  }
  return pathname;
}

/**
 * Redact a whole URL: the token segment goes, and the query string goes
 * with it. Nothing that reads these needs a query string, and it is an
 * open-ended place for a token to hide.
 *
 * Anything unparseable returns a constant rather than the original, so a
 * caller cannot leak a URL by handing this something unexpected.
 */
export function redactUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${redactTokenPath(parsed.pathname)}`;
  } catch {
    // A relative path still deserves redacting; anything else is dropped.
    if (value.startsWith("/")) return redactTokenPath(value.split("?")[0]);
    return "[unparseable url]";
  }
}
