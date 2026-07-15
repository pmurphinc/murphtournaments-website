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
import About from "./pages/About";
import Watch from "./pages/Watch";
import FclReplay from "./pages/FclReplay";
import Join from "./pages/Join";
import LiveBracket2 from "./pages/LiveBracket2";
import PlayerArchive from "./pages/PlayerArchive";
import PlayerProfile from "./pages/PlayerProfile";
import PatchNotes from "./pages/PatchNotes";
import LoadoutTracker from "./pages/LoadoutTracker";
import MapRandomizer from "./pages/MapRandomizer";
import BalanceArchive from "./pages/BalanceArchive";
import BalanceArchiveDetail from "./pages/BalanceArchiveDetail";
import VodAnalysis from "./pages/VodAnalysis";
import VodAnalysisDetail from "./pages/VodAnalysisDetail";
import VodTeamInsights from "./pages/VodTeamInsights";
import TeamFinder from "./pages/TeamFinder";
import TeamManagement from "./pages/TeamManagement";
import TeamJoinInvite from "./pages/TeamJoinInvite";
import TeamClaimLink from "./pages/TeamClaimLink";
import TournamentControlViewer from "./pages/TournamentControlViewer";
import TournamentControlRoom from "./pages/TournamentControlRoom";
import TournamentControlIndex from "./pages/TournamentControlIndex";
import PersonalTcrIndex from "./pages/PersonalTcrIndex";
import TcrTemplatesPage from "./pages/TcrTemplates";
import TournamentStaffInviteJoin from "./pages/TournamentStaffInviteJoin";
import CommunityTournaments from "./pages/CommunityTournaments";
import TournamentResultsArchive from "./pages/TournamentResultsArchive";
import { useEffect } from "react";

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
            path={"/admin/tournaments/:tournamentId/control"}
            component={DiscordStaffTournamentControlRoomRoute}
          />
          <Route path={"/404"} component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
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
