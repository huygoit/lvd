"use client";

import { useEffect, useState } from "react";
import { callApi } from "@/shared/client/api";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { todayYmd } from "@/shared/lib/dates";
import { digitsVnd, formatVnd } from "@/shared/lib/money";
import { fabricationStatusLabel, fabricationSupplyLabel } from "@/modules/fabrication/fields";

type Workshop = { id: string; code: string; name: string };
type Staff = { id: string; name: string };

type Line = {
  key: string;
  name: string;
  widthMm: string;
  heightMm: string;
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
  supplyKind: string;
  status: string;
  signedOn: string;
  ratePerM2: number | null;
  note: string;
  tongHopDong: number;
  tongTamUng: number;
  conLai: number;
  lines: {
    name: string;
    widthMm: number;
    heightMm: number;
    quantity: number;
    unitPrice: number;
    amount: number;
    note: string;
  }[];
  advances: Advance[];
};

const o = "h-9 w-full rounded-lg border border-line bg-white px-2 text-sm text-ink outline-none focus:border-primary";

function dienTich(width: string, height: string, qty: string) {
  const w = Number(width);
  const h = Number(height);
  const q = Number(String(qty).replace(",", "."));
  if (![w, h, q].every((n) => Number.isFinite(n) && n > 0)) return 0;
  return Math.round((w * h * q) / 10_000) / 100;
}

function thanhTien(width: string, height: string, qty: string, price: string) {
  const area = dienTich(width, height, qty);
  const don = Number(String(price).replace(/\D/g, ""));
  if (!area || !don) return 0;
  return Math.round(area * don);
}

function dongTrong(rate: string): Line {
  return { key: crypto.randomUUID(), name: "", widthMm: "", heightMm: "", quantity: "", unitPrice: rate, note: "" };
}

function ngayHien(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

export function ProjectFabrication({
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
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [mo, setMo] = useState(false);
  const [suaId, setSuaId] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [xoaId, setXoaId] = useState<string | null>(null);

  const [partnerId, setPartnerId] = useState("");
  const [name, setName] = useState("");
  const [supplyKind, setSupplyKind] = useState("lvd_cap_vat_tu");
  const [signedOn, setSignedOn] = useState("");
  const [ratePerM2, setRatePerM2] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("da_luu");
  const [lines, setLines] = useState<Line[]>([dongTrong("")]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [tamUngNgay, setTamUngNgay] = useState(() => todayYmd(new Date()));
  const [tamUngTien, setTamUngTien] = useState("");
  const [tamUngNguoi, setTamUngNguoi] = useState(defaultPayerId);
  const [tamUngGhi, setTamUngGhi] = useState("");

  function tai() {
    callApi<{ rows: Contract[]; workshops: Workshop[] }>(`/api/cong-trinh/${projectId}/gia-cong`)
      .then((data) => {
        setRows(data.rows);
        setWorkshops(data.workshops);
      })
      .catch((caught: unknown) => setLoi(caught instanceof Error ? caught.message : "Không tải được hợp đồng gia công."));
  }

  useEffect(() => {
    setRows(null);
    setLoi("");
    tai();
  }, [projectId]);

  function moThem() {
    setSuaId("");
    setPartnerId(workshops[0]?.id ?? "");
    setName("");
    setSupplyKind("lvd_cap_vat_tu");
    setSignedOn("");
    setRatePerM2("");
    setNote("");
    setStatus("da_luu");
    setLines([dongTrong("")]);
    setAdvances([]);
    setBao("");
    setLoi("");
    setMo(true);
  }

  function moSua(row: Contract) {
    setSuaId(row.id);
    setPartnerId(row.partnerId);
    setName(row.name);
    setSupplyKind(row.supplyKind);
    setSignedOn(row.signedOn);
    setRatePerM2(row.ratePerM2 ? String(row.ratePerM2) : "");
    setNote(row.note);
    setStatus(row.status);
    setLines(row.lines.length
      ? row.lines.map((dong) => ({
          key: crypto.randomUUID(),
          name: dong.name,
          widthMm: dong.widthMm ? String(dong.widthMm) : "",
          heightMm: dong.heightMm ? String(dong.heightMm) : "",
          quantity: String(dong.quantity),
          unitPrice: String(dong.unitPrice),
          note: dong.note,
        }))
      : [dongTrong(row.ratePerM2 ? String(row.ratePerM2) : "")]);
    setAdvances(row.advances);
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
        supplyKind,
        signedOn,
        ratePerM2,
        note,
        status,
        lines: lines.map((dong) => ({
          name: dong.name,
          widthMm: dong.widthMm,
          heightMm: dong.heightMm,
          quantity: dong.quantity,
          unitPrice: dong.unitPrice,
          note: dong.note,
        })),
      };
      const saved = suaId
        ? await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}`, { method: "PATCH", body: JSON.stringify(body) })
        : await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong`, { method: "POST", body: JSON.stringify(body) });
      setRows((current) => {
        const list = current ?? [];
        if (suaId) return list.map((item) => item.id === saved.id ? saved : item);
        return [saved, ...list];
      });
      setSuaId(saved.id);
      setAdvances(saved.advances);
      setBao("Đã lưu hợp đồng gia công.");
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
      await callApi(`/api/cong-trinh/${projectId}/gia-cong/${xoaId}`, { method: "DELETE" });
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

  async function themTamUng() {
    if (!suaId) {
      setLoi("Lưu hợp đồng trước khi ghi tạm ứng.");
      return;
    }
    setDangLuu(true);
    setLoi("");
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}/tam-ung`, {
        method: "POST",
        body: JSON.stringify({ occurredOn: tamUngNgay, amount: digitsVnd(tamUngTien), payerId: tamUngNguoi, note: tamUngGhi }),
      });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
      setTamUngTien("");
      setTamUngGhi("");
      setBao("Đã ghi tạm ứng.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không ghi được tạm ứng.");
    } finally {
      setDangLuu(false);
    }
  }

  async function xoaTamUng(id: string) {
    if (!suaId) return;
    setDangLuu(true);
    try {
      const saved = await callApi<Contract>(`/api/cong-trinh/${projectId}/gia-cong/${suaId}/tam-ung/${id}`, { method: "DELETE" });
      setRows((current) => current?.map((item) => item.id === saved.id ? saved : item) ?? current);
      setAdvances(saved.advances);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được tạm ứng.");
    } finally {
      setDangLuu(false);
    }
  }

  const tongDong = lines.reduce((tong, dong) => tong + thanhTien(dong.widthMm, dong.heightMm, dong.quantity, dong.unitPrice), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Hợp đồng thuê xưởng gia công kính theo công trình. Chi phí lấy tổng thành tiền đã lưu. Tạm ứng chỉ theo dõi tiền đã đưa xưởng.
        </p>
        {canEdit ? <Button type="button" size="sm" onClick={moThem}>Thêm hợp đồng</Button> : null}
      </div>
      {loi && !mo ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Mã</TableHead>
              <TableHead>Xưởng</TableHead>
              <TableHead>Hình thức</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead className="text-right">Đã tạm ứng</TableHead>
              <TableHead className="text-right">Còn lại</TableHead>
              <TableHead className="w-36">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted">Đang tải...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted">Chưa có hợp đồng gia công.</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.partnerName}</TableCell>
                <TableCell className="text-sm text-muted">{fabricationSupplyLabel[row.supplyKind as keyof typeof fabricationSupplyLabel] ?? row.supplyKind}</TableCell>
                <TableCell>{fabricationStatusLabel[row.status as keyof typeof fabricationStatusLabel] ?? row.status}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.tongHopDong)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.tongTamUng)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVnd(row.conLai)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => moSua(row)}>{canEdit && row.status !== "ket_thuc" ? "Sửa" : "Xem"}</Button>
                    {canEdit && row.status !== "ket_thuc" ? <Button type="button" size="sm" variant="outline" onClick={() => setXoaId(row.id)}>Xóa</Button> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={mo} onOpenChange={setMo}>
        <SheetContent className="flex w-full flex-col sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{suaId ? "Hợp đồng gia công" : "Thêm hợp đồng gia công"}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
            {loi ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
            {bao ? <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{bao}</p> : null}
            {workshops.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-soft px-3 py-4 text-sm text-muted">
                Chưa có đối tác vai trò xưởng gia công. Thêm ở Đối tác rồi gán vai trò Xưởng gia công.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted">Xưởng gia công</span>
                <select className={`mt-1 ${o}`} value={partnerId} disabled={!canEdit} onChange={(event) => setPartnerId(event.target.value)}>
                  <option value="">Chọn xưởng</option>
                  {workshops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-muted">Hình thức</span>
                <select className={`mt-1 ${o}`} value={supplyKind} disabled={!canEdit} onChange={(event) => setSupplyKind(event.target.value)}>
                  {Object.entries(fabricationSupplyLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted">Tên hợp đồng</span>
                <input className={`mt-1 ${o}`} value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} placeholder="Gia công kính Dom C" />
              </label>
              <label className="text-sm">
                <span className="text-muted">Ngày ký</span>
                <div className="mt-1"><NgayNhap value={signedOn} onChange={setSignedOn} disabled={!canEdit} /></div>
              </label>
              <label className="text-sm">
                <span className="text-muted">Đơn giá m² mặc định</span>
                <input className={`mt-1 ${o}`} value={ratePerM2} disabled={!canEdit} onChange={(event) => setRatePerM2(digitsVnd(event.target.value))} inputMode="numeric" />
              </label>
              <label className="text-sm">
                <span className="text-muted">Trạng thái</span>
                <select className={`mt-1 ${o}`} value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value)}>
                  <option value="nhap">Nháp</option>
                  <option value="da_luu">Đã lưu</option>
                  <option value="ket_thuc">Kết thúc</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted">Ghi chú</span>
                <input className={`mt-1 ${o}`} value={note} disabled={!canEdit} onChange={(event) => setNote(event.target.value)} />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Khối lượng gia công</h3>
                {canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, dongTrong(ratePerM2)])}>Thêm dòng</Button> : null}
              </div>
              <div className="overflow-x-auto rounded-xl border border-line">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-soft hover:bg-soft">
                      <TableHead>Nội dung</TableHead>
                      <TableHead className="w-20">Rộng</TableHead>
                      <TableHead className="w-20">Cao</TableHead>
                      <TableHead className="w-20">SL</TableHead>
                      <TableHead className="w-24">m²</TableHead>
                      <TableHead className="w-28">Đơn giá</TableHead>
                      <TableHead className="w-28 text-right">Thành tiền</TableHead>
                      {canEdit ? <TableHead className="w-16" /> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((dong) => (
                      <TableRow key={dong.key}>
                        <TableCell><input className={o} value={dong.name} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, name: event.target.value } : item))} /></TableCell>
                        <TableCell><input className={o} value={dong.widthMm} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, widthMm: digitsVnd(event.target.value) } : item))} inputMode="numeric" /></TableCell>
                        <TableCell><input className={o} value={dong.heightMm} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, heightMm: digitsVnd(event.target.value) } : item))} inputMode="numeric" /></TableCell>
                        <TableCell><input className={o} value={dong.quantity} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, quantity: event.target.value } : item))} /></TableCell>
                        <TableCell className="tabular-nums text-sm">{dienTich(dong.widthMm, dong.heightMm, dong.quantity).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</TableCell>
                        <TableCell><input className={o} value={dong.unitPrice} disabled={!canEdit} onChange={(event) => setLines((current) => current.map((item) => item.key === dong.key ? { ...item, unitPrice: digitsVnd(event.target.value) } : item))} inputMode="numeric" /></TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatVnd(thanhTien(dong.widthMm, dong.heightMm, dong.quantity, dong.unitPrice))}</TableCell>
                        {canEdit ? (
                          <TableCell>
                            <Button type="button" size="sm" variant="outline" disabled={lines.length <= 1} onClick={() => setLines((current) => current.filter((item) => item.key !== dong.key))}>Xóa</Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-right text-sm font-semibold tabular-nums">Tổng {formatVnd(tongDong)}</p>
            </div>

            {suaId ? (
              <div className="space-y-3 rounded-xl border border-line bg-soft/40 p-3">
                <h3 className="text-sm font-semibold">Tạm ứng cho xưởng</h3>
                <p className="text-xs text-muted">Tạm ứng không cộng thêm vào tổng chi phí công trình. Chỉ trừ dần số còn phải trả xưởng.</p>
                {canEdit && status !== "nhap" ? (
                  <div className="grid gap-2 sm:grid-cols-[140px_1fr_1fr_auto]">
                    <NgayNhap value={tamUngNgay} onChange={setTamUngNgay} />
                    <input className={o} value={tamUngTien} onChange={(event) => setTamUngTien(digitsVnd(event.target.value))} placeholder="Số tiền" inputMode="numeric" />
                    <select className={o} value={tamUngNguoi} onChange={(event) => setTamUngNguoi(event.target.value)}>
                      <option value="">Người chi</option>
                      {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <Button type="button" variant="outline" disabled={dangLuu} onClick={() => void themTamUng()}>Ghi</Button>
                    <input className={`sm:col-span-4 ${o}`} value={tamUngGhi} onChange={(event) => setTamUngGhi(event.target.value)} placeholder="Ghi chú tạm ứng" />
                  </div>
                ) : null}
                <ul className="space-y-2">
                  {advances.length === 0 ? <li className="text-sm text-muted">Chưa có tạm ứng.</li> : null}
                  {advances.map((dong) => (
                    <li key={dong.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-sm">
                      <span>{ngayHien(dong.occurredOn)} · {formatVnd(dong.amount)}{dong.note ? ` · ${dong.note}` : ""}</span>
                      {canEdit ? <Button type="button" size="sm" variant="outline" onClick={() => void xoaTamUng(dong.id)}>Xóa</Button> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <SheetFooter className="gap-2 bg-white">
            <Button type="button" variant="outline" onClick={() => setMo(false)}>Đóng</Button>
            {canEdit ? <Button type="button" disabled={dangLuu || workshops.length === 0} onClick={() => void luu()}>{dangLuu ? "Đang lưu" : "Lưu hợp đồng"}</Button> : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(xoaId)} onOpenChange={(open) => { if (!open) setXoaId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hợp đồng gia công</AlertDialogTitle>
            <AlertDialogDescription>Chỉ xóa được khi chưa có tạm ứng. Thao tác không hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setXoaId(null)}>Hủy</Button>
            <Button type="button" disabled={dangLuu} onClick={() => void xoaHop()}>Xóa</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
