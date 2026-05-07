# Murph Tournaments Website - TODO

## Core Features
- [x] Homepage with hero section and CTA buttons
- [x] Navigation bar with logo (249px × 146px)
- [x] Footer with social links
- [x] Tournament History page (13 tournaments with dates, winners, prize pools)
- [x] Live Bracket page (4 approved teams with rosters, 3-Cycle format)
- [x] Development Division page (schedule, format, signup form)
- [x] About page (Murph's credentials, TikTok stats, social links)
- [x] Watch/Media page (featured clips)
- [x] Join Discord page
- [x] Responsive mobile design
- [x] Cyberpunk neon aesthetic (magenta, cyan, gold, lime accents)
- [x] Custom components (NeonCard, GlitchText, CountdownTimer, PlayerSpotlight)
- [x] Database backend (MySQL with Express + tRPC)
- [x] User authentication (Manus OAuth)
- [x] S3 file storage integration

## Navigation & UX
- [x] Scroll-to-top on route changes
- [x] Hover animations on all card variants
- [x] Mobile responsive text sizing
- [x] Tournament History button linked from Live Bracket page
- [x] All internal page links functional

## Future Enhancements
- [ ] Real-time FRP standings/leaderboard for Development Division
- [ ] Team profile pages with detailed rosters and stats
- [ ] Admin dashboard for tournament management
- [ ] Match scheduling widget
- [ ] Live tournament bracket updates
- [ ] Player statistics and ranking system
- [ ] Community forum or discussion board
- [ ] Streaming integration (embed Twitch/YouTube streams)
- [ ] Email notifications for tournament updates
- [ ] Mobile app (React Native or PWA)

## Known Limitations
- Static tournament data (no real-time updates)
- Limited team profile information
- No player statistics tracking
- No automated bracket generation

## Testing
- [ ] Unit tests for core components (vitest)
- [ ] Integration tests for navigation
- [ ] E2E tests for user flows
- [ ] Mobile responsiveness testing
- [ ] Cross-browser compatibility testing

## Deployment
- [x] Project deployed to pmurphinc-gzitzusk.manus.space
- [ ] Custom domain setup (if needed)
- [ ] SSL certificate verification
- [ ] Performance optimization
- [ ] SEO optimization


## Admin Control Panel (In Progress)
- [ ] Design admin data structure and state management
- [ ] Create hidden admin route with non-obvious path
- [ ] Implement password authentication system
- [ ] Build admin password unlock screen UI
- [ ] Create admin control panel main interface
- [ ] Add event status controls (Not Live / Live / Complete)
- [ ] Add cycle selector (1 / 2 / 3)
- [ ] Add stage selector (Check-In / Cashout / Final Round / Finished)
- [ ] Add current match text field
- [ ] Add FRP standings editor (4 team rows)
- [ ] Add optional notes/status field
- [ ] Implement session storage for admin login
- [ ] Add logout/lock panel button
- [ ] Connect admin panel to public bracket page
- [ ] Test admin updates reflect on public page
- [ ] Verify data persistence across page refreshes
- [ ] Test mobile responsiveness of admin panel


## Second Tournament System (7th Circle)
- [ ] Update database schema to support multiple tournaments
- [ ] Create 7th Circle admin panel (/admin2)
- [ ] Create 7th Circle bracket page (/bracket2)
- [ ] Add tRPC endpoints for 7th Circle tournament
- [ ] Seed database with 7th Circle tournament and teams
- [ ] Test both tournament systems independently
- [ ] Deploy and verify both admin panels working


## Player Archive & Tournament History

- [ ] Create player data archive page with 20 players
- [ ] Add 7th Circle bracket link to bracket page header
- [ ] Create tournament_history database table
- [ ] Build tournament history archive page
- [ ] Add tRPC endpoints for tournament history

## Responsive Design Optimization Pass

- [ ] Audit current responsive state across all pages
- [ ] Fix global layout overflow and alignment issues
- [ ] Optimize typography and text scaling for mobile
- [ ] Improve navigation bar responsiveness on mobile/tablet
- [ ] Optimize bracket page layout for smaller screens
- [ ] Refine card and panel spacing consistency
- [ ] Test and verify across mobile, tablet, laptop, and desktop viewports
- [ ] Verify no text clipping or element overlap at any breakpoint

## Patch Notes Page
- [x] Create PatchNotes.tsx page with hardcoded patch note data
- [x] Display patches with expandable dropdown menus
- [x] Show patch title and date in header, full content in dropdown
- [x] Add PatchNotes page to History dropdown in navigation
- [x] Style consistently with tournament history page (NeonCard, cyberpunk aesthetic)
- [x] Test rendering and dropdown functionality

## Weekly Player Spotlight Feature
- [x] Create playerSpotlights.json data file with weekly structure
- [x] Build DynamicPlayerSpotlight component with date-based rotation logic
- [x] Replace hardcoded Player Spotlight section on homepage with dynamic component
- [x] Implement automatic weekly rotation based on current date
- [x] Add fallback behavior for missing/future weeks
- [x] Write comprehensive unit tests for weekly rotation logic (12 tests)
- [x] Verify responsive design across desktop and mobile
- [x] All 50 tests passing (38 existing + 12 new)

## Loading Throbber
- [ ] Replace loading throbber with murph_profile2.png image
- [ ] Simple centered looping animation, no text

## Patch Notes - UPDATE 10.3.0
- [x] Fetch UPDATE 10.3.0 content from thefinals.wiki
- [x] Add UPDATE 10.3.0 to patch notes page
- [x] Explore automating future patch note additions

## Patch Notes Automation
- [x] Create database table for patch notes (patchNotes table in drizzle schema)
- [x] Migrate hardcoded patch data to database (seed script + wiki scraper)
- [x] Build scraper to fetch patches from thefinals.wiki (patchNoteScraper.ts)
- [x] Create tRPC endpoints for patch notes CRUD (getAll + scrapeAndStore)
- [x] Update frontend to pull from database (PatchNotes.tsx uses trpc.patchNotes.getAll)
- [x] Set up weekly scheduled task to check for new patches (server startup + 7-day interval)
- [x] Fix wiki API URL from /api.php to /w/api.php
- [x] Write vitest tests for patchNotes router (5 tests passing)
- [x] Scraped 90 total patch notes from wiki (Season 1 through Update 10.3.0)

## Navigation Update
- [x] Hide App Alpha from navigation (can stay hidden for now)

## App Alpha Launch Page
- [x] Upload QR code image for app download
- [x] Build App Alpha page with download instructions
- [x] Include QR code and direct download link (https://manus.im/share/njv6VbaLUjq8Lo6UgQAQ8o)
- [x] Add Expo Go instructions for iOS users
- [x] Add install approval notice for Android (unsigned app)
- [x] Re-enable App Alpha in navigation bar
- [x] Test page rendering and links
- [x] Update APK download URL to v1.6.3
- [x] Rename nav item from 'App Alpha' to 'Mobile App'
- [x] Rename 'Tournament Feed' to 'Balance Archive' with updated description
- [x] Rename 'Archive Timeline' to 'Update Archive'

## Link Audit
- [x] Remove all Manus workflow/chat links from the site (only keep direct download links)

## Bug Fix - Text Cursor
- [x] Fix blinking text cursor appearing when clicking on text elements across the site

## About Page - YouTube Stats Column
- [x] Scrape YouTube channel stats from @pmurphinc
- [x] Add YouTube stats column next to TikTok stats in the By The Numbers card
- [x] Include stats like content duration, total videos, time posting, hours rendered

## Tournament Suspension Update
- [x] Remove countdown timer from home page
- [x] Remove future tournament dates from Development Division section
- [x] Add suspension notice/banner to the website

## Mobile App Removal & Balance Archive Integration
- [x] Remove Mobile App page (MobileApp.tsx)
- [x] Remove Mobile App from navigation
- [x] Integrate Balance Archive page from external build (via iframe)
- [x] Add Balance Archive to website navigation
- [x] Test Balance Archive functionality on the website

## Navigation Updates
- [x] Disable Bracket dropdown (Murph Tournament Community, 7th Circle) from navigation
