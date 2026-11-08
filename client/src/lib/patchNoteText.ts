/**
 * Turns patch note text into renderable segments.
 *
 * Notes arrive with links in two shapes: the wiki's external-link form,
 * `[https://example.com label]`, and bare URLs. Both were rendered as
 * literal text, so Update 12.1.0 showed a reader the whole of
 * "[https://docs.google.com/forms/.../viewform this form]" and no way to
 * click it.
 *
 * Returning segments rather than HTML is deliberate: this text is scraped
 * from a third-party site, and handing it to dangerouslySetInnerHTML would
 * make every future patch note a script injection away from trouble. The
 * renderer builds real anchors from these, so the worst a malicious note
 * can do is contain a link that says one thing and points somewhere else —
 * which is what the visible href on hover is for.
 */

export type PatchNoteSegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; label: string };

/**
 * `[url label]` first, then bare URLs. Only http and https: a `javascript:`
 * or `data:` URL must never reach an href, and anything else is left as
 * plain text rather than guessed at.
 */
const LINK_PATTERN =
  /\[(https?:\/\/[^\s\]]+)(?:[ \t]+([^\]]*))?\]|(https?:\/\/[^\s<>()[\]]+)/gi;

/** Trailing punctuation belongs to the sentence, not the URL. */
function trimTrailingPunctuation(url: string): [string, string] {
  const match = /[.,;:!?)\]}'"]+$/.exec(url);
  if (!match) return [url, ""];
  return [url.slice(0, match.index), url.slice(match.index)];
}

export function parsePatchNoteText(text: string): PatchNoteSegment[] {
  if (!text) return [];
  const segments: PatchNoteSegment[] = [];
  let lastIndex = 0;

  const pushText = (value: string) => {
    if (!value) return;
    const previous = segments[segments.length - 1];
    if (previous && previous.type === "text") previous.value += value;
    else segments.push({ type: "text", value });
  };

  LINK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    pushText(text.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const [bracketedUrl, bracketLabel, bareUrl] = [match[1], match[2], match[3]];

    if (bracketedUrl) {
      const label = (bracketLabel ?? "").trim();
      segments.push({
        type: "link",
        href: bracketedUrl,
        label: label || bracketedUrl,
      });
      continue;
    }

    if (bareUrl) {
      const [href, trailing] = trimTrailingPunctuation(bareUrl);
      if (href) segments.push({ type: "link", href, label: href });
      else pushText(bareUrl);
      pushText(trailing);
    }
  }

  pushText(text.slice(lastIndex));
  return segments;
}
