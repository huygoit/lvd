"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { ActionBadge } from "@/shared/components/action-badge";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import type { KhoanChung } from "@/modules/projects/shared-costs";
import { cn } from "@/shared/lib/cn";
import { formatVnd } from "@/shared/lib/money";

// Ô nhập / tiêu đề — cùng cảm giác bảng Phụ thu trên đơn đặt hàng.
const oNhap = "box-border h-9 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white";
const tieuDe = "h-10 px-2 text-left align-middle text-sm font-medium";
const tieuDeSo = "h-10 px-2 text-right align-middle text-sm font-medium tabular-nums";
const o = "p-0 align-middle";

type Dong = {
  key: string;
  id: string;
  name: string;
  tyLe: string;
  editing: boolean;
  saving: boolean;
  error: string;
};

function tuDong(row: KhoanChung): Dong {
  return { key: row.id, id: row.id, name: row.name, tyLe: row.tyLe, editing: false, saving: false, error: "" };
}

function soTien(truocThue: number | null, tyLe: string) {
  if (truocThue === null) return null;
  const raw = tyLe.trim().replace("%", "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) return null;
  const so = Number(raw);
  if (!Number.isFinite(so) || so <= 0 || so > 100) return null;
  return Math.round((truocThue * Math.round(so * 100)) / 10000);
}

function dongMoi(): Dong {
  return { key: `moi-${Date.now()}`, id: "", name: "", tyLe: "", editing: true, saving: false, error: "" };
}

export function ProjectSharedCosts({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<Dong[] | null>(null);
  const [truocThue, setTruocThue] = useState<number | null>(null);
  const [loiTai, setLoiTai] = useState("");
  const [xoa, setXoa] = useState<Dong | null>(null);
  const [dangXoa, setDangXoa] = useState(false);

  useEffect(() => {
    let huy = false;
    setRows(null);
    callApi<{ truocThue: number | null; rows: KhoanChung[] }>(`/api/cong-trinh/${projectId}/chi-phi-chung`)
      .then((data) => { if (!huy) { setTruocThue(data.truocThue); setRows(data.rows.map(tuDong)); } })
      .catch((caught: unknown) => { if (!huy) setLoiTai(caught instanceof Error ? caught.message : "Không tải được chi phí chung."); });
    return () => { huy = true; };
  }, [projectId]);

  function sua(key: string, partial: Partial<Dong>) {
    setRows((current) => current?.map((dong) => dong.key === key ? { ...dong, ...partial, error: "" } : dong) ?? current);
  }

  function them() {
    setLoiTai("");
    setRows((current) => [dongMoi(), ...(current ?? [])]);
  }

  async function luu(dong: Dong) {
    sua(dong.key, { saving: true });
    try {
      const saved = dong.id
        ? await callApi<KhoanChung>(`/api/cong-trinh/${projectId}/chi-phi-chung/${dong.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: dong.name, rate: dong.tyLe }),
        })
        : await callApi<KhoanChung>(`/api/cong-trinh/${projectId}/chi-phi-chung`, {
          method: "POST",
          body: JSON.stringify({ name: dong.name, rate: dong.tyLe }),
        });
      setRows((current) => {
        const conLai = (current ?? []).filter((item) => item.key !== dong.key);
        const nhap = conLai.filter((item) => !item.id);
        const daLuu = [...conLai.filter((item) => item.id), tuDong(saved)].sort((a, b) => a.name.localeCompare(b.name, "vi"));
        return [...nhap, ...daLuu];
      });
    } catch (caught) {
      const thongBao = caught instanceof Error ? caught.message : "Không lưu được.";
      setRows((current) => current?.map((item) => item.key === dong.key ? { ...item, saving: false, error: thongBao } : item) ?? current);
    }
  }

  async function xoaDong() {
    if (!xoa) return;
    if (!xoa.id) {
      setRows((current) => current?.filter((item) => item.key !== xoa.key) ?? current);
      setXoa(null);
      return;
    }
    setDangXoa(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/chi-phi-chung/${xoa.id}`, { method: "DELETE" });
      setRows((current) => current?.filter((item) => item.key !== xoa.key) ?? current);
      setXoa(null);
    } catch (caught) {
      setLoiTai(caught instanceof Error ? caught.message : "Không xóa được.");
      setXoa(null);
    } finally {
      setDangXoa(false);
    }
  }

  const soCot = canEdit ? 4 : 3;

  return (
    <>
      {/* Khung giống khối Phụ thu trên đơn đặt hàng. */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-soft px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-ink">Chi phí chung</p>
            <p className="text-xs text-muted">Số tiền = tổng doanh thu trước thuế × %</p>
          </div>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={them}>
              <Plus className="size-4" aria-hidden />
              Thêm chi phí chung
            </Button>
          ) : null}
        </div>
        {loiTai ? <p className="mx-3 mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loiTai}</p> : null}
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line bg-soft text-muted">
              <th className={tieuDe}>Tên chi phí</th>
              <th className={cn(tieuDeSo, "w-28")}>%</th>
              <th className={cn(tieuDeSo, "w-40")}>Số tiền</th>
              {canEdit ? <th className={cn(tieuDe, "w-36")}>Thao tác</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={soCot} className="px-3 py-8 text-center text-sm text-muted">Đang tải...</td>
              </tr>
            ) : null}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={soCot} className="px-3 py-6 text-center text-sm text-muted">Chưa có chi phí chung. Bấm «Thêm chi phí chung».</td>
              </tr>
            ) : null}
            {rows?.map((dong) => (
              <tr key={dong.key} className={cn("border-b border-line last:border-0", dong.error && "bg-danger/5")}>
                <td className={o}>
                  {dong.editing ? (
                    <input value={dong.name} placeholder="Tên chi phí" onChange={(event) => sua(dong.key, { name: event.target.value })} className={oNhap} />
                  ) : <span className="flex h-9 items-center px-2 font-medium text-ink">{dong.name}</span>}
                </td>
                <td className={o}>
                  {dong.editing ? (
                    <input
                      value={dong.tyLe}
                      inputMode="decimal"
                      placeholder="2,5"
                      onChange={(event) => sua(dong.key, { tyLe: event.target.value })}
                      className={cn(oNhap, "text-right tabular-nums")}
                    />
                  ) : <span className="flex h-9 items-center justify-end px-2 font-semibold tabular-nums">{dong.tyLe}%</span>}
                </td>
                <td className={o}>
                  <span className="flex h-9 items-center justify-end px-2 font-semibold tabular-nums text-ink">
                    {soTien(truocThue, dong.tyLe) === null ? "—" : formatVnd(soTien(truocThue, dong.tyLe) ?? 0)}
                  </span>
                </td>
                {canEdit ? (
                  <td className={o}>
                    <div className="flex h-9 flex-nowrap items-center gap-1.5 px-2">
                      {dong.editing ? (
                        <ActionBadge tone="primary" className="shrink-0" disabled={dong.saving} onClick={() => void luu(dong)}>
                          <Save className="size-3.5" aria-hidden />
                          {dong.saving ? "Đang lưu" : "Lưu"}
                        </ActionBadge>
                      ) : (
                        <ActionBadge className="shrink-0" onClick={() => sua(dong.key, { editing: true })}>
                          <Pencil className="size-3.5" aria-hidden /> Sửa
                        </ActionBadge>
                      )}
                      <button
                        type="button"
                        disabled={dong.saving}
                        onClick={() => setXoa(dong)}
                        className="flex h-8 items-center gap-1 px-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"
                      >
                        <Trash2 className="size-3.5" aria-hidden /> Xóa
                      </button>
                    </div>
                    {dong.error ? <p className="px-2 pb-1 text-xs text-danger">{dong.error}</p> : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={xoa !== null} onOpenChange={(open) => { if (!open && !dangXoa) setXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí chung</AlertDialogTitle>
            <AlertDialogDescription>{xoa?.name || "Dòng mới"} sẽ không còn tính trên công trình này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={dangXoa} onClick={() => setXoa(null)}><X className="size-4" aria-hidden /> Đóng</Button>
            <Button type="button" variant="destructive" disabled={dangXoa} onClick={() => void xoaDong()}><Trash2 className="size-4" aria-hidden /> {dangXoa ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
