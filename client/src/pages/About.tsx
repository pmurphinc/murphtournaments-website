import SectionHeading from "@/components/public/SectionHeading";
import StatDisplay from "@/components/public/StatDisplay";
import CtaButton from "@/components/public/CtaButton";

const coreValues = [
  {
    title: "Competitive Integrity",
    description:
      "Every tournament is run with fairness, transparency, and professionalism. No shortcuts, no excuses. Competition is only meaningful when the playing field is level.",
  },
  {
    title: "Player Development",
    description:
      "We believe in creating pathways for players to improve and advance. The Development Division exists to help Plat–Diamond players reach their competitive potential.",
  },
  {
    title: "Community First",
    description:
      "Built on community. Discord is the hub. Tournaments are for players. Streams are for fans. Everything serves the competitive community.",
  },
  {
    title: "Professionalism",
    description:
      "Tournament production, stream quality, and communication are held to professional standards. Representing the competitive scene with pride.",
  },
];

const orgStructure = [
  {
    number: "01",
    title: "Murph Tournaments",
    description:
      "14 competitive tournaments showcasing THE FINALS' best talent. Each event features professional production, fair competition, and meaningful prize pools.",
  },
  {
    number: "02",
    title: "Development Division",
    description:
      "Monthly tournaments for Plat–Diamond players seeking competitive experience. A division of Murph Tournaments, providing structured matches, feedback, and stream exposure.",
  },
];

export default function About() {
  return (
    <div>
      <div className="border-b border-[var(--mt-steel-line)] py-16 sm:py-20">
        <div className="container">
          <SectionHeading
            level="h1"
            eyebrow="Competitive Tournament Organization & Player Development"
            title="About Murph Tournaments"
          />
        </div>
      </div>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="mt-panel p-6 md:col-span-2">
            <h2 className="mb-6 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
              Murph
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-[var(--mt-muted)]">
              <p>
                Competitive esports organizer and systems builder focused on THE
                FINALS ecosystem. With a passion for competitive integrity and
                player development, establishing Murph Tournaments as a trusted
                hub for serious competitors.
              </p>
              <p>
                His approach to tournament organization emphasizes fairness,
                structure, and professionalism. Every event is designed to
                provide players with a competitive environment that rewards
                skill, teamwork, and dedication.
              </p>
              <p>
                Murph Tournaments operates two main initiatives: the flagship
                Murph Tournaments (competitive events) and the Development
                Division (monthly tournaments for aspiring players). This
                structure creates a clear pathway from casual play to
                professional competition.
              </p>
              <p>
                As a producer and organizer within THE FINALS competitive scene,
                Murph continues to expand opportunities for players at all
                levels to compete with integrity and purpose.
              </p>
            </div>
          </div>

          <div className="mt-panel p-6">
            <h3 className="mb-5 text-sm font-bold uppercase tracking-widest text-[var(--mt-gold-bright)]">
              By The Numbers
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatDisplay label="TikTok Followers" value="10K+" />
              <StatDisplay label="TikTok Likes" value="400K+" />
              <StatDisplay label="TikTok Views" value="5M+" />
              <StatDisplay label="YouTube Videos" value="621" />
              <StatDisplay label="Hours Rendered" value="170+" />
              <StatDisplay label="Creating Since" value="2009" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <h2 className="mb-6 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Core Values
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {coreValues.map(value => (
              <div key={value.title} className="mt-panel p-5">
                <h3 className="mb-2 font-bold text-[var(--mt-off-white)]">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--mt-muted)]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mt-steel-line)] py-12 sm:py-16">
        <div className="container">
          <h2 className="mb-6 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Organizational Structure
          </h2>
          <div className="space-y-4">
            {orgStructure.map(item => (
              <div
                key={item.number}
                className="mt-panel flex items-start gap-4 p-5"
              >
                <span
                  aria-hidden="true"
                  className="min-w-fit font-mono text-3xl font-bold text-[var(--mt-gold)]/40"
                >
                  {item.number}
                </span>
                <div>
                  <h3 className="mb-2 font-bold text-[var(--mt-off-white)]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--mt-muted)]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 text-center sm:py-16">
        <div className="container">
          <h2 className="mb-4 text-xl font-bold uppercase tracking-wide text-[var(--mt-off-white)]">
            Connect
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-[var(--mt-muted)]">
            Join the community on Discord to connect with players, learn about
            tournaments, and stay updated on all competitive opportunities.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="https://discord.gg/kcmdxmBgnC"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="gold" className="w-full sm:w-auto">
                Join Discord
              </CtaButton>
            </a>
            <a
              href="https://www.youtube.com/Pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="outline" className="w-full sm:w-auto">
                YouTube
              </CtaButton>
            </a>
            <a
              href="https://www.tiktok.com/@pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="outline" className="w-full sm:w-auto">
                TikTok
              </CtaButton>
            </a>
            <a
              href="https://www.twitch.tv/pmurphinc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CtaButton tone="outline" className="w-full sm:w-auto">
                Twitch
              </CtaButton>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
