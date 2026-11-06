import { getDiscordLoginUrl } from "@/lib/discordLogin";

/**
 * What a signed-out visitor sees at /TCR.
 *
 * This replaced a bare "Discord sign-in required" card. That card asked a
 * first-time visitor to sign in to something it never named or explained,
 * which is the worst possible landing for the one page an announcement
 * sends people to. Explain the product first; the sign-in button is the
 * last thing on the page, not the only thing.
 *
 * It also answers the question the old card provoked most often: someone
 * following a shared bracket link does not need an account at all.
 */

const STEPS = [
  {
    n: "01",
    title: "Create a tournament",
    body: "Sign in with Discord and start a board — from scratch, or from a template you have saved.",
  },
  {
    n: "02",
    title: "Build the bracket",
    body: "Add teams, lay out groups and matches, and track results as they come in. Invite staff if you are not running it alone.",
  },
  {
    n: "03",
    title: "Share one link",
    body: "Everyone watching gets a live viewer link. It updates as you run the bracket, and nobody needs an account to open it.",
  },
];

const FACTS = [
  { value: "32", label: "teams per tournament" },
  { value: "128", label: "matches per bracket" },
  { value: "12", label: "tournaments at a time" },
];

export default function TcrSignedOutLanding() {
  return (
    <section className="min-h-screen bg-[var(--mt-black)] px-6 py-16 text-[var(--mt-off-white)]">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--mt-muted)]">
          Murph Tournaments
        </p>
        <h1 className="mt-3 font-mono text-4xl font-black uppercase leading-tight text-[var(--mt-gold-bright)] sm:text-5xl">
          Tournament Control Room
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--mt-off-white)]/85">
          Run your own THE FINALS tournament: build the bracket, track every
          match, and give everyone watching one link that stays current.
        </p>

        <ol className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map(step => (
            <li
              key={step.n}
              className="rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-5"
            >
              <span className="font-mono text-xs font-bold tracking-[0.2em] text-[var(--mt-gold)]">
                {step.n}
              </span>
              <h2 className="mt-2 font-mono text-base font-bold text-[var(--mt-off-white)]">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--mt-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-y border-[var(--mt-steel-line)] py-5">
          {FACTS.map(fact => (
            <div key={fact.label} className="min-w-0">
              <dt className="sr-only">{fact.label}</dt>
              <dd className="font-mono text-2xl font-black tabular-nums text-[var(--mt-gold-bright)]">
                {fact.value}{" "}
                <span className="font-sans text-xs font-normal uppercase tracking-wider text-[var(--mt-muted)]">
                  {fact.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 rounded border border-[var(--mt-steel-line)] bg-[var(--mt-charcoal)] p-6">
          <h2 className="font-mono text-lg font-bold text-[var(--mt-gold-bright)]">
            Ready to run one?
          </h2>
          <p className="mt-2 text-sm text-[var(--mt-muted)]">
            Signing in with Discord is all it takes. It is free, and your
            tournaments stay yours.
          </p>
          <a
            href={getDiscordLoginUrl()}
            className="mt-5 inline-flex rounded border border-[#5865F2]/70 bg-[#5865F2] px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white hover:border-[var(--mt-gold)]"
          >
            Sign in with Discord
          </a>
        </div>

        <p className="mt-8 text-sm text-[var(--mt-muted)]">
          <span className="font-mono font-bold text-[var(--mt-off-white)]">
            Just here to watch?
          </span>{" "}
          A bracket link someone shared with you opens straight away — no
          account, no sign-in.
        </p>
      </div>
    </section>
  );
}
