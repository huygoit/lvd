"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, PackageCheck, Search, Truck, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import type { NavGroup } from "@/shared/config/navigation";
import { routes } from "@/shared/config/routes";
import { cn, focusRing } from "@/shared/lib/cn";
import { Wordmark } from "@/shared/components/wordmark";
import type { Attention, SearchGroup } from "@/modules/dashboard/types";

type Account = { name: string; roleLabel: string; initials: string };

const primaryIds = new Set(["tong-quan", "kinh-doanh", "cong-trinh"]);

export function AppChrome({
  account,
  attention,
  groups,
}: {
  account: Account;
  attention: Attention;
  groups: NavGroup[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    dialogRef.current?.showModal();
    setMenuOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }

  const extra = groups.filter((group) => !primaryIds.has(group.id));

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-sm">
      <header className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Wordmark compact />
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <div className="w-full max-w-xl">
            <SearchBox />
          </div>
        </div>
        <div className="ml-auto flex items-center justify-end gap-1">
          <div className="md:hidden">
            <SearchBox />
          </div>
          <NoticeMenu attention={attention} />
          <AccountMenu account={account} />
          <button
            ref={menuButtonRef}
            type="button"
            className={cn("inline-flex size-11 items-center justify-center rounded-[12px] text-navy md:hidden", focusRing)}
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={openMenu}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <nav className="mx-auto hidden w-full max-w-[1600px] items-center gap-1 px-4 pb-2 md:flex sm:px-6 lg:px-8" aria-label="Nghiệp vụ">
        <div className="hidden items-center gap-1 xl:flex">
          {groups.map((group) => (
            <NavEntry key={group.id} group={group} />
          ))}
        </div>
        <div className="flex items-center gap-1 xl:hidden">
          {groups
            .filter((group) => primaryIds.has(group.id))
            .map((group) => (
              <NavEntry key={group.id} group={group} />
            ))}
          {extra.length > 0 ? <MoreMenu groups={extra} /> : null}
        </div>
      </nav>
      <dialog
        ref={dialogRef}
        className="sheet"
        aria-label="Menu nghiệp vụ"
        onClose={() => {
          setMenuOpen(false);
          menuButtonRef.current?.focus();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-navy">Menu</p>
          <button type="button" className={cn("inline-flex size-11 items-center justify-center rounded-[12px]", focusRing)} onClick={closeMenu} aria-label="Đóng menu">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-1 overflow-y-auto p-3">
          {groups.map((group) =>
            group.href ? (
              <Link key={group.id} href={group.href} className={cn("flex min-h-11 items-center rounded-[12px] px-3 text-sm font-medium", focusRing)} onClick={closeMenu}>
                {group.label}
              </Link>
            ) : (
              <details key={group.id} className="rounded-[12px] border border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium">
                  {group.label}
                  <ChevronDown className="size-4 text-muted" />
                </summary>
                <div className="space-y-1 px-2 pb-2">
                  {group.items.map((item) =>
                    item.state === "link" && item.href ? (
                      <Link key={item.id} href={item.href} className={cn("flex min-h-11 items-center rounded-[10px] px-3 text-sm", focusRing)} onClick={closeMenu}>
                        {item.label}
                      </Link>
                    ) : (
                      <p key={item.id} className="flex min-h-11 items-center justify-between px-3 text-sm text-muted">
                        {item.label}
                        <span className="text-[11px]">{item.badge}</span>
                      </p>
                    ),
                  )}
                </div>
              </details>
            ),
          )}
        </div>
      </dialog>
    </div>
  );
}

function NavEntry({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const active = group.href ? pathname === group.href : group.items.some((item) => item.href && pathname.startsWith(item.href));

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (group.href) {
    return (
      <Link
        href={group.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "inline-flex min-h-11 items-center rounded-[12px] px-3 text-sm font-medium text-slate-700",
          focusRing,
          active && "bg-soft font-semibold text-deep",
        )}
      >
        {group.label}
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "inline-flex min-h-11 items-center gap-1 rounded-[12px] px-3 text-sm font-medium text-slate-700",
          focusRing,
          active && "bg-soft font-semibold text-deep",
        )}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {group.label}
        <ChevronDown className="size-4" />
      </button>
      {open ? (
        <div id={menuId} role="menu" className="absolute left-0 top-12 z-50 w-64 rounded-[14px] border border-line bg-white p-1.5 shadow-[var(--shadow-card)]">
          {group.items.map((item) =>
            item.state === "link" && item.href ? (
              <Link
                key={item.id}
                role="menuitem"
                href={item.href}
                className={cn("flex min-h-11 items-center rounded-[10px] px-3 text-sm text-ink hover:bg-soft", focusRing)}
                aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <button key={item.id} type="button" role="menuitem" disabled className="flex min-h-11 w-full items-center justify-between rounded-[10px] px-3 text-left text-sm text-muted">
                {item.label}
                <span className="text-[11px]">{item.badge}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function MoreMenu({ groups }: { groups: NavGroup[] }) {
  return <NavEntry group={{ id: "them", label: "Thêm", items: groups.flatMap((group) => group.items.length ? [{ id: group.id, label: group.label, state: "disabled" as const, badge: "" }, ...group.items] : []) }} />;
}

function SearchBox() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/tim-kiem?q=${encodeURIComponent(needle)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.href = routes.login;
          return;
        }
        if (!response.ok) throw new Error("loi");
        const body = (await response.json()) as { groups: SearchGroup[] };
        setGroups(body.groups);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Không tìm được lúc này.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative min-w-0 flex-1 md:max-w-md" ref={boxRef}>
      <button
        type="button"
        className={cn("inline-flex size-11 items-center justify-center rounded-[12px] text-navy md:hidden", focusRing)}
        aria-label="Mở tìm kiếm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Search className="size-5" />
      </button>
      <div className={cn("absolute right-0 top-12 z-50 w-[min(100vw-2rem,24rem)] md:static md:w-full", open ? "block" : "hidden md:block")}>
        <label className="relative block">
          <span className="sr-only">Tìm khách hàng, công trình hoặc báo giá</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 hidden size-4 -translate-y-1/2 text-muted md:block" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Tìm theo mã hoặc tên"
            className={cn("h-11 w-full rounded-[12px] border border-line bg-page pl-3 text-sm outline-none md:pl-9", focusRing)}
          />
        </label>
        {open && query.trim().length > 0 ? (
          <div className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-[14px] border border-line bg-white p-2 shadow-[var(--shadow-card)]">
            {query.trim().length < 2 ? <p className="px-2 py-3 text-sm text-muted">Nhập ít nhất 2 ký tự.</p> : null}
            {query.trim().length >= 2 && loading ? <p className="px-2 py-3 text-sm text-muted">Đang tìm...</p> : null}
            {query.trim().length >= 2 && error ? <p className="px-2 py-3 text-sm text-danger">{error}</p> : null}
            {query.trim().length >= 2 && !loading && !error && groups && groups.length === 0 ? <p className="px-2 py-3 text-sm text-muted">Không thấy kết quả phù hợp.</p> : null}
            {query.trim().length >= 2
              ? groups?.map((group) => (
              <div key={group.id} className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.label}</p>
                {group.items.map((item) => (
                  <Link key={item.href} href={item.href} className={cn("block rounded-[10px] px-2 py-2 hover:bg-soft", focusRing)} onClick={() => setOpen(false)}>
                    <span className="block text-sm font-medium text-ink">{item.title}</span>
                    <span className="block text-xs text-muted">{item.meta}</span>
                  </Link>
                ))}
              </div>
            ))
              : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type NoticeCard = { id: string; title: string; body: string; href: string; kind: string; read: boolean; createdAt: string };

function lucNao(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = Math.round(diff / 60000);
  if (!Number.isFinite(minute) || minute < 1) return "Vừa xong";
  if (minute < 60) return `${minute} phút trước`;
  const hour = Math.round(minute / 60);
  if (hour < 24) return `${hour} giờ trước`;
  return `${Math.round(hour / 24)} ngày trước`;
}

function NoticeMenu({ attention }: { attention: Attention }) {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<NoticeCard[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function loadNotices() {
    void callApi<{ notices: NoticeCard[] }>("/api/thong-bao")
      .then((data) => setNotices(data.notices))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (open) loadNotices();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const unread = notices.filter((item) => !item.read).length;
  const label = unread
    ? `Thông báo, ${unread} tin chưa đọc`
    : attention.unavailable
      ? "Thông báo, chưa có nguồn dữ liệu"
      : `Thông báo, ${attention.count} việc cần xử lý`;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className={cn("relative inline-flex size-11 items-center justify-center rounded-[12px] text-navy", focusRing)}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-5" />
        {unread > 0 || attention.count > 0 ? (
          <span className={cn("absolute right-1 top-1 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white", unread > 0 ? "bg-primary" : "bg-danger")}>
            {unread || attention.count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 flex max-h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {notices.length ? (
            <div className="mb-2">
              <p className="px-2 pt-1 text-sm font-semibold text-ink">Thông báo</p>
              <p className="px-2 pb-1 text-xs text-muted">Giao nhận vật tư</p>
              {notices.map((item) => {
                const Icon = item.kind === "nhan" ? PackageCheck : Truck;
                return (
                  <Link
                    key={item.id}
                    href={item.href || routes.home}
                    className={cn("mb-1 flex gap-3 rounded-2xl px-2.5 py-2.5", item.read ? "hover:bg-soft" : "bg-primary/5 hover:bg-primary/10", focusRing)}
                    onClick={() => {
                      void fetch(`/api/thong-bao/${item.id}`, { method: "POST" });
                      setNotices((current) => current.map((row) => row.id === item.id ? { ...row, read: true } : row));
                      setOpen(false);
                    }}
                  >
                    <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl", item.kind === "nhan" ? "bg-emerald-50 text-emerald-700" : "bg-primary/10 text-primary")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5 text-ink">{item.title}</span>
                      <span className="mt-0.5 block whitespace-pre-line text-xs leading-5 text-muted">{item.body}</span>
                      <span className="mt-1 block text-[11px] font-medium text-primary">{lucNao(item.createdAt)}</span>
                    </span>
                    {item.read ? null : <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          ) : null}
          <p className="px-2 py-1 text-sm font-semibold text-ink">Việc cần xử lý</p>
          {attention.unavailable ? <p className="px-2 py-3 text-sm text-muted">Chưa có nguồn dữ liệu.</p> : null}
          {!attention.unavailable && attention.items.length === 0 ? <p className="px-2 py-3 text-sm text-muted">Không có việc cần xử lý.</p> : null}
          {attention.items.map((item) => (
            <Link key={item.id} href={item.href} className={cn("block rounded-[10px] px-2 py-2 hover:bg-soft", focusRing)} onClick={() => setOpen(false)}>
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="block text-xs text-muted">{item.badge}</span>
            </Link>
          ))}
          <Link href={`${routes.home}#viec-can-xu-ly`} className={cn("mt-1 flex min-h-11 items-center px-2 text-sm font-semibold text-primary", focusRing)} onClick={() => setOpen(false)}>
            Mở trên Tổng quan
          </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/phien/dang-xuat", { method: "POST" });
    router.replace(routes.login);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className={cn("inline-flex min-h-11 items-center gap-2 rounded-[12px] px-1.5", focusRing)}
        aria-label={`Tài khoản ${account.name}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-9 place-items-center rounded-full bg-soft text-xs font-semibold text-deep">{account.initials}</span>
        <span className="hidden text-left lg:block">
          <span className="block text-sm font-semibold leading-4 text-ink">{account.name}</span>
          <span className="block text-[11px] text-muted">{account.roleLabel}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-60 rounded-[14px] border border-line bg-white p-2 shadow-[var(--shadow-card)]">
          <p className="px-2 py-1 text-sm font-semibold">{account.name}</p>
          <p className="px-2 pb-2 text-xs text-muted">{account.roleLabel}</p>
          <Link href={routes.home} className={cn("flex min-h-11 items-center rounded-[10px] px-2 text-sm", focusRing)} onClick={() => setOpen(false)}>
            Tổng quan
          </Link>
          <button type="button" className={cn("flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2 text-left text-sm", focusRing)} onClick={logout}>
            <LogOut className="size-4" />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
