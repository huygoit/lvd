"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import type { KhoanChung } from "@/modules/projects/shared-costs";

const oNhap = "h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-primary";

export function ProjectSharedCosts({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<KhoanChung[] | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [xoa, setXoa] = useState<KhoanChung | null>(null);
  const [sua, setSua] = useState<KhoanChung | null>(null);

  useEffect(() => {
    let huy = false;
    setRows(null);
    callApi<KhoanChung[]>(`/api/cong-trinh/${projectId}/chi-phi-chung`)
      .then((data) => { if (!huy) setRows(data); })
      .catch((caught: unknown) => { if (!huy) setError(caught instanceof Error ? caught.message : "Không tải được chi phí chung."); });
    return () => { huy = true; };
  }, [projectId]);

  async function them() {
    setBusy(true);
    setError("");
    try {
      const row = await callApi<KhoanChung>(`/api/cong-trinh/${projectId}/chi-phi-chung`, {
        method: "POST",
        body: JSON.stringify({ name, rate }),
      });
      setRows((current) => [...(current ?? []), row].sort((a, b) => a.name.localeCompare(b.name, "vi")));
      setName("");
      setRate("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  async function luuSua() {
    if (!sua) return;
    setBusy(true);
    setError("");
    try {
      const row = await callApi<KhoanChung>(`/api/cong-trinh/${projectId}/chi-phi-chung/${sua.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: sua.name, rate: sua.tyLe }),
      });
      setRows((current) => (current ?? []).map((item) => item.id === row.id ? row : item).sort((a, b) => a.name.localeCompare(b.name, "vi")));
      setSua(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  async function xoaKhoan() {
    if (!xoa) return;
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/cong-trinh/${projectId}/chi-phi-chung/${xoa.id}`, { method: "DELETE" });
      setRows((current) => (current ?? []).filter((item) => item.id !== xoa.id));
      setXoa(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được.");
      setXoa(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[18px] border border-line bg-white px-5 py-4">
      <h3 className="text-sm font-semibold text-ink">Chi phí chung</h3>
      <p className="mt-1 text-sm text-muted">Tỷ lệ trên doanh thu trước thuế của hạng mục công trình này. Cộng vào tổng chi phí cùng đơn hàng đã lưu và các dòng bên dưới.</p>
      {error ? <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-3 space-y-2">
        {rows === null ? <p className="text-sm text-muted">Đang tải...</p> : null}
        {rows && rows.length === 0 ? <p className="text-sm text-muted">Chưa có khoản nào.</p> : null}
        {rows?.map((row) => (
          <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-soft px-3 py-2">
            {sua?.id === row.id ? (
              <>
                <input value={sua.name} onChange={(event) => setSua({ ...sua, name: event.target.value })} className={`${oNhap} max-w-xs`} />
                <input value={sua.tyLe} onChange={(event) => setSua({ ...sua, tyLe: event.target.value })} inputMode="decimal" className={`${oNhap} w-24`} />
                <span className="text-sm text-muted">%</span>
                <Button type="button" size="sm" disabled={busy} onClick={() => void luuSua()}>Lưu</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSua(null)}>Đóng</Button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-sm font-medium text-ink">{row.name}</p>
                <p className="text-sm font-semibold tabular-nums text-primary">{row.tyLe}%</p>
                {canEdit ? <Button type="button" size="sm" variant="ghost" onClick={() => { setError(""); setSua(row); }}>Sửa</Button> : null}
                {canEdit ? <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => setXoa(row)}>Xóa</Button> : null}
              </>
            )}
          </div>
        ))}
      </div>
      {canEdit ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => { event.preventDefault(); void them(); }}
        >
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên chi phí" className={`${oNhap} max-w-xs`} />
          <input value={rate} onChange={(event) => setRate(event.target.value)} inputMode="decimal" placeholder="2,5" className={`${oNhap} w-24`} />
          <span className="text-sm text-muted">%</span>
          <Button type="submit" size="sm" disabled={busy}>{busy ? "Đang lưu" : "Thêm"}</Button>
        </form>
      ) : null}
      <AlertDialog open={xoa !== null} onOpenChange={(open) => { if (!open) setXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí chung</AlertDialogTitle>
            <AlertDialogDescription>Khoản {xoa?.name} sẽ không còn tính trên công trình này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setXoa(null)}>Hủy</Button>
            <Button type="button" disabled={busy} onClick={() => void xoaKhoan()}>Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
