import LoadoutBalanceArchive from "@/components/LoadoutBalanceArchive";

export default function BalanceArchive() {
  return (
    <LoadoutBalanceArchive
      title="Balance Archive"
      description="Browse THE FINALS weapon and gadget balance history directly in Murph Tournaments. Filter by build, item type, and patch recency without leaving the app."
      basePath="/balance-archive"
    />
  );
}
