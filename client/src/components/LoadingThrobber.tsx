const MURPH_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663462787524/GzitzUSk3snQMAtW4LnLnQ/murph_profile2_52a2b30d.png";

export default function LoadingThrobber() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-dark-charcoal z-50">
      <img
        src={MURPH_IMG}
        alt=""
        className="w-20 h-20 object-contain animate-[throb_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
      />
    </div>
  );
}
