import Link from "next/link";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href={routes.home} className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-[12px] pr-2", focusRing)}>
      <svg viewBox="0 0 32 32" className="size-9 text-primary" aria-hidden="true">
        <rect x="5" y="3" width="22" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M16 3v26" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="18.2" cy="16" r="1.1" fill="currentColor" />
      </svg>
      <span>
        <span className="block text-[13px] font-semibold tracking-[0.16em] text-navy">LIÊN VIỆT DOOR</span>
        {compact ? null : (
          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">Quản lý công trình và vận hành</span>
        )}
      </span>
    </Link>
  );
}
