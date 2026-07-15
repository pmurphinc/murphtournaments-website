import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type CtaButtonProps = ComponentProps<typeof Button> & {
  tone?: "gold" | "outline";
};

export default function CtaButton({
  tone = "gold",
  className,
  variant,
  ...props
}: CtaButtonProps) {
  return (
    <Button
      variant={variant ?? (tone === "gold" ? "default" : "outline")}
      className={cn(
        "h-11 rounded-md px-6 font-mono text-xs font-bold uppercase tracking-widest",
        tone === "gold" &&
          "bg-[var(--mt-gold)] text-[var(--mt-gold-foreground)] hover:bg-[var(--mt-gold-bright)]",
        tone === "outline" &&
          "border-[var(--mt-steel-line)] text-[var(--mt-off-white)] hover:border-[var(--mt-gold)] hover:bg-transparent hover:text-[var(--mt-gold-bright)]",
        className
      )}
      {...props}
    />
  );
}
