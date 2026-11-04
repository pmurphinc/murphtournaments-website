# Murph Tournaments — where work is tracked

This file used to be a running task list. It had drifted far enough to be
misleading rather than merely out of date: it recorded the site as deployed
to `manus.space`, authenticating through Manus OAuth, storing files in S3
and having no tests, none of which has been true for a long time, and it
never mentioned the Tournament Control Room at all. The full history is in
git if you want the old list.

## Where work actually goes now

- **Bugs** — the "Report a bug" control at the bottom of every page files
  them. Each report is stored in the `bug_reports` table and, when
  `GITHUB_ISSUE_TOKEN` is set, opens an issue labelled `bug-report`.
- **Everything else** — GitHub issues and pull requests on
  `pmurphinc/murphtournaments-website`.
- **Launch work** — tracked outside the repo, on the TCR launch checklist.

## What is true about the project today

- Deployed on Railway, built from `main`, live at murphtournaments.com.
  Migrations run from the pre-deploy command (`pnpm db:migrate`).
- Sign-in is Discord OAuth. There is no Manus OAuth and no S3.
- CI runs on every pull request and on pushes to `main`: typecheck, both
  vitest projects, the production build, and an assertion that weapon-archive
  baseline coverage is complete.
- Two test projects, because `vite.config.ts` sets `root: client`: the client
  suite collects `client/**` automatically, while `vitest.server.config.ts`
  names every server and `shared/` file explicitly. **A new test under
  `server/` or `shared/` does not run until it is added to that list.**
- Analytics is Umami, configured through two build-time `VITE_ANALYTICS_*`
  variables. They are baked in at build time, so changing them needs a
  redeploy.

## Known open items

- No error reporting in the browser; server errors only reach Railway logs.
- `PersonalTcrIndex`, `TcrTemplates`, `TournamentControlViewer` and
  `TournamentControlIndex` have no dedicated tests.
- Creating a TCR board as a signed-in non-admin has never been exercised.
- Around 90 files fail `prettier --check`, including generated
  `drizzle/meta` snapshots. Deliberately left alone; nothing enforces it.
