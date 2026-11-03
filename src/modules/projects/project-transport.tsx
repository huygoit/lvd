"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Save, Trash2, Truck, Wallet, X } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { ActionBadge, listPanelClass } from "@/shared/components/action-badge";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { todayYmd } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/cn";
import { digitsVnd, formatCount, formatVnd } from "@/shared/lib/money";
import { donViMacDinh, transportPricingLabel, transportStatusLabel, transportUnits, type TransportPricing } from "@/modules/transport/fields";
import { contractStatusList, contractStatusMoTa, hopDongChoThanhToan, hopDongDangKhoa } from "@/shared/catalog/contract-status";

type Carrier = { id: string; code: string; name: string };
type Staff = { id: string; name: string };

type Line = {
  key: string;
  name: string;
  routeText: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  note: string;
};

type Advance = {
  id: string;
  occurredOn: string;
  amount: number;
  payerId: string;
  note: string;
};

type Contract = {
  id: string;
  code: string;
  partnerId: string;
  partnerName: string;
  name: string;
  pricingKind: string;
  status: string;
  signedOn: string;
  unitPrice: number | null;
  note: string;
  tongHopDong: number;
  tongDaThanhToan: number;
  conLai: number;
  lines: {
    name: string;
    routeText: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    note: string;
  }[];
  advances: Advance[];
};

// Ô nhập cùng cảm giác với chi tiết đơn đặt hàng / gia công.
const o = "h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";
const cell = "box-border h-9 w-full rounded-md border border-transparent bg-transparent px-2 py-0 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white";
const num = cn(cell, "text-right tabular-nums");
const tieuDe = "h-10 px-2 text-left align-middle text-sm font-medium";
const tieuDeSo = "h-10 px-2 text-right align-middle text-sm font-medium tabular-nums";

function thanhTien(qty: string, price: string) {
  const q = Number(String(qty).replace(",", "."));
  const don = Number(String(price).replace(/\D/g, ""));
  if (!Number.isFinite(q) || q <= 0 || !don) return 0;
  return Math.round(q * don);
}

function dongTrong(rate: string, unit: string): Line {
  return { key: crypto.randomUUID(), name: "", routeText: "", unit, quantity: "", unitPrice: rate, note: "" };
}

function ngayHien(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

export function ProjectTransport({
  projectId,
  staff,
  canEdit,
  defaultPayerId,
}: {
  projectId: string;
  staff: Staff[];
  canEdit: boolean;
  defaultPayerId: string;
}) {
  const [rows, setRows] = useState<Contract[] | null>(null);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [mo, setMo] = useState(false);
  const [suaId, setSuaId] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [xoaId, setXoaId] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");
  const [pricingKind, setPricingKind] = useState<TransportPricing>("theo_chuyen");
  const [signedOn, setSignedOn] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("dang_thuc_hien");
  const [lines, setLines] = useState<Line[]>([dongTrong("", "chuyến")]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [moThemThanhToan, setMoThemThanhToan] = useState(false);
  const [ttNgay, setTtNgay] = useState(() => todayYmd(new Date()));
  const [ttTien, setTtTien] = useState("");
  const [ttNguoi, setTtNguoi] = useState(defaultPayerId);
  const [ttGhi, setTtGhi] = useState("");

  function tai() {
    callApi<{ rows: Contract[]; carriers: Carrier[] }>(`/api/cong-trinh/${projectId}/van-chuyen`)
      .then((data) => {
        setRows(data.rows);
        setCarriers(data.carriers);
      })
      .catch((caught: unknown) => setLoi(caught instanceof Error ? caught.message : "Không tải được hợp đồng vận chuyển."));
  }

  useEffect(() => {
    setRows(null);
    setLoi("");
    tai();
  }, [projectId]);

  function moThem() {
    setSuaId("");
    setPartnerId(carriers[0]?.id ?? "");
    setName("");
    setPricingKind("theo_chuyen");
    setSignedOn("");
    setUnitPrice("");
    setNote("");
    setStatus("dang_thuc_hien");
    setLines([dongTrong("", "chuyến")]);
    setAdvances([]);
    setMoThemThanhToan(false);
    setTtTien("");
    setTtGhi("");
    setBao("");
    setLoi("");
    setMo(true);
  }

  function moSua(row: Contract) {
    setSuaId(row.id);
    setPartnerId(row.partnerId);
    setName(row.name);
    setPricingKind((row.pricingKind in transportPricingLabel ? row.pricingKind : "theo_chuyen") as TransportPricing);
    setSignedOn(row.signedOn);
    setUnitPrice(row.unitPrice ? String(row.unitPrice) : "");
    setNote(row.note);
    setStatus(row.status);
    setLines(row.lines.length
      ? row.lines.map((dong) => ({
          key: crypto.randomUUID(),
          name: dong.name,
          routeText: dong.routeText,
          unit: dong.unit,
          quantity: String(dong.quantity),
          unitPrice: String(dong.unitPrice),
          note: dong.note,
        }))
      : [dongTrong(row.unitPrice ? String(row.unitPrice) : "", donViMacDinh((row.pricingKind in transportPricingLabel ? row.pricingKind : "theo_chuyen") as TransportPricing))]);
    setAdvances(row.advances);
    setMoThemThanhToan(false);
    setTtTien("");
    setTtGhi("");
    setBao("");
    setLoi("");
    setMo(true);
  }

  async function luu() {
    setDangLuu(true);
    setLoi("");
    setBao("");
    try {
      const body = {
        partnerId,
        name,
        pricingKind,
        signedOn,
        unitPrice,
        note,
        status,
        lines: lines.map((dong) => ({
          name: dong.name,
          routeText: dong.routeText,
          unit: dong.unit,
          quantity: dong.quantity,
          unitPrice: dong.unitPrice,
          note: dong.note,
        })),
      };
      const saved = suaId
        ? await callApi<Contract>(`/api/cong-trinh/${projectId}/van-chuyen/${suaId}`, { method: "PATCH", body: JSON.stringify(body) })
        : await callApi<Contract>(`/api/cong-trinh/${projectId}/van-chuyen`, { method: "POST", body: JSON.stringify(body) });
      setRows((current) => {
        const list = current ?? [];
        if (suaId) return list.map((item) => item.id === saved.id ? saved : item);
        return [saved, ...list];
      });
      setSuaId(saved.id);
      setAdvances(saved.advances);
      setBao("Đã lưu hợp đồng vận chuyển.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setDangLuu(false);
    }
  }

  async function xoaHop() {
    if (!xoaId) return;
    setDangLuu(true);
    try {
      await callApi(`/api/cong-trinh/${projectId}/van-chuyen/${xoaId}`, { method: "DELETE" });
      setRows((current) => current?.filter((item) => item.id !== xoaId) ?? current);
      setXoaId(null);
      if (suaId === xoaId) setMo(false);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được.");
      setXoaId(null);
    } finally {
      setDangLuu(false);
    }
  }

  async function themThanhToan() {
    if (!suaId) {
      setLoi("Lưu hợp đồng trước khi ghi thanh toán.");
      return;
    }
    setDangLuu(true);
    setLoi("");
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/van-chuyen/${suaId}/tam-ung`, {
        method: "POST",
        body: JSON.stringify({ occurredOn: ttNgay, amount: digitsVnd(ttTien), payerId: ttNguoi, note: ttGhi }),
      });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
      setTtTien("");
      setTtGhi("");
      setMoThemThanhToan(false);
      setBao("Đã ghi thanh toán.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không ghi được thanh toán.");
    } finally {
      setDangLuu(false);
    }
  }

  async function xoaThanhToan(id: string) {
    if (!suaId) return;
    setDangLuu(true);
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/van-chuyen/${suaId}/tam-ung/${id}`, { method: "DELETE" });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được thanh toán.");
    } finally {
      setDangLuu(false);
    }
  }

  const tongDong = lines.reduce((tong, dong) => tong + thanhTien(dong.quantity, dong.unitPrice), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Hợp đồng thuê vận chuyển theo công trình. Chi phí lấy tổng thành tiền đã lưu. Lịch sử thanh toán theo dõi tiền đã đưa nhà xe.
        </p>
        {canEdit ? (
          <Button type="button" onClick={moThem}>
            <Plus className="size-4" aria-hidden /> Thêm hợp đồng
          </Button>
        ) : null}
      </div>
      {loi && !mo ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
      <div className={listPanelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Mã</TableHead>
              <TableHead>Nhà xe</TableHead>
              <TableHead>Cách tính</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead className="text-right">Đã thanh toán</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead className="w-44 whitespace-nowrap">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted">Đang tải...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted">Chưa có hợp đồng vận chuyển.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.partnerName}</TableCell>
                <TableCell className="text-sm text-muted">{transportPricingLabel[row.pricingKind as TransportPricing] ?? row.pricingKind}</TableCell>
                <TableCell>{transportStatusLabel[row.status as keyof typeof transportStatusLabel] ?? row.status}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.tongHopDong)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.tongDaThanhToan)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.conLai)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <ActionBadge onClick={() => moSua(row)}>
                      {canEdit && !hopDongDangKhoa(row.status) ? (
                        <><Pencil className="size-3.5" aria-hidden /> Sửa</>
                      ) : (
                        <><Eye className="size-3.5" aria-hidden /> Xem</>
                      )}
                    </ActionBadge>
                    {canEdit && !hopDongDangKhoa(row.status) ? (
                      <ActionBadge tone="danger" onClick={() => setXoaId(row.id)}>
                        <Trash2 className="size-3.5" aria-hidden /> Xóa
                      </ActionBadge>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={mo} onOpenChange={setMo}>
        <SheetContent className="z-[60] flex w-full flex-col sm:w-3/4 sm:max-w-none">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Truck className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <SheetTitle>{suaId ? (name || "Hợp đồng vận chuyển") : "Thêm hợp đồng vận chuyển"}</SheetTitle>
                <SheetDescription asChild>
                  <div className="flex flex-wrap items-center gap-2">
                    {suaId ? (
                      <span className="inline-flex h-7 items-center rounded-full border border-line bg-soft px-3 text-xs font-medium text-ink">
                        {rows?.find((row) => row.id === suaId)?.code ?? "—"}
                      </span>
                    ) : null}
                    <span className="inline-flex h-7 items-center rounded-full border border-line bg-white px-3 text-xs font-medium text-muted">
                      {transportStatusLabel[status as keyof typeof transportStatusLabel] ?? status}
                    </span>
                    <span className="inline-flex h-7 items-center rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary">
                      {transportPricingLabel[pricingKind] ?? pricingKind}
                    </span>
                  </div>
                </SheetDescription>
              </div>
              <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-soft px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <dt className="text-xs text-muted">Số dòng</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink">{lines.length}</dd>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-primary">
                  <Wallet className="size-3.5 shrink-0" aria-hidden />
                  <dt className="text-xs text-primary">Tổng thanh toán</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatVnd(tongDong)}</dd>
                </div>
              </dl>
            </div>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {loi ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
              {bao ? <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{bao}</p> : null}
              {carriers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line bg-soft px-3 py-4 text-sm text-muted">
                  Chưa có đối tác vai trò vận tải. Thêm ở Đối tác rồi gán vai trò Vận tải.
                </p>
              ) : null}

              <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Nhà xe / đơn vị vận tải</span>
                    <select className={o} value={partnerId} disabled={!canEdit} onChange={(event) => setPartnerId(event.target.value)}>
                      <option value="">Chọn nhà xe</option>
                      {carriers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Cách tính cước</span>
                    <select
                      className={o}
                      value={pricingKind}
                      disabled={!canEdit}
                      onChange={(event) => {
                        const next = event.target.value as TransportPricing;
                        setPricingKind(next);
                        setLines((current) => current.map((item) => ({ ...item, unit: donViMacDinh(next) })));
                      }}
                    >
                      {Object.entries(transportPricingLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs font-medium text-muted">Tên hợp đồng</span>
                    <input className={o} value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} placeholder="Vận chuyển kính Dom C" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Ngày ký</span>
                    <NgayNhap value={signedOn} onChange={setSignedOn} disabled={!canEdit} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Đơn giá mặc định</span>
                    <input className={cn(o, "text-right tabular-nums")} value={unitPrice ? formatVnd(Number(unitPrice)) : ""} disabled={!canEdit} onChange={(event) => setUnitPrice(digitsVnd(event.target.value))} inputMode="numeric" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-xs font-medium text-muted">Trạng thái</span>
                    <select className={o} value={status} disabled={!canEdit} title={contractStatusMoTa[status as keyof typeof contractStatusMoTa]} onChange={(event) => setStatus(event.target.value)}>
                      {contractStatusList.map((id) => (
                        <option key={id} value={id} title={contractStatusMoTa[id]}>{transportStatusLabel[id]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-xs font-medium text-muted">Ghi chú</span>
                    <input className={o} value={note} disabled={!canEdit} onChange={(event) => setNote(event.target.value)} />
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-soft text-muted">
                      <th className={tieuDe}>Nội dung</th>
                      <th className={tieuDe}>Tuyến</th>
                      <th className={cn(tieuDe, "w-24")}>ĐVT</th>
                      <th className={cn(tieuDeSo, "w-24")}>SL</th>
                      <th className={cn(tieuDeSo, "w-28")}>Đơn giá</th>
                      <th className={cn(tieuDeSo, "w-28")}>Thành tiền</th>
                      {canEdit ? <th className={cn(tieuDe, "w-16")}>Xóa</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((dong) => (
                      <tr key={dong.key} className="border-b border-line last:border-0">
                        <td className="p-0 align-top"><input className={cell} value={dong.name} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, name: event.target.value } : item))} /></td>
                        <td className="p-0 align-top"><input className={cell} value={dong.routeText} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, routeText: event.target.value } : item))} placeholder="Kho → công trình" /></td>
                        <td className="p-0 align-top">
                          <select className={cell} value={dong.unit} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, unit: event.target.value } : item))}>
                            {transportUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                          </select>
                        </td>
                        <td className="p-0 align-top"><input className={num} value={dong.quantity} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, quantity: event.target.value } : item))} /></td>
                        <td className="p-0 align-top">
                          <input
                            className={num}
                            value={dong.unitPrice ? formatVnd(Number(dong.unitPrice)) : ""}
                            disabled={!canEdit}
                            onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, unitPrice: digitsVnd(event.target.value) } : item))}
                            inputMode="numeric"
                          />
                        </td>
                        <td className="p-0 align-top"><span className="flex h-9 items-center justify-end px-2 text-sm font-medium tabular-nums">{formatVnd(thanhTien(dong.quantity, dong.unitPrice))}</span></td>
                        {canEdit ? (
                          <td className="p-0 align-top">
                            <button type="button" disabled={lines.length <= 1} onClick={() => setLines((current) => current.filter((item) => item.key !== dong.key))} className="flex h-9 items-center px-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-40"><Trash2 className="size-4" aria-hidden /> Xóa</button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {suaId ? (
                <div className="space-y-3 rounded-2xl border border-line bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">Lịch sử thanh toán</h3>
                      <p className="text-xs text-muted">Không cộng vào tổng chi phí công trình — chỉ trừ dần số còn phải trả.</p>
                    </div>
                    {canEdit && hopDongChoThanhToan(status) ? (
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setMoThemThanhToan((v) => !v)}>
                        <Plus className="size-4" />Thêm thanh toán
                      </Button>
                    ) : null}
                  </div>
                  {canEdit && hopDongChoThanhToan(status) && moThemThanhToan ? (
                    <div className="rounded-xl border border-line bg-soft/50 px-3 py-3">
                      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[140px_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_auto]">
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Ngày</span>
                          <NgayNhap value={ttNgay} onChange={setTtNgay} className={cn(o, "w-full")} />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Số tiền</span>
                          <input
                            className={cn(o, "tabular-nums")}
                            value={ttTien ? formatCount(Number(ttTien)) : ""}
                            onChange={(event) => setTtTien(digitsVnd(event.target.value))}
                            placeholder="0"
                            inputMode="numeric"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Người chi</span>
                          <select className={o} value={ttNguoi} onChange={(event) => setTtNguoi(event.target.value)}>
                            <option value="">Chọn người chi</option>
                            {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted">Ghi chú</span>
                          <input className={o} value={ttGhi} onChange={(event) => setTtGhi(event.target.value)} placeholder="Nội dung thanh toán" />
                        </label>
                        <Button type="button" className="h-9 shrink-0 gap-1.5 px-4" disabled={dangLuu} onClick={() => void themThanhToan()}>
                          <Save className="size-4" />Lưu
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  <ul className="space-y-2">
                    {advances.length === 0 ? <li className="text-sm text-muted">Chưa có thanh toán.</li> : null}
                    {advances.map((dong) => {
                      const nguoiChi = staff.find((item) => item.id === dong.payerId)?.name || "—";
                      return (
                        <li
                          key={dong.id}
                          className="grid items-center gap-3 rounded-xl border border-line bg-soft/50 px-3 py-2 text-sm"
                          style={{ gridTemplateColumns: canEdit ? "7.5rem 8.5rem minmax(11rem,14rem) minmax(0,1fr) auto" : "7.5rem 8.5rem minmax(11rem,14rem) minmax(0,1fr)" }}
                        >
                          <span className="tabular-nums text-ink">{ngayHien(dong.occurredOn)}</span>
                          <span className="text-right font-medium tabular-nums text-ink">{formatVnd(dong.amount)}</span>
                          <span className="inline-flex h-6 max-w-full items-center truncate rounded-full border border-line bg-white px-2.5 text-xs font-medium text-ink" title={`Người chi: ${nguoiChi}`}>
                            Người chi: {nguoiChi}
                          </span>
                          <span className="truncate text-muted">Ghi chú: {dong.note || "—"}</span>
                          {canEdit ? (
                            <ActionBadge tone="danger" className="justify-self-end" onClick={() => void xoaThanhToan(dong.id)}>
                              <Trash2 className="size-3.5" aria-hidden /> Xóa
                            </ActionBadge>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            {canEdit ? (
              <SheetFooter className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLines((current) => [...current, dongTrong(unitPrice, donViMacDinh(pricingKind))])}>
                  <Plus className="size-4" />Thêm dòng
                </Button>
                <div className="flex gap-2">
                  {suaId && !hopDongDangKhoa(status) ? (
                    <Button type="button" variant="outline" className="gap-1.5 text-danger" onClick={() => setXoaId(suaId)} disabled={dangLuu}>
                      <Trash2 className="size-4" />Xóa hợp đồng
                    </Button>
                  ) : null}
                  <Button type="button" className="gap-1.5" disabled={dangLuu || carriers.length === 0} onClick={() => void luu()}>
                    <Save className="size-4" />
                    {dangLuu ? "Đang lưu" : "Lưu hợp đồng"}
                  </Button>
                </div>
              </SheetFooter>
            ) : (
              <SheetFooter className="gap-2 bg-white">
                <Button type="button" variant="outline" onClick={() => setMo(false)}>
                  <X className="size-4" aria-hidden /> Đóng
                </Button>
              </SheetFooter>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(xoaId)} onOpenChange={(open) => { if (!open) setXoaId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hợp đồng vận chuyển</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa được khi chưa có thanh toán. Thao tác không hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setXoaId(null)}><X className="size-4" aria-hidden /> Hủy</Button>
            <Button type="button" disabled={dangLuu} onClick={() => void xoaHop()}><Trash2 className="size-4" aria-hidden /> Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
