import { buttonVariants } from "@/shared/components/ui/button";
import { cn, focusRing } from "@/shared/lib/cn";

export const inputClass = cn(
  "h-9 w-full rounded-md border border-input bg-white px-3 text-sm text-ink shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

export const selectClass = inputClass;

export const buttonPrimary = buttonVariants();

export const buttonGhost = buttonVariants({ variant: "outline" });

export const panelClass = "overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-card)]";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export { focusRing };
