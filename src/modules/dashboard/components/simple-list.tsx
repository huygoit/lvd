import Link from "next/link";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";

export function ListShell({
  title,
  description,
  message,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  message: string | null;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={routes.home} className={cn("text-sm font-semibold text-primary", focusRing)}>
            Về Tổng quan
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className={cn("inline-flex h-11 items-center rounded-[12px] bg-primary px-4 text-sm font-semibold text-white", focusRing)}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
      {message ? <p className="rounded-[16px] border border-line bg-white p-4 text-sm text-muted">{message}</p> : children}
    </div>
  );
}
