import WeaponBalanceArchive from "@/components/WeaponBalanceArchive";

export default function BalanceArchiveDetail({ params }: { params: { slug: string } }) {
  return <WeaponBalanceArchive mode={{ kind: "detail", slug: params.slug }} />;
}
