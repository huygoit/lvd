"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { initials } from "@/shared/auth/users";

type RoleChoice = { id: string; name: string; active: boolean };
type StaffChoice = { id: string; name: string };

export type AccountRow = {
  id: string;
  username: string;
  name: string;
  active: boolean;
  roleIds: string[];
  roleNames: string[];
  permissionCount: number;
};

const empty: AccountRow = {
  id: "",
  username: "",
  name: "",
  active: true,
  roleIds: [],
  roleNames: [],
  permissionCount: 0,
};

export function UserBoard({
  rows,
  roles,
  staff,
  actorId,
}: {
  rows: AccountRow[];
  roles: RoleChoice[];
  staff: StaffChoice[];
  actorId: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<AccountRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [staffId, setStaffId] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setCreating(true);
    setCurrent(empty);
    setName("");
    setUsername("");
    setPassword("");
    setAgain("");
    setStaffId("");
    setPicked([]);
    setShow(false);
    setError("");
  }

  function openEdit(row: AccountRow) {
    setCreating(false);
    setCurrent(row);
    setName(row.name);
    setUsername(row.username);
    setPassword("");
    setAgain("");
    setStaffId("");
    setPicked(row.roleIds);
    setShow(false);
    setError("");
  }

  function close() {
    setCurrent(null);
    setCreating(false);
    setError("");
  }

  function toggle(id: string) {
    setPicked((currentIds) => currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]);
  }

  async function save() {
    if (!current) return;
    if (password !== again) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (creating) {
        await callApi("/api/nguoi-dung", {
          method: "POST",
          body: JSON.stringify({ name, username, password, roleIds: picked, staffId }),
        });
      } else {
        await callApi(`/api/nguoi-dung/${current.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name,
            username,
            roleIds: picked,
            ...(password ? { password } : {}),
          }),
        });
      }
      setBusy(false);
      close();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!current || creating) return;
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/nguoi-dung/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !current.active }),
      });
      setBusy(false);
      close();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không cập nhật được.");
      setBusy(false);
    }
  }

  const title = creating ? "Thêm người dùng" : current?.name || "Người dùng";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Người dùng</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">Tạo tài khoản và mật khẩu, rồi gán vai trò. Quyền đang dùng là hợp của các vai trò còn hiệu lực.</p>
        </div>
        <button type="button" className={buttonPrimary} onClick={openCreate}>Thêm người dùng</button>
      </div>
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Tài khoản</TableHead>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => openEdit(row)}>
                    <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(row.name)}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">{row.name}</span>
                      <span className="block text-xs text-muted">{row.active ? `${row.permissionCount} quyền` : "Ngừng đăng nhập"}</span>
                    </span>
                  </button>
                </TableCell>
                <TableCell className="text-muted">{row.username}</TableCell>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-wrap gap-1">
                    {row.roleNames.length === 0 ? <span className="text-muted">Chưa gán</span> : row.roleNames.map((roleName) => (
                      <Badge key={roleName} variant="outline">{roleName}</Badge>
                    ))}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>Sửa</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Sheet open={current !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {creating
                ? "Người mới được tạo thêm một hồ sơ nhân viên, trừ khi gắn vào nhân viên đã có."
                : "Để trống mật khẩu nếu không đổi. Vai trò ngừng dùng không cấp quyền."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="Họ tên">
                <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Nguyễn Văn A" />
              </Field>
              <Field label="Tên đăng nhập" hint="Chữ không dấu, số, dấu chấm hoặc gạch.">
                <input value={username} onChange={(event) => setUsername(event.target.value)} className={inputClass} autoCapitalize="none" spellCheck={false} placeholder="van.a" />
              </Field>
              <Field label={creating ? "Mật khẩu" : "Mật khẩu mới"} hint={creating ? "Ít nhất 8 ký tự." : "Để trống nếu giữ mật khẩu hiện tại."}>
                <span className="relative block">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${inputClass} pr-11`}
                    autoComplete="new-password"
                  />
                  <button type="button" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted" onClick={() => setShow((value) => !value)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </span>
              </Field>
              <Field label="Nhập lại mật khẩu">
                <input type={show ? "text" : "password"} value={again} onChange={(event) => setAgain(event.target.value)} className={inputClass} autoComplete="new-password" />
              </Field>
              {creating ? (
                <Field label="Gắn nhân viên">
                  <select value={staffId} onChange={(event) => setStaffId(event.target.value)} className={selectClass}>
                    <option value="">Tạo hồ sơ nhân viên mới</option>
                    {staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                  </select>
                </Field>
              ) : null}
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Vai trò</p>
                {roles.map((role) => {
                  const checked = picked.includes(role.id);
                  const locked = !role.active && !checked;
                  return (
                    <label key={role.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(role.id)} />
                        <span className="text-ink">{role.name}</span>
                      </span>
                      {role.active ? null : <Badge variant="outline">Ngừng dùng</Badge>}
                    </label>
                  );
                })}
              </div>
            </div>
            {error ? <p className="px-5 pb-2 text-sm text-danger" role="alert">{error}</p> : null}
            <SheetFooter className="flex justify-end gap-2 bg-white">
              {!creating && current && current.id !== actorId ? (
                <Button type="button" variant="outline" disabled={busy} onClick={() => void toggleActive()}>
                  {current.active ? "Ngừng đăng nhập" : "Cho đăng nhập"}
                </Button>
              ) : null}
              <Button type="button" variant="outline" disabled={busy} onClick={close}>Đóng</Button>
              <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu" : "Lưu"}</Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
