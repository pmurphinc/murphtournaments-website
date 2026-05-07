/**
 * Balance Archive Page
 * Displays weapons, gadgets, and specializations with full change history
 * Embedded from the external Balance Archive application
 */

export default function BalanceArchive() {
  return (
    <div className="min-h-screen bg-dark-charcoal">
      <div className="w-full h-screen">
        <iframe
          src="https://8081-i6hvdb1s1ajbn778eo59v-82f541b3.us2.manus.computer/balance-archive"
          title="Balance Archive"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
