import LoadoutBalanceArchive from "@/components/LoadoutBalanceArchive";

export default function LoadoutTracker() {
  return (
    <LoadoutBalanceArchive
      title="Loadout Tracker"
      description="Live weapon and gadget balance tracker sourced from THE FINALS Wiki. New loadout items are automatically surfaced even before they receive their first balance patch."
      basePath="/loadout-tracker"
    />
  );
}
