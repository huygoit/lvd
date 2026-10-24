"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { initials } from "@/shared/auth/users";

type Choice = { id: string; name: string; active: boolean };
type Mode = "them" | "sua" | "xem";

export type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  active: boolean;
  departmentId: string;
  departmentName: string;
  positionId: string;
  positionName: string;
  accountName: string;
};

const blank: EmployeeRow = {
  id: "",
  name: "",
  phone: "",
  email: "",
  note: "",
  active: true,
  departmentId: "",
  departmentName: "",
  positionId: "",
  positionName: "",
  accountName: "",
};

function choicesFor(rows: Choice[], selected: string) {
  return rows.filter((row) => row.active || row.id === selected);
}

export function EmployeeBoard({
  rows,
  countLabel,
  q,
  departmentId,
  positionId,
  status,
  departments,
  positions,
  initialMode,
  initialId,
}: {
  rows: EmployeeRow[];
  countLabel: string;
  q: string;
  departmentId: string;
  positionId: string;
  status: string;
  departments: Choice[];
  positions: Choice[];
  initialMode: Mode | null;
  initialId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [targetId, setTargetId] = useState(initialId);
  const [detail, setDetail] = useState<EmployeeRow | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tick, setTick] = useState(0);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if ((mode !== "sua" && mode !== "xem") || !targetId) return;
    const control = new AbortController();
    setDetail(null);
    setLoadError("");
    callApi<EmployeeRow>(`/api/nhan-vien/${targetId}`, { signal: control.signal })
      .then((row) => {
        if (!control.signal.aborted) setDetail(row);
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Không tải được hồ sơ.");
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
    router.replace(query ? `/nhan-vien?${query}` : "/nhan-vien", { scroll: false });
  }

  function saved() {
    router.refresh();
    openMode(null);
  }

  const current = mode === "them" ? blank : detail;
  const sheetTitle = mode === "them" ? "Thêm nhân viên" : mode === "sua" ? "Sửa nhân viên" : current?.name || "Hồ sơ nhân viên";
  const sheetText = mode === "xem" && current?.accountName
    ? `Tài khoản đăng nhập ${current.accountName}. Quyền không đổi ở màn này.`
    : mode === "xem"
      ? "Hồ sơ người trong công ty."
      : "Điền họ tên. Phòng ban và chức vụ chọn trong danh mục đang dùng.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Nhân viên</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{countLabel}. Bấm tên để xem hồ sơ. Phòng ban và chức vụ gắn ngay trong sheet.</p>
        </div>
        <button type="button" className={buttonPrimary} onClick={() => openMode("them")}>Thêm nhân viên</button>
      </div>
      <form className="flex flex-wrap gap-2" action="/nhan-vien">
        <input name="q" defaultValue={q} placeholder="Tên, điện thoại, email" className={`${inputClass} max-w-sm`} />
        <select name="phong" defaultValue={departmentId} className={`${selectClass} max-w-[200px]`}>
          <option value="">Tất cả phòng ban</option>
          {departments.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="chuc-vu" defaultValue={positionId} className={`${selectClass} max-w-[200px]`}>
          <option value="">Tất cả chức vụ</option>
          {positions.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="trang-thai" defaultValue={status} className={`${selectClass} max-w-[180px]`}>
          <option value="dang_lam">Đang làm</option>
          <option value="ngung">Ngừng làm</option>
        </select>
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Nhân viên</TableHead>
              <TableHead>Phòng ban</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Điện thoại</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted">
                  Chưa có nhân viên khớp bộ lọc. Thêm người mới hoặc đổi bộ lọc.
                </TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-normal">
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => openMode("xem", row.id)}>
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(row.name)}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">{row.name}</span>
                      <span className="block text-xs text-muted">{row.email || "Chưa có email"}</span>
                    </span>
                  </button>
                </TableCell>
                <TableCell className="text-muted">{row.departmentName || "—"}</TableCell>
                <TableCell className="text-muted">{row.positionName || "—"}</TableCell>
                <TableCell className="text-muted">{row.phone || "—"}</TableCell>
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
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetText}</SheetDescription>
          </SheetHeader>
          {mode === "them" ? (
            <EmployeeForm
              key={`them-${formKey}`}
              initial={blank}
              departments={departments}
              positions={positions}
              onClose={() => openMode(null)}
              onSaved={saved}
            />
          ) : null}
          {mode === "sua" && !(detail && detail.id === targetId) ? (
            <SheetWait error={loadError} onClose={() => openMode(null)} />
          ) : null}
          {mode === "sua" && detail && detail.id === targetId ? (
            <EmployeeForm
              key={detail.id}
              initial={detail}
              departments={departments}
              positions={positions}
              onClose={() => openMode(null)}
              onSaved={saved}
            />
          ) : null}
          {mode === "xem" ? (
            <EmployeeView
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
      <p className="text-xs text-muted">
        Danh mục phòng và chức vụ nằm ở <Link className="font-medium text-primary" href="/cai-dat/phong-ban">Phòng ban</Link>
        {" và "}
        <Link className="font-medium text-primary" href="/cai-dat/chuc-vu">Chức vụ</Link>.
      </p>
    </div>
  );
}

function SheetWait({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 px-5 py-4">
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : <p className="text-sm text-muted">Đang tải hồ sơ...</p>}
      </div>
      <SheetFooter className="flex justify-end bg-white">
        <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
      </SheetFooter>
    </div>
  );
}

function EmployeeForm({
  initial,
  departments,
  positions,
  onClose,
  onSaved,
}: {
  initial: EmployeeRow;
  departments: Choice[];
  positions: Choice[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(formDataOf(event).entries());
    setBusy(true);
    setError("");
    try {
      await callApi(initial.id ? `/api/nhan-vien/${initial.id}` : "/api/nhan-vien", {
        method: initial.id ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Field label="Họ tên">
          <input name="name" required defaultValue={initial.name} className={inputClass} placeholder="Nguyễn Văn A" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Điện thoại">
            <input
              name="phone"
              defaultValue={initial.phone}
              className={inputClass}
              inputMode="numeric"
              maxLength={12}
              placeholder="Chỉ nhập số"
              onInput={(event) => {
                const input = event.currentTarget;
                input.value = input.value.replace(/\D/g, "").slice(0, 12);
              }}
            />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={initial.email} className={inputClass} placeholder="ten@congty.vn" />
          </Field>
          <Field label="Phòng ban">
            <select name="departmentId" defaultValue={initial.departmentId} className={selectClass}>
              <option value="">Chưa xếp</option>
              {choicesFor(departments, initial.departmentId).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Chức vụ">
            <select name="positionId" defaultValue={initial.positionId} className={selectClass}>
              <option value="">Chưa xếp</option>
              {choicesFor(positions, initial.positionId).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Ghi chú">
          <textarea name="note" defaultValue={initial.note} rows={3} className={cn(inputClass, "h-20 resize-none py-2")} placeholder="Ca làm, tổ, ghi chú nội bộ" />
        </Field>
      </div>
      {error ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{error}</p> : null}
      <SheetFooter className="flex justify-end gap-2 bg-white">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Đóng</Button>
        <Button type="submit" disabled={busy}>{busy ? "Đang lưu" : "Lưu"}</Button>
      </SheetFooter>
    </form>
  );
}

function EmployeeView({
  row,
  error,
  onClose,
  onEdit,
  onToggled,
}: {
  row: EmployeeRow | null;
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
      await callApi(`/api/nhan-vien/${row.id}`, {
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        {!row && !error ? <p className="text-sm text-muted">Đang tải hồ sơ...</p> : null}
        {row ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(row.name)}
              </span>
              <div>
                <p className="text-lg font-semibold text-ink">{row.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant={row.active ? "secondary" : "outline"}>{row.active ? "Đang làm" : "Ngừng làm"}</Badge>
                  {row.departmentName ? <Badge variant="outline">{row.departmentName}</Badge> : null}
                  {row.positionName ? <Badge variant="outline">{row.positionName}</Badge> : null}
                </div>
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Điện thoại</dt>
                <dd className="font-medium text-ink">{row.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-ink">{row.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Phòng ban</dt>
                <dd className="font-medium text-ink">{row.departmentName || "Chưa xếp"}</dd>
              </div>
              <div>
                <dt className="text-muted">Chức vụ</dt>
                <dd className="font-medium text-ink">{row.positionName || "Chưa xếp"}</dd>
              </div>
              {row.note ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Ghi chú</dt>
                  <dd className="font-medium text-ink">{row.note}</dd>
                </div>
              ) : null}
              {row.accountName ? (
                <div className="sm:col-span-2 rounded-xl bg-soft px-3 py-2 text-muted">
                  Người này đăng nhập bằng tài khoản {row.accountName}. Đổi vai trò ở mục Người dùng.
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>
      {actionError ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{actionError}</p> : null}
      <SheetFooter className="flex justify-end gap-2 bg-white">
        {row ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void toggle()}>
            {row.active ? "Ngừng làm việc" : "Cho làm lại"}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
        {row ? <Button type="button" onClick={onEdit}>Sửa</Button> : null}
      </SheetFooter>
    </div>
  );
}
