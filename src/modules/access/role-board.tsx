"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { Capability } from "@/shared/auth/types";
import { isCapability, permissionGroups, permissionLabel } from "@/shared/auth/permissions";
import { callApi } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass, panelClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { PermissionPicker } from "@/modules/access/permission-picker";

type Account = { id: string; name: string };
type Mode = "them" | "sua" | "xem";

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  capabilities: string[];
  userIds: string[];
  userNames: string[];
};

const blank: RoleRow = {
  id: "",
  name: "",
  description: "",
  active: true,
  capabilities: [],
  userIds: [],
  userNames: [],
};

export function RoleBoard({
  rows,
  accounts,
  initialMode,
  initialId,
}: {
  rows: RoleRow[];
  accounts: Account[];
  initialMode: Mode | null;
  initialId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [targetId, setTargetId] = useState(initialId);
  const [detail, setDetail] = useState<RoleRow | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tick, setTick] = useState(0);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if ((mode !== "sua" && mode !== "xem") || !targetId) return;
    const control = new AbortController();
    setDetail(null);
    setLoadError("");
    callApi<RoleRow>(`/api/vai-tro/${targetId}`, { signal: control.signal })
      .then((row) => {
        if (!control.signal.aborted) setDetail(row);
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Không tải được vai trò.");
      });
    return () => control.abort();
  }, [mode, targetId, tick]);

  function openMode(next: Mode | null, id = "") {
    setMode(next);
    setTargetId(id);
    if (next === "them") setFormKey((value) => value + 1);
    const params = new URLSearchParams(window.location.search);
    if (next) params.set("mo", next);
    else params.delete("mo");
    if (id && next && next !== "them") params.set("ho-so", id);
    else params.delete("ho-so");
    const query = params.toString();
    router.replace(query ? `/vai-tro?${query}` : "/vai-tro", { scroll: false });
  }

  function saved() {
    router.refresh();
    openMode(null);
  }

  const current = mode === "them" ? blank : detail;
  const title = mode === "them" ? "Thêm vai trò" : mode === "sua" ? "Sửa vai trò" : current?.name || "Vai trò";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Vai trò và quyền</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Mỗi vai trò là một nhóm quyền. Tài khoản nhận quyền bằng cách được gán vào vai trò.</p>
        </div>
        <button type="button" className={buttonPrimary} onClick={() => openMode("them")}>Thêm vai trò</button>
      </div>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Vai trò</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead>Người dùng</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted">Chưa có vai trò.</TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-normal">
                  <button type="button" className="text-left" onClick={() => openMode("xem", row.id)}>
                    <span className="block font-medium text-ink">{row.name}</span>
                    <span className="block text-xs text-muted">{row.active ? "Đang dùng" : "Ngừng dùng"}</span>
                  </button>
                </TableCell>
                <TableCell className="text-muted">{row.capabilities.length}</TableCell>
                <TableCell className="whitespace-normal text-muted">{row.userNames.join(", ") || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => openMode("sua", row.id)}>
                    <Pencil /> Sửa
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Sheet open={mode !== null} onOpenChange={(open) => { if (!open) openMode(null); }}>
        <SheetContent className="sm:w-3/4">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {mode === "xem"
                ? "Quyền trong vai trò này cộng với các vai trò khác của cùng một người."
                : "Chọn quyền theo nhóm, rồi chọn người dùng được gán vai trò này."}
            </SheetDescription>
          </SheetHeader>
          {mode === "them" ? (
            <RoleForm key={`them-${formKey}`} initial={blank} accounts={accounts} onClose={() => openMode(null)} onSaved={saved} />
          ) : null}
          {mode === "sua" && !(detail && detail.id === targetId) ? <SheetWait error={loadError} onClose={() => openMode(null)} /> : null}
          {mode === "sua" && detail && detail.id === targetId ? (
            <RoleForm key={detail.id} initial={detail} accounts={accounts} onClose={() => openMode(null)} onSaved={saved} />
          ) : null}
          {mode === "xem" ? (
            <RoleView
              row={detail}
              error={loadError}
              onClose={() => openMode(null)}
              onEdit={() => openMode("sua", targetId)}
              onToggled={() => {
                setTick((value) => value + 1);
                router.refresh();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SheetWait({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 px-5 py-4">
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : <p className="text-sm text-muted">Đang tải vai trò...</p>}
      </div>
      <SheetFooter className="flex justify-end bg-white">
        <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
      </SheetFooter>
    </div>
  );
}

function RoleForm({
  initial,
  accounts,
  onClose,
  onSaved,
}: {
  initial: RoleRow;
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [capabilities, setCapabilities] = useState<Capability[]>(initial.capabilities.filter(isCapability));
  const [userIds, setUserIds] = useState<string[]>(initial.userIds);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggleUser(id: string) {
    setUserIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function onSubmit() {
    setBusy(true);
    setError("");
    try {
      await callApi(initial.id ? `/api/vai-tro/${initial.id}` : "/api/vai-tro", {
        method: initial.id ? "PATCH" : "POST",
        body: JSON.stringify({ name, description, capabilities, userIds }),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Field label="Tên vai trò">
          <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Kế toán" />
        </Field>
        <Field label="Mô tả">
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={cn(inputClass, "h-16 resize-none py-2")} placeholder="Người trong vai trò này làm được gì" />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Người dùng</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {accounts.map((account) => (
              <label key={account.id} className="flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-sm">
                <input type="checkbox" checked={userIds.includes(account.id)} onChange={() => toggleUser(account.id)} />
                {account.name}
              </label>
            ))}
          </div>
        </div>
        <PermissionPicker selected={capabilities} onChange={setCapabilities} />
      </div>
      {error ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{error}</p> : null}
      <SheetFooter className="flex justify-end gap-2 bg-white">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Đóng</Button>
        <Button type="button" disabled={busy} onClick={() => void onSubmit()}>{busy ? "Đang lưu" : "Lưu"}</Button>
      </SheetFooter>
    </div>
  );
}

function RoleView({
  row,
  error,
  onClose,
  onEdit,
  onToggled,
}: {
  row: RoleRow | null;
  error: string;
  onClose: () => void;
  onEdit: () => void;
  onToggled: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function toggle() {
    if (!row) return;
    setBusy(true);
    setActionError("");
    try {
      await callApi(`/api/vai-tro/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !row.active }),
      });
      setBusy(false);
      onToggled();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Không cập nhật được.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {!row && !error ? <p className="text-sm text-muted">Đang tải vai trò...</p> : null}
        {row ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={row.active ? "secondary" : "outline"}>{row.active ? "Đang dùng" : "Ngừng dùng"}</Badge>
              <span className="text-sm text-muted">{row.capabilities.length} quyền</span>
            </div>
            {row.description ? <p className="text-sm text-ink">{row.description}</p> : null}
            <div>
              <p className="text-sm font-medium text-ink">Người dùng</p>
              <p className="mt-1 text-sm text-muted">{row.userNames.join(", ") || "Chưa gán ai."}</p>
            </div>
            {permissionGroups.map((group) => {
              const items = group.items.filter((item) => row.capabilities.includes(item.id));
              if (items.length === 0) return null;
              return (
                <section key={group.id}>
                  <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
                  <ul className="mt-1 space-y-1 text-sm text-muted">
                    {items.map((item) => <li key={item.id}>{permissionLabel(item.id)}</li>)}
                  </ul>
                </section>
              );
            })}
          </>
        ) : null}
      </div>
      {actionError ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{actionError}</p> : null}
      <SheetFooter className="flex justify-end gap-2 bg-white">
        {row ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void toggle()}>
            {row.active ? "Ngừng dùng" : "Dùng lại"}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
        {row ? <Button type="button" onClick={onEdit}>Sửa</Button> : null}
      </SheetFooter>
    </div>
  );
}
