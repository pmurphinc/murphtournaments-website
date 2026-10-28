import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import TournamentHistory from "./pages/TournamentHistory";
import JuneTournament2026 from "./pages/JuneTournament2026";
import JuneTournamentRoster2026 from "./pages/JuneTournamentRoster2026";
import LiveBracket from "./pages/LiveBracket";
import DevDivision from "./pages/DevDivision";
import DevelopmentDivisionInvite from "./pages/DevelopmentDivisionInvite";
import About from "./pages/About";
import Watch from "./pages/Watch";
import Join from "./pages/Join";
import PatchNotes from "./pages/PatchNotes";
import TeamFinder from "./pages/TeamFinder";
import CommunityTournaments from "./pages/CommunityTournaments";
import { lazy, Suspense, useEffect } from "react";

/**
 * Routes split out of the initial bundle.
 *
 * The whole app shipped as one ~1.2MB chunk, so every visitor to the
 * home page also downloaded the Control Room, the VOD tools and the team
 * admin screens. These are the heavy or sign-in-gated pages that a first
 * visit does not need; the public pages above stay eager so first paint
 * is unchanged.
 */
const DevelopmentDivisionAdmin = lazy(
  () => import("./pages/DevelopmentDivisionAdmin")
);
const VodAnalysis = lazy(() => import("./pages/VodAnalysis"));
const VodAnalysisDetail = lazy(() => import("./pages/VodAnalysisDetail"));
const VodTeamInsights = lazy(() => import("./pages/VodTeamInsights"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const TeamJoinInvite = lazy(() => import("./pages/TeamJoinInvite"));
const TeamClaimLink = lazy(() => import("./pages/TeamClaimLink"));
const TournamentControlViewer = lazy(
  () => import("./pages/TournamentControlViewer")
);
const TournamentControlRoom = lazy(
  () => import("./pages/TournamentControlRoom")
);
const TournamentControlIndex = lazy(
  () => import("./pages/TournamentControlIndex")
);
const PersonalTcrIndex = lazy(() => import("./pages/PersonalTcrIndex"));
const TournamentStaffInviteJoin = lazy(
  () => import("./pages/TournamentStaffInviteJoin")
);
const BalanceArchive = lazy(() => import("./pages/BalanceArchive"));
const BalanceArchiveDetail = lazy(() => import("./pages/BalanceArchiveDetail"));
const PlayerArchive = lazy(() => import("./pages/PlayerArchive"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const LoadoutTracker = lazy(() => import("./pages/LoadoutTracker"));
const MapRandomizer = lazy(() => import("./pages/MapRandomizer"));
const TournamentResultsArchive = lazy(
  () => import("./pages/TournamentResultsArchive")
);
const FclReplay = lazy(() => import("./pages/FclReplay"));
const LiveBracket2 = lazy(() => import("./pages/LiveBracket2"));
const TcrTemplatesPage = lazy(() => import("./pages/TcrTemplates"));

/**
 * Murph Tournaments Website
 * Black / charcoal / metallic-gold public esports identity, applied via the
 * `.public-theme` scope in index.css. /admin/* and /TCR keep the original
 * theme tokens for their own page content (see the isProtectedRoute check
 * below); only the shared Navigation/Footer chrome picks up the new palette
 * everywhere.
 */
function PersonalTournamentControlRoomRoute() {
  return <TournamentControlRoom mode="personal" />;
}

function DiscordStaffTournamentControlRoomRoute() {
  return <TournamentControlRoom mode="discord-staff" />;
}

/**
 * Placeholder while a split route's chunk is fetched. Sized to the content
 * area so the header and footer do not jump while it loads.
 */
function RouteLoading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading page</span>
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white/60"
      />
    </div>
  );
}

function Router() {
  // Scroll to top on route change
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Admin and TCR pages keep the shared Navigation/Footer chrome (a small,
  // explicitly-permitted compatibility adjustment) but their own page
  // content must NOT pick up the new public palette: those pages already
  // use components/ui/* primitives styled against the original theme
  // tokens, and remapping those tokens here would restyle their buttons,
  // dialogs, and inputs. See index.css `.public-theme` for the scoped
  // override this class applies.
  const isProtectedRoute =
    location.startsWith("/admin") || location.toLowerCase().startsWith("/tcr");

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main
        className={`flex-1 pt-16 ${isProtectedRoute ? "" : "public-theme"}`}
      >
        <Suspense fallback={<RouteLoading />}>
          <Switch>
            <Route path={"/"} component={Home} />
            <Route
              path={"/tournaments/june-2026/roster"}
              component={JuneTournamentRoster2026}
            />
            <Route
              path={"/tournaments/june-2026"}
              component={JuneTournament2026}
            />
            <Route
              path={"/tournaments/community/:slug"}
              component={CommunityTournaments}
            />
            <Route
              path={"/tournaments/community"}
              component={CommunityTournaments}
            />
            <Route path={"/tournaments"} component={TournamentHistory} />
            <Route
              path={"/tournament-results/:tournamentId"}
              component={TournamentResultsArchive}
            />
            <Route
              path={"/bracket/:viewerToken"}
              component={TournamentControlViewer}
            />
            <Route path={"/bracket"} component={LiveBracket} />
            <Route path={"/dev-division"} component={DevDivision} />
            <Route
              path={"/invite/development-division/:token"}
              component={DevelopmentDivisionInvite}
            />
            <Route path={"/about"} component={About} />
            <Route path={"/watch"} component={Watch} />
            <Route path={"/watch/fcl/:slug"} component={FclReplay} />
            <Route
              path={"/vod/:id/team-summary/:teamName"}
              component={VodTeamInsights}
            />
            <Route path={"/vod/:id"} component={VodAnalysisDetail} />
            <Route path={"/vod"} component={VodAnalysis} />
            <Route path={"/join"} component={Join} />
            <Route path={"/bracket2"} component={LiveBracket2} />
            <Route path={"/players"} component={PlayerArchive} />
            <Route path={"/player/:id"} component={PlayerProfile} />
            <Route path={"/patchnotes"} component={PatchNotes} />
            <Route path={"/loadout-tracker"} component={LoadoutTracker} />
            <Route path={"/maprng"} component={MapRandomizer} />
            <Route
              path={"/balance-archive/:slug"}
              component={BalanceArchiveDetail}
            />
            <Route path={"/balance-archive"} component={BalanceArchive} />
            <Route path={"/team-finder"} component={TeamFinder} />
            <Route path={"/lft"} component={TeamFinder} />
            <Route path={"/teams/claim/:token"} component={TeamClaimLink} />
            <Route path={"/teams/join/:token"} component={TeamJoinInvite} />
            <Route path={"/teams"} component={TeamManagement} />
            <Route
              path={"/TCR/staff/join/:token"}
              component={TournamentStaffInviteJoin}
            />
            <Route
              path={"/tcr/staff/join/:token"}
              component={TournamentStaffInviteJoin}
            />
            <Route path={"/TCR/templates"} component={TcrTemplatesPage} />
            <Route path={"/tcr/templates"} component={TcrTemplatesPage} />
            <Route
              path={"/TCR/:tournamentId"}
              component={PersonalTournamentControlRoomRoute}
            />
            <Route
              path={"/tcr/:tournamentId"}
              component={PersonalTournamentControlRoomRoute}
            />
            <Route path={"/TCR"} component={PersonalTcrIndex} />
            <Route path={"/tcr"} component={PersonalTcrIndex} />
            <Route
              path={"/admin/tournaments/control"}
              component={TournamentControlIndex}
            />
            <Route
              path={"/admin/development-division"}
              component={DevelopmentDivisionAdmin}
            />
            <Route
              path={"/admin/tournaments/:tournamentId/control"}
              component={DiscordStaffTournamentControlRoomRoute}
            />
            <Route path={"/404"} component={NotFound} />
            {/* Final fallback route */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
