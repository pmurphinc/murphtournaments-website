# Murph MLB Edge

Premium, portrait-first MLB analytics and matchup research for Android. The app treats missing data honestly, calculates deterministic percentile scores only from valid observations, synchronizes the official public MLB Stats API, and preserves its last successful browser/Android cache for offline use.

## Commands

```bash
npm install                 # install current compatible dependencies
npm run dev                 # one-command development server
npm run refresh             # one-command build-time official-data refresh
npm run test                # calculation and ingestion suite
npm run build               # production web bundle
npm run apk                 # test, bundle, Capacitor sync, debug APK
```

The APK output is `artifacts/Murph-MLB-Edge.apk`. No private signing key is needed for the debug build.

## Architecture

React + TypeScript and Recharts provide the mobile UI. `analytics.ts` contains pure, tested calculations. `store.ts` owns freshness checks, official API ingestion, non-destructive refresh, and persistent WebView storage. Capacitor packages the same responsive bundle as an Android application. Team identity is keyed only by official integer `team_id`; player and game data follow `player_id` and `game_id`.

The application checks data at launch, throttles automatic refreshes to six hours, exposes manual refresh and cache reset, retains non-empty prior collections when individual endpoints fail, and displays endpoint failures and completeness on Data Health. The season and selected day derive from the device clock.

## Methodology

All valid observations become league percentiles. ERA, WHIP, runs allowed, opponent average, and blown-save rate are reversed. Missing component weights are redistributed rather than assigned zero. Team Power is 25% win percentage, 20% run differential/game, 15% runs/game, 15% reversed runs allowed/game, 10% recent form, and 7.5% each rotation and bullpen. Full formulas and bullpen thresholds are available inside the application.

## Data source audit

The Drive download could not be attempted with `gdown` because this build environment's configured outbound proxy rejects PyPI and Google/API tunnels with `403 Forbidden`; consequently the supplied updater and validator were not locally available to execute. **Fallback:** copy the shared folder, unchanged, to `murph-mlb-edge/data-source/MLB Database/`, then run its `Scripts/validate_mlb_database.py` followed by `npm run refresh`.

The described source snapshot contains 30 identities but zero hitters, pitchers, and selected-date games. It therefore cannot support genuine ranks. Missing source metrics include populated standings/team stats, hitters, pitchers, bullpen usage, injuries, schedules, probable starters, splits, FIP, and xERA. First-launch official API sync is the runtime fallback; cached data survives later offline launches.

## Attribution and disclaimer

Data is sourced from the official public MLB Stats API and the user-supplied read-only database. MLB and team marks are property of their owners. This independent personal research dashboard is not affiliated with or endorsed by Major League Baseball. Model estimates are not sportsbook odds, wagers, or promises of profit. Gamble responsibly.
