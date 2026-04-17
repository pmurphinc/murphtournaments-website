/**
 * Patch Notes Scraper
 * Fetches game updates from thefinals.wiki and stores new ones in the database.
 * Called by the weekly scheduler and also available as a tRPC mutation.
 */
import { getAllPatchNotes, addPatchNote, getPatchNoteByVersion } from "./db";

const PATCHNOTES_PAGE_API =
  "https://www.thefinals.wiki/w/api.php?action=parse&page=Patchnotes&prop=text&formatversion=2&format=json";

const stripHtmlTags = (value: string) =>
  value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const extractPatchLinks = (html: string) => {
  const links: Array<{ pageTitle: string; patchVersion: string; patchDate: string }> = [];
  const seen = new Set<string>();
  const rowRegex =
    /<tr[^>]*>[\s\S]*?<a[^>]*href="\/wiki\/([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?(\d{4}-\d{2}-\d{2})[\s\S]*?<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const pageTitle = decodeURIComponent(match[1]).replace(/_/g, " ").trim();
    const patchVersion = stripHtmlTags(match[2]);
    const patchDate = match[3];
    const key = `${pageTitle}-${patchDate}`;

    if (seen.has(key)) continue;
    seen.add(key);

    links.push({ pageTitle, patchVersion, patchDate });
  }

  return links.sort((a, b) => (a.patchDate < b.patchDate ? 1 : -1));
};

export interface ScrapeResult {
  added: number;
  skipped: number;
  errors: number;
  error?: string;
}

export async function scrapeAndStorePatchNotes(): Promise<ScrapeResult> {
  const results: ScrapeResult = { added: 0, skipped: 0, errors: 0 };

  try {
    const indexResponse = await fetch(PATCHNOTES_PAGE_API);
    if (!indexResponse.ok) {
      throw new Error(`Wiki index fetch failed: ${indexResponse.status}`);
    }
    const indexPayload = await indexResponse.json();
    const indexHtml = indexPayload?.parse?.text as string | undefined;
    if (!indexHtml) {
      throw new Error("Wiki response missing patch notes HTML");
    }

    const patchLinks = extractPatchLinks(indexHtml);
    console.log(`[patchNoteScraper] Found ${patchLinks.length} patch entries on wiki`);

    // Filter to only game updates (not store updates, hotfixes unless they are game updates)
    const gameUpdateLinks = patchLinks.filter((link) => {
      const title = link.patchVersion.toLowerCase();
      return (
        title.startsWith("update") ||
        title.startsWith("season") ||
        /^\d+\.\d+/.test(title)
      );
    });

    console.log(`[patchNoteScraper] ${gameUpdateLinks.length} game update entries to check`);

    for (const link of gameUpdateLinks) {
      try {
        const versionMatch = link.patchVersion.match(/([\d]+[\d.]+[\d]+)/);
        const version = versionMatch ? versionMatch[1] : link.patchVersion;

        const existing = await getPatchNoteByVersion(version);
        if (existing) {
          results.skipped++;
          continue;
        }

        const patchApiUrl = `https://www.thefinals.wiki/w/api.php?action=parse&page=${encodeURIComponent(
          link.pageTitle
        )}&prop=wikitext&formatversion=2&format=json`;
        const patchResponse = await fetch(patchApiUrl);
        if (!patchResponse.ok) {
          console.warn(
            `[patchNoteScraper] Failed to fetch ${link.pageTitle}: ${patchResponse.status}`
          );
          results.errors++;
          continue;
        }

        const patchPayload = await patchResponse.json();
        const wikitext = patchPayload?.parse?.wikitext as string | undefined;
        if (!wikitext) {
          results.errors++;
          continue;
        }

        const cleanedContent = wikitext
          .replace(/\{\{[^}]*\}\}/g, "")
          .replace(/\[\[File:[^\]]*\]\]/gi, "")
          .replace(/\[\[Category:[^\]]*\]\]/gi, "")
          .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
          .replace(/\[\[([^\]]+)\]\]/g, "$1")
          .replace(/'{2,3}/g, "")
          .replace(/^={1,6}\s*(.+?)\s*={1,6}$/gm, "$1")
          .replace(/^[*#:;]+\s*/gm, "• ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        const isSeasonPatch = link.patchVersion.toLowerCase().includes("season");
        const title = isSeasonPatch
          ? link.patchVersion.toUpperCase()
          : `UPDATE ${version}`;

        const formattedDate = link.patchDate.replace(/-/g, ".");
        const officialUrl = `https://www.reachthefinals.com/patchnotes/${version.replace(/\./g, "")}`;
        const wikiUrl = `https://www.thefinals.wiki/wiki/${encodeURIComponent(link.pageTitle)}`;

        await addPatchNote({
          title,
          date: formattedDate,
          content: cleanedContent.slice(0, 10000),
          url: officialUrl,
          sourceUrl: wikiUrl,
          version,
          isGameUpdate: 1,
        });

        results.added++;
        console.log(`[patchNoteScraper] Added: ${title} (${version})`);
      } catch (innerErr) {
        console.error(
          `[patchNoteScraper] Error processing ${link.patchVersion}:`,
          innerErr
        );
        results.errors++;
      }
    }

    console.log(
      `[patchNoteScraper] Complete: ${results.added} added, ${results.skipped} skipped, ${results.errors} errors`
    );
    return results;
  } catch (err) {
    console.error("[patchNoteScraper] Fatal error:", err);
    return {
      ...results,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
