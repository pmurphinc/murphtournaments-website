import GlitchText from "@/components/GlitchText";
import LoadingThrobber from "@/components/LoadingThrobber";
import TeamFinderListingCard from "@/components/TeamFinderListingCard";
import { trpc } from "@/lib/trpc";

export default function TeamFinder() {
  const utils = trpc.useUtils();
  const auth = trpc.auth.me.useQuery();
  const listings = trpc.teamFinder.list.useQuery();
  const setHidden = trpc.teamFinder.setHidden.useMutation({
    onSuccess: () => utils.teamFinder.list.invalidate(),
  });

  const user = auth.data;
  const isAdmin = user?.role === "admin";

  return (
    <div className="container py-12">
      <div className="mb-8 max-w-3xl">
        <GlitchText className="mb-4 font-display text-5xl text-white">Team Finder</GlitchText>
        <p className="text-lg text-white/75">
          Find Finals teammates for Murph Tournaments events. Hidden listings are filtered on the server for public visitors; admins can review and restore them here.
        </p>
      </div>

      {listings.isLoading ? (
        <LoadingThrobber />
      ) : listings.isError ? (
        <p className="rounded border border-neon-magenta/50 bg-neon-magenta/10 p-4 text-neon-magenta">
          Unable to load Team Finder listings.
        </p>
      ) : listings.data && listings.data.length > 0 ? (
        <div className="grid gap-5">
          {listings.data.map(listing => (
            <TeamFinderListingCard
              key={listing.id}
              listing={listing}
              isAdmin={isAdmin}
              currentUserId={user?.id}
              onToggleHidden={(id, hiddenByAdmin) => setHidden.mutate({ id, hiddenByAdmin })}
              isToggling={setHidden.isPending}
            />
          ))}
        </div>
      ) : (
        <p className="rounded border border-neon-cyan/30 bg-black/50 p-6 text-white/70">
          No Team Finder listings are live yet. Check back soon.
        </p>
      )}
    </div>
  );
}
