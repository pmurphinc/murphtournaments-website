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
import { useEffect } from "react";

/**
 * PMURPHINC Website
 * Cyberpunk Neon Rebellion Design
 * - Dark cyberpunk aesthetic with neon accents
 * - Responsive mobile-first layout
 * - Tournament-focused content structure
 */
function Router() {
  // Scroll to top on route change
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1 pt-16">
        <Switch>
          <Route path={"/"} component={Home} />
          <Route
            path={"/tournaments/june-2026"}
            component={JuneTournament2026}
          />
          <Route path={"/tournaments"} component={TournamentHistory} />
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
