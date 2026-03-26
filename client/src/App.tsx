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
import LiveBracket from "./pages/LiveBracket";
import DevDivision from "./pages/DevDivision";
import About from "./pages/About";
import Watch from "./pages/Watch";
import Join from "./pages/Join";
import AdminControl from "./pages/AdminControl";
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
          <Route path={"/tournaments"} component={TournamentHistory} />
          <Route path={"/bracket"} component={LiveBracket} />
          <Route path={"/dev-division"} component={DevDivision} />
          <Route path={"/about"} component={About} />
          <Route path={"/watch"} component={Watch} />
          <Route path={"/join"} component={Join} />
          <Route path={"/control-dd-7x9k2m"} component={AdminControl} />
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
