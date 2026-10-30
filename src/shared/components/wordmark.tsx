import Link from "next/link";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href={routes.home} className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-[12px] pr-2", focusRing)}>
      <img src="/logo-lien-viet.png" alt="" className="h-10 w-auto" />
      <span>
        <span className="block text-[13px] font-semibold tracking-[0.16em] text-navy">LIÊN VIỆT DOOR</span>
        {compact ? null : (
          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">Quản lý công trình và vận hành</span>
        )}
      </span>
    </Link>
  );
}
