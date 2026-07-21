import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import TournamentHistory from "./TournamentHistory";

const markup = () =>
  renderToStaticMarkup(
    <Router ssrPath="/tournaments/history">
      <TournamentHistory />
    </Router>
  );

interface Anchor {
  tag: string;
  href: string;
  text: string;
}

/** Anchors are matched by attribute lookup because the dev jsx-loc plugin
 * injects a `data-loc` attribute ahead of the ones we author. */
function anchors(html: string): Anchor[] {
  const pattern = /<a\s([^>]*)>(.*?)<\/a>/g;
  const found: Anchor[] = [];
  let match = pattern.exec(html);
  while (match) {
    found.push({
      tag: match[0],
      href: /href="([^"]*)"/.exec(match[1])?.[1] ?? "",
      text: match[2].replace(/<[^>]*>/g, "").trim(),
    });
    match = pattern.exec(html);
  }
  return found;
}

/** The card markup between the June 2026 heading and the next result card. */
function juneCard(html: string) {
  const start = html.indexOf("June 2026 Tournament");
  expect(start).toBeGreaterThan(-1);
  const end = html.indexOf("FCL – Day 6", start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

describe("TournamentHistory", () => {
  it("gives the June 2026 entry a Watch Replay link to the Twitch VOD", () => {
    const links = anchors(juneCard(markup()));

    expect(links.map(link => link.text)).toEqual([
      "View Tournament Details →",
      "Watch Replay →",
    ]);

    const replay = links[1];
    expect(replay.href).toBe("https://www.twitch.tv/videos/2807784152");
    expect(replay.tag).toContain('target="_blank"');
    expect(replay.tag).toContain('rel="noopener noreferrer"');
  });

  it("leaves internal links in the same tab", () => {
    const internal = anchors(markup()).filter(link =>
      link.href.startsWith("/")
    );

    expect(internal.length).toBeGreaterThan(0);
    for (const link of internal) {
      expect(link.tag).not.toContain("target=");
    }
  });
});
