/**
 * Shared style tokens for the Tournament Control Room workspace.
 *
 * The workspace uses neutral dark surfaces with gold reserved as the single
 * primary accent (selection, active states, primary actions). Status colors
 * are always paired with a text label or icon so color is never the only
 * signal.
 */

export const tcrGold = "#FFD700";

/** Neutral panel chrome shared by the docks, toolbar, and top bar. */
export const tcrPanelClass = "border-white/10 bg-zinc-950";

/** Section heading inside panels. Sentence case, readable size. */
export const tcrPanelHeadingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/** Base for compact icon/tool buttons in the toolbar and panel headers. */
export const tcrToolButtonClass =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40";

/** Active/pressed state for toggle tools. */
export const tcrToolButtonActiveClass =
  "bg-[#FFD700]/15 text-[#FFD700] hover:bg-[#FFD700]/20 hover:text-[#FFD700]";

/** Primary (gold) action button. */
export const tcrPrimaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#FFD700] px-3 text-sm font-semibold text-black transition-colors hover:bg-[#e6c200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-40";

/** Neutral secondary button used inside panels. */
export const tcrSecondaryButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/70 disabled:pointer-events-none disabled:opacity-40";

/** Destructive button: readable red, no glow. */
export const tcrDangerButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-400/30 bg-red-950/30 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-950/60 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 disabled:pointer-events-none disabled:opacity-40";

/** Dropdown/context menu surface matching the panel chrome. */
export const tcrMenuContentClass =
  "border-white/10 bg-zinc-950 text-zinc-200 shadow-lg shadow-black/50";

/** Standard entries inside dropdown/context menus. */
export const tcrMenuItemClass = "focus:bg-white/10 focus:text-zinc-50";

/** Separators inside dropdown/context menus. */
export const tcrMenuSeparatorClass = "bg-white/10";

/** Destructive entries inside dropdown/context menus. */
export const tcrDangerMenuItemClass =
  "text-red-300 focus:bg-red-950/50 focus:text-red-200";

/** Field label inside the inspector. */
export const tcrFieldLabelClass = "text-xs font-medium text-zinc-400";

/** Select/input controls inside the inspector. */
export const tcrSelectClass =
  "h-9 w-full min-w-0 rounded-md border border-white/15 bg-zinc-900 px-2 text-sm text-zinc-100 outline-none transition-colors hover:border-white/30 focus-visible:ring-2 focus-visible:ring-[#FFD700]/70";
