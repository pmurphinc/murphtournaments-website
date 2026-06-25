import {
  FINALS_CLASSES,
  TEAM_FINDER_LIMITS,
  TEAM_FINDER_REGIONS,
  TEAM_FINDER_REGION_LABELS,
  type FinalsClass,
  type TeamFinderRegion,
} from "@shared/teamFinder";
import { useState } from "react";
import type { TeamFinderListingView } from "./TeamFinderListingCard";

export type PlayerFormPayload = {
  listingType: "player";
  region: TeamFinderRegion;
  description: string;
  targetTournament?: string;
  embarkId: string;
  mainClasses: FinalsClass[];
  preferredRole?: string;
  experience?: string;
  availability?: string;
  twitchUrl?: string;
  youtubeUrl?: string;
  website: string;
};

export type TeamFormPayload = {
  listingType: "team";
  region: TeamFinderRegion;
  description: string;
  targetTournament?: string;
  teamName: string;
  rosterCount: number;
  neededClass: string;
  experience?: string;
  practiceAvailability?: string;
  website: string;
};

export type TeamFinderFormPayload = PlayerFormPayload | TeamFormPayload;

type Props = {
  mode: "create" | "edit";
  /** When editing, the listing being edited (locks the listing type). */
  initial?: TeamFinderListingView;
  submitting: boolean;
  formError?: string | null;
  fieldErrors?: Record<string, string>;
  onSubmit: (payload: TeamFinderFormPayload) => void;
  onCancel?: () => void;
};

const inputClass =
  "w-full rounded border border-neon-cyan/50 bg-black/60 px-3 py-2 font-mono text-white outline-none transition-colors placeholder:text-white/30 focus:border-neon-cyan";
const labelClass =
  "mb-2 block font-mono text-sm uppercase tracking-widest text-white/80";

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="mt-2 font-mono text-xs text-red-300">{message}</p>
  ) : null;

export default function TeamFinderForm({
  mode,
  initial,
  submitting,
  formError,
  fieldErrors = {},
  onSubmit,
  onCancel,
}: Props) {
  const [listingType, setListingType] = useState<"player" | "team">(
    initial?.listingType ?? "player"
  );
  const [region, setRegion] = useState<TeamFinderRegion>(
    initial?.region ?? "NA"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [targetTournament, setTargetTournament] = useState(
    initial?.targetTournament ?? ""
  );

  // Player fields
  const [embarkId, setEmbarkId] = useState(initial?.embarkId ?? "");
  const [mainClasses, setMainClasses] = useState<FinalsClass[]>(
    initial?.mainClasses ?? []
  );
  const [preferredRole, setPreferredRole] = useState(
    initial?.preferredRole ?? ""
  );
  const [availability, setAvailability] = useState(initial?.availability ?? "");
  const [twitchUrl, setTwitchUrl] = useState(initial?.twitchUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");

  // Team fields
  const [teamName, setTeamName] = useState(initial?.teamName ?? "");
  const [rosterCount, setRosterCount] = useState<string>(
    initial?.rosterCount != null ? String(initial.rosterCount) : "1"
  );
  const [neededClass, setNeededClass] = useState(initial?.neededClass ?? "");
  const [practiceAvailability, setPracticeAvailability] = useState(
    initial?.practiceAvailability ?? ""
  );

  // Shared
  const [experience, setExperience] = useState(initial?.experience ?? "");
  // Honeypot: must stay empty.
  const [website, setWebsite] = useState("");

  const toggleClass = (cls: FinalsClass) => {
    setMainClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const optional = (value: string) => {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    if (listingType === "player") {
      onSubmit({
        listingType: "player",
        region,
        description: description.trim(),
        targetTournament: optional(targetTournament),
        embarkId: embarkId.trim(),
        mainClasses,
        preferredRole: optional(preferredRole),
        experience: optional(experience),
        availability: optional(availability),
        twitchUrl: optional(twitchUrl),
        youtubeUrl: optional(youtubeUrl),
        website,
      });
      return;
    }

    onSubmit({
      listingType: "team",
      region,
      description: description.trim(),
      targetTournament: optional(targetTournament),
      teamName: teamName.trim(),
      rosterCount: Number.parseInt(rosterCount, 10) || 0,
      neededClass: neededClass.trim(),
      experience: optional(experience),
      practiceAvailability: optional(practiceAvailability),
      website,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Listing type toggle (locked while editing) */}
      <fieldset>
        <legend className={labelClass}>I am a…</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["player", "team"] as const).map(type => {
            const active = listingType === type;
            const disabled = mode === "edit" && type !== initial?.listingType;
            return (
              <label
                key={type}
                className={`rounded border px-3 py-3 text-center font-mono text-sm transition-all ${
                  active
                    ? "border-neon-magenta bg-neon-magenta/15 text-white shadow-[0_0_14px_rgba(255,0,127,0.25)]"
                    : "border-white/15 bg-black/40 text-white/70 hover:border-neon-cyan/60"
                } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="listingType"
                  value={type}
                  checked={active}
                  onChange={() => setListingType(type)}
                  className="sr-only"
                  disabled={disabled || submitting}
                />
                {type === "player"
                  ? "Player looking for a team"
                  : "Team looking for players"}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Region */}
      <div>
        <label className={labelClass} htmlFor="tf-region">
          Region
        </label>
        <select
          id="tf-region"
          value={region}
          onChange={e => setRegion(e.target.value as TeamFinderRegion)}
          className={inputClass}
          disabled={submitting}
        >
          {TEAM_FINDER_REGIONS.map(r => (
            <option key={r} value={r}>
              {TEAM_FINDER_REGION_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {/* Player-specific */}
      {listingType === "player" ? (
        <>
          <div>
            <label className={labelClass} htmlFor="tf-embark">
              Embark ID
            </label>
            <input
              id="tf-embark"
              value={embarkId}
              onChange={e => setEmbarkId(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.embarkId}
              className={inputClass}
              placeholder="YourName#1234"
              disabled={submitting}
            />
            <FieldError message={fieldErrors.embarkId} />
          </div>

          <fieldset>
            <legend className={labelClass}>Main class(es)</legend>
            <div className="grid grid-cols-3 gap-3">
              {FINALS_CLASSES.map(cls => {
                const active = mainClasses.includes(cls);
                return (
                  <label
                    key={cls}
                    className={`cursor-pointer rounded border px-3 py-2 text-center font-mono text-sm transition-all ${
                      active
                        ? "border-neon-cyan bg-neon-cyan/15 text-white"
                        : "border-white/15 bg-black/40 text-white/70 hover:border-neon-cyan/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleClass(cls)}
                      className="sr-only"
                      disabled={submitting}
                    />
                    {cls}
                  </label>
                );
              })}
            </div>
            <FieldError message={fieldErrors.mainClasses} />
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="tf-role">
              Preferred role (optional)
            </label>
            <input
              id="tf-role"
              value={preferredRole}
              onChange={e => setPreferredRole(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.preferredRole}
              className={inputClass}
              placeholder="IGL, support, entry…"
              disabled={submitting}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="tf-availability">
              Availability (optional)
            </label>
            <input
              id="tf-availability"
              value={availability}
              onChange={e => setAvailability(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.availability}
              className={inputClass}
              placeholder="Weeknights EST, weekends…"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="tf-twitch">
                Twitch (optional)
              </label>
              <input
                id="tf-twitch"
                value={twitchUrl}
                onChange={e => setTwitchUrl(e.target.value)}
                maxLength={TEAM_FINDER_LIMITS.url}
                className={inputClass}
                placeholder="https://twitch.tv/you"
                disabled={submitting}
              />
              <FieldError message={fieldErrors.twitchUrl} />
            </div>
            <div>
              <label className={labelClass} htmlFor="tf-youtube">
                YouTube (optional)
              </label>
              <input
                id="tf-youtube"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                maxLength={TEAM_FINDER_LIMITS.url}
                className={inputClass}
                placeholder="https://youtube.com/@you"
                disabled={submitting}
              />
              <FieldError message={fieldErrors.youtubeUrl} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className={labelClass} htmlFor="tf-teamname">
              Team name
            </label>
            <input
              id="tf-teamname"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.teamName}
              className={inputClass}
              placeholder="Team name"
              disabled={submitting}
            />
            <FieldError message={fieldErrors.teamName} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="tf-roster">
                Current roster size
              </label>
              <input
                id="tf-roster"
                type="number"
                min={0}
                max={TEAM_FINDER_LIMITS.rosterCountMax}
                value={rosterCount}
                onChange={e => setRosterCount(e.target.value)}
                className={inputClass}
                disabled={submitting}
              />
              <FieldError message={fieldErrors.rosterCount} />
            </div>
            <div>
              <label className={labelClass} htmlFor="tf-needed">
                Class / role needed
              </label>
              <input
                id="tf-needed"
                value={neededClass}
                onChange={e => setNeededClass(e.target.value)}
                maxLength={TEAM_FINDER_LIMITS.neededClass}
                className={inputClass}
                placeholder="Heavy, flex, IGL…"
                disabled={submitting}
              />
              <FieldError message={fieldErrors.neededClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="tf-practice">
              Practice availability (optional)
            </label>
            <input
              id="tf-practice"
              value={practiceAvailability}
              onChange={e => setPracticeAvailability(e.target.value)}
              maxLength={TEAM_FINDER_LIMITS.practiceAvailability}
              className={inputClass}
              placeholder="Scrims Tue/Thu 8pm EST…"
              disabled={submitting}
            />
          </div>
        </>
      )}

      {/* Shared: experience + target tournament + description */}
      <div>
        <label className={labelClass} htmlFor="tf-experience">
          Experience / rank (optional)
        </label>
        <input
          id="tf-experience"
          value={experience}
          onChange={e => setExperience(e.target.value)}
          maxLength={TEAM_FINDER_LIMITS.experience}
          className={inputClass}
          placeholder="Diamond, ex-FCL, 1.5k hours…"
          disabled={submitting}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="tf-tournament">
          Target tournament (optional)
        </label>
        <input
          id="tf-tournament"
          value={targetTournament}
          onChange={e => setTargetTournament(e.target.value)}
          maxLength={TEAM_FINDER_LIMITS.targetTournament}
          className={inputClass}
          placeholder="Development Division, June 2026…"
          disabled={submitting}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="tf-description">
          Description
        </label>
        <textarea
          id="tf-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={TEAM_FINDER_LIMITS.description}
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder={
            listingType === "player"
              ? "Tell teams about your playstyle, goals, and what you're looking for."
              : "Tell players about your team, goals, and who you're recruiting."
          }
          disabled={submitting}
        />
        <div className="mt-1 flex justify-between">
          <FieldError message={fieldErrors.description} />
          <span className="ml-auto font-mono text-[11px] text-white/30">
            {description.length}/{TEAM_FINDER_LIMITS.description}
          </span>
        </div>
      </div>

      {/* Honeypot: hidden from real users, traps bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="tf-website">Website</label>
        <input
          id="tf-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </div>

      {formError ? (
        <div className="rounded border border-red-500/40 bg-red-950/30 p-3 font-mono text-sm text-red-100">
          {formError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-sm border-2 border-neon-magenta px-6 py-3 font-mono font-bold uppercase tracking-widest text-neon-magenta transition-all hover:bg-neon-magenta/10 hover-glow-magenta disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Post listing"
              : "Save changes"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-sm border border-white/30 px-6 py-3 font-mono uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
