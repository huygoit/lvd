"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/shared/client/api";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import type { KhoanChung } from "@/modules/projects/shared-costs";
import { formatVnd } from "@/shared/lib/money";

const oNhap = "h-9 w-full bg-transparent px-0 text-sm text-ink outline-none";

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

function soTien(sauThue: number | null, tyLe: string) {
  if (sauThue === null) return null;
  const raw = tyLe.trim().replace("%", "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) return null;
  const so = Number(raw);
  if (!Number.isFinite(so) || so <= 0 || so > 100) return null;
  return Math.round((sauThue * Math.round(so * 100)) / 10000);
}

function dongMoi(): Dong {
  return { key: `moi-${Date.now()}`, id: "", name: "", tyLe: "", editing: true, saving: false, error: "" };
}

export function ProjectSharedCosts({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<Dong[] | null>(null);
  const [sauThue, setSauThue] = useState<number | null>(null);
  const [loiTai, setLoiTai] = useState("");
  const [xoa, setXoa] = useState<Dong | null>(null);
  const [dangXoa, setDangXoa] = useState(false);

  useEffect(() => {
    let huy = false;
    setRows(null);
    callApi<{ sauThue: number | null; rows: KhoanChung[] }>(`/api/cong-trinh/${projectId}/chi-phi-chung`)
      .then((data) => { if (!huy) { setSauThue(data.sauThue); setRows(data.rows.map(tuDong)); } })
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Số tiền = tổng doanh thu sau thuế của công trình × %.</p>
        {canEdit ? <Button type="button" size="sm" variant="outline" onClick={them}>Thêm</Button> : null}
      </div>
      {loiTai ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loiTai}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Tên chi phí</TableHead>
              <TableHead className="w-28 text-right">%</TableHead>
              <TableHead className="w-40 text-right">Số tiền</TableHead>
              {canEdit ? <TableHead className="w-36">Thao tác</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} className="py-8 text-center text-sm text-muted">Chưa có chi phí chung.</TableCell>
              </TableRow>
            ) : null}
            {rows === null ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} className="py-8 text-center text-sm text-muted">Đang tải...</TableCell>
              </TableRow>
            ) : null}
            {rows?.map((dong) => (
              <TableRow key={dong.key} className={dong.error ? "bg-danger/5" : undefined}>
                <TableCell>
                  {dong.editing ? (
                    <input value={dong.name} placeholder="Tên chi phí" onChange={(event) => sua(dong.key, { name: event.target.value })} className={oNhap} />
                  ) : <span className="font-medium text-ink">{dong.name}</span>}
                </TableCell>
                <TableCell className="text-right">
                  {dong.editing ? (
                    <input
                      value={dong.tyLe}
                      inputMode="decimal"
                      placeholder="2,5"
                      onChange={(event) => sua(dong.key, { tyLe: event.target.value })}
                      className={`${oNhap} text-right tabular-nums`}
                    />
                  ) : <span className="font-semibold tabular-nums">{dong.tyLe}%</span>}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-ink">
                  {soTien(sauThue, dong.tyLe) === null ? "—" : formatVnd(soTien(sauThue, dong.tyLe) ?? 0)}
                </TableCell>
                {canEdit ? (
                  <TableCell>
                    <div className="flex flex-nowrap items-center gap-1">
                      {dong.editing ? (
                        <Button type="button" size="sm" className="shrink-0" disabled={dong.saving} onClick={() => void luu(dong)}>{dong.saving ? "Đang lưu" : "Lưu"}</Button>
                      ) : (
                        <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => sua(dong.key, { editing: true })}>Sửa</Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="shrink-0 text-danger" disabled={dong.saving} onClick={() => setXoa(dong)}>Xóa</Button>
                    </div>
                    {dong.error ? <p className="mt-1 text-xs text-danger">{dong.error}</p> : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={xoa !== null} onOpenChange={(open) => { if (!open && !dangXoa) setXoa(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa chi phí chung</AlertDialogTitle>
            <AlertDialogDescription>{xoa?.name || "Dòng mới"} sẽ không còn tính trên công trình này.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={dangXoa} onClick={() => setXoa(null)}>Đóng</Button>
            <Button type="button" variant="destructive" disabled={dangXoa} onClick={() => void xoaDong()}>{dangXoa ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
