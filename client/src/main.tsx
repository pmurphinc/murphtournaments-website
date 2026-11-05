import * as Sentry from "@sentry/react";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// The Manus preview runtime mirrored the signed-in user into localStorage on
// every auth change. That tooling is gone, but the key is still sitting in the
// browser of everyone who visited before it was removed, so clear it on load.
// Safe to drop once the regulars have all been back.
try {
  localStorage.removeItem("manus-runtime-user-info");
} catch {
  /* storage can be unavailable in private mode or when blocked */
}

/**
 * Browser error reporting.
 *
 * Server errors reach the Railway logs; until this, anything that broke in a
 * visitor's browser reached nothing at all, and a React render error was
 * caught by ErrorBoundary and silently discarded.
 *
 * Like the analytics variables, VITE_SENTRY_DSN is read at BUILD time and
 * needs a matching ARG line in the Dockerfile or it never reaches `vite
 * build`. Unset, this block does nothing and no SDK is initialised — the
 * local and CI builds run without it.
 */
const sentryDsn = (import.meta.env as Record<string, string | undefined>)
  .VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: (import.meta.env as Record<string, string | undefined>).MODE,
    // Errors only, matching what the Sentry project was set up to collect.
    // Tracing and session replay are deliberately off: replay records what
    // people do on the page, which is a decision to take on purpose rather
    // than inherit from a default.
    tracesSampleRate: 0,
    // Noise that says nothing about our code: extensions injecting scripts,
    // and the ResizeObserver notice browsers emit during normal layout.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
  });
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
