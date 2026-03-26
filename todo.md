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
