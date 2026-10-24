"use client";

import { Fragment, useEffect, useState } from "react";
import { DispatchSheet } from "@/modules/stock/dispatch-sheet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonPrimary, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { callApi } from "@/shared/client/api";
import { formatStockQty, kgReceiveLabel, stockPlaceLabel, stockPlaces, stockSlipKindLabel, stockSlipKinds, stockSlipStatusLabel } from "@/shared/catalog/stock";
import { SlipForm, type PartyOption, type SlipDraft } from "@/modules/stock/slip-form";

type Mode = "them" | "sua" | "xem";

export type SlipRow = {
  id: string;
  code: string;
  kind: string;
  status: string;
  slipNo: string;
  partnerName: string;
  projectName: string;
  lineCount: number;
  when: string;
};

export type PendingKg = {
  lineId: string;
  slipId: string;
  slipCode: string;
  code: string;
  name: string;
  unit: string;
  invoiceGrams: number;
  barCount: number;
  when: string;
};

export type BalanceRow = {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  placeKind: string;
  placeLabel: string;
  qty: number;
};

export type OpenSlip = SlipDraft & {
  partnerName: string;
  projectName: string;
  fromLabel: string;
  toLabel: string;
  when: string;
  files: { id: string; fileName: string }[];
};

function queryOf(search: string, patch: Record<string, string | null>) {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  return query ? `/kho?${query}` : "/kho";
}

export function StockBoard({
  view,
  balances,
  pending,
  slips,
  opened,
  projects,
  partners,
  q,
  kind,
  place,
  includeClosed,
  page,
  pages,
  total,
  canCreate,
  canUpdate,
  initialMode,
  initialId,
}: {
  view: "ton" | "phieu";
  balances: BalanceRow[];
  pending: PendingKg[];
  slips: SlipRow[];
  opened: OpenSlip | null;
  projects: PartyOption[];
  partners: PartyOption[];
  q: string;
  kind: string;
  place: string;
  includeClosed: boolean;
  page: number;
  pages: number;
  total: number;
  canCreate: boolean;
  canUpdate: boolean;
  initialMode: Mode | null;
  initialId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [openId, setOpenId] = useState(initialId);
  const [panelId, setPanelId] = useState(initialId);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<"ghi" | "xoa" | null>(null);
  const [acting, setActing] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [sent, setSent] = useState("");

  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(""), 2500);
    return () => window.clearTimeout(timer);
  }, [sent]);

  function open(next: Mode | null, id = "") {
    setMode(next);
    setOpenId(next ? id : "");
    if (id) setPanelId(id);
    setError("");
    router.replace(queryOf(window.location.search, { mo: next, "ho-so": next && next !== "them" ? id : null }), { scroll: false });
  }

  const current = opened && opened.id === (openId || panelId) ? opened : null;

  async function postCurrent() {
    if (!current) return;
    setActing(true);
    setError("");
    try {
      await callApi(`/api/kho/phieu/${current.id}/ghi-so`, { method: "POST" });
      setAsk(null);
      router.refresh();
      open("xem", current.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không ghi sổ được.");
      setAsk(null);
    } finally {
      setActing(false);
    }
  }

  async function removeCurrent() {
    if (!current) return;
    setActing(true);
    setError("");
    try {
      await callApi(`/api/kho/phieu/${current.id}`, { method: "DELETE" });
      setAsk(null);
      router.refresh();
      open(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được.");
      setAsk(null);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kho vật tư</h1>
          <p className="mt-1 text-sm text-muted">Tồn tính từ phiếu. Hàng tới công trình chưa phải đã lắp.</p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setDispatchOpen(true)}>Giao đến công trình</Button>
            <Button type="button" onClick={() => open("them")}>Thêm phiếu</Button>
          </div>
        ) : null}
      </div>
      {sent ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{sent}</p> : null}
      <DispatchSheet open={dispatchOpen} projects={projects} onClose={() => setDispatchOpen(false)} onDone={(message) => { setSent(message); router.refresh(); }} />
      <div className="flex gap-2">
        <Link href={queryOf("", { muc: null })} className={view === "ton" ? buttonPrimary : "inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-sm font-medium"}>Tồn kho</Link>
        <Link href={queryOf("", { muc: "phieu" })} className={view === "phieu" ? buttonPrimary : "inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-sm font-medium"}>Phiếu xuất nhập</Link>
      </div>
      {view === "ton" ? (
        <>
          <form className="flex flex-wrap gap-2" action="/kho">
            <input name="q" defaultValue={q} placeholder="Mã, tên vật tư" className={`${inputClass} max-w-sm`} />
            <select name="cho" defaultValue={place} className={`${selectClass} max-w-[220px]`}>
              <option value="">Mọi chỗ đang giữ</option>
              {stockPlaces.filter((item) => item.usable).map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="het" value="1" defaultChecked={includeClosed} />
              Xem cả đã lắp và hỏng
            </label>
            <button className={buttonPrimary}>Lọc</button>
          </form>
          {pending.length > 0 ? (
            <div className="rounded-[18px] border border-line bg-white px-4 py-3">
              <p className="text-sm font-semibold text-ink">Đang chờ phiếu</p>
              <ul className="mt-2 space-y-1">
                {pending.map((item) => (
                  <li key={item.lineId}>
                    <button type="button" className="text-left text-sm" onClick={() => open("xem", item.slipId)}>
                      <span className="font-semibold text-primary">{item.slipCode}</span>
                      <span className="text-ink"> · {item.code}</span>
                      <span className="text-muted"> · hóa đơn {formatStockQty(item.invoiceGrams)} kg</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={panelClass}>
            <Table>
              <TableHeader>
                <TableRow className="bg-soft hover:bg-soft">
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Chỗ giữ</TableHead>
                  <TableHead>ĐVT</TableHead>
                  <TableHead className="text-right">Tồn</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted">Chưa có tồn. Lập phiếu nhập khi hàng về kho, hoặc giao thẳng khi hàng tới công trình.</TableCell>
                  </TableRow>
                ) : null}
                {balances.map((row) => (
                  <TableRow key={`${row.materialId}-${row.placeKind}-${row.placeLabel}`}>
                    <TableCell className="font-semibold text-primary">{row.code}</TableCell>
                    <TableCell className="whitespace-normal">{row.name}</TableCell>
                    <TableCell>{row.placeLabel || stockPlaceLabel(row.placeKind)}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell className="text-right font-semibold">{formatStockQty(row.qty)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted">{total} dòng tồn.</p>
        </>
      ) : (
        <>
          <form className="flex flex-wrap gap-2" action="/kho">
            <input type="hidden" name="muc" value="phieu" />
            <input name="q" defaultValue={q} placeholder="Mã phiếu, số phiếu, công trình" className={`${inputClass} max-w-sm`} />
            <select name="loai" defaultValue={kind} className={`${selectClass} max-w-[180px]`}>
              <option value="">Mọi loại</option>
              {stockSlipKinds.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <button className={buttonPrimary}>Lọc</button>
          </form>
          <div className={panelClass}>
            <Table>
              <TableHeader>
                <TableRow className="bg-soft hover:bg-soft">
                  <TableHead>Mã</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>Công trình</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted">Chưa có phiếu.</TableCell>
                  </TableRow>
                ) : null}
                {slips.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <button type="button" className="font-semibold text-primary" onClick={() => open("xem", row.id)}>{row.code}</button>
                    </TableCell>
                    <TableCell>{stockSlipKindLabel(row.kind)}</TableCell>
                    <TableCell>{row.when}</TableCell>
                    <TableCell>{row.partnerName || "—"}</TableCell>
                    <TableCell className="whitespace-normal">{row.projectName || "—"}</TableCell>
                    <TableCell>{stockSlipStatusLabel(row.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Trang {page}/{pages}</span>
              <div className="flex gap-2">
                {page > 1 ? <Link href={`/kho?muc=phieu&trang=${page - 1}`} className="font-semibold text-primary">Trước</Link> : null}
                {page < pages ? <Link href={`/kho?muc=phieu&trang=${page + 1}`} className="font-semibold text-primary">Sau</Link> : null}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Sheet open={mode !== null} onOpenChange={(next) => { if (!next) open(null); }}>
        <SheetContent className="sm:w-2/3">
          <SheetHeader>
            <SheetTitle>{mode === "them" ? "Thêm phiếu" : current?.code || "Phiếu kho"}</SheetTitle>
            <SheetDescription>
              {mode === "them" ? "Lưu nháp trước khi ghi sổ." : current ? `${stockSlipKindLabel(current.kind)} · ${stockSlipStatusLabel(current.status)}` : "Đang mở phiếu."}
            </SheetDescription>
          </SheetHeader>
          {mode === "xem" && current ? (
            <SlipDetail row={current} canUpdate={canUpdate} error={error} onError={setError} onEdit={() => open("sua", current.id)} onPost={() => setAsk("ghi")} onDelete={() => setAsk("xoa")} onClose={() => open(null)} />
          ) : null}
          {mode === "them" && canCreate ? (
            <SlipForm mode="them" projects={projects} partners={partners} error={error} onClose={() => open(null)} onSaved={(id) => open("xem", id)} onError={setError} />
          ) : null}
          {mode === "sua" && canUpdate && current ? (
            <SlipForm key={current.id} mode="sua" initial={current} projects={projects} partners={partners} error={error} onClose={() => open("xem", current.id)} onSaved={(id) => open("xem", id)} onError={setError} />
          ) : null}
          {mode !== null && mode !== "them" && !current ? <p className="px-5 py-4 text-sm text-muted">Đang tải phiếu...</p> : null}
        </SheetContent>
      </Sheet>
      <AlertDialog open={ask !== null} onOpenChange={(next) => { if (!next && !acting) setAsk(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ask === "xoa" ? "Xóa phiếu nháp" : "Ghi sổ phiếu"}</AlertDialogTitle>
            <AlertDialogDescription>
              {ask === "xoa"
                ? `Xóa ${current?.code ?? "phiếu này"}? Phiếu chưa ghi sổ nên chưa cộng trừ tồn.`
                : "Phiếu sẽ cộng trừ tồn theo số lượng thực nhận. Sau khi ghi sổ không sửa và không xóa được."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Hủy</AlertDialogCancel>
            <Button type="button" variant={ask === "xoa" ? "destructive" : "default"} disabled={acting} onClick={ask === "xoa" ? removeCurrent : postCurrent}>
              {acting ? "Đang xử lý" : ask === "xoa" ? "Xóa nháp" : "Ghi sổ"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SlipDetail({
  row,
  canUpdate,
  error,
  onError,
  onEdit,
  onPost,
  onDelete,
  onClose,
}: {
  row: OpenSlip;
  canUpdate: boolean;
  error: string;
  onError: (message: string) => void;
  onEdit: () => void;
  onPost: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const draft = row.status === "nhap";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Đường đi", row.fromLabel ? `${row.fromLabel} → ${row.toLabel}` : row.toLabel],
            ["Nhà cung cấp", row.partnerName || "—"],
            ["Công trình", row.projectName || "—"],
            ["Số phiếu nhà cung cấp", row.slipNo || "—"],
            ["Lý do", row.reason || "—"],
            ["Ngày lập", row.when],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line px-4 py-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Vật tư</th>
                <th className="px-3 py-2 font-medium">ĐVT</th>
                <th className="px-3 py-2 text-right font-medium">SL chứng từ</th>
                <th className="px-3 py-2 text-right font-medium">SL thực nhận</th>
              </tr>
            </thead>
            <tbody>
              {row.lines.map((line) => (
                <Fragment key={line.id || line.materialId}>
                  <tr className="border-t border-line">
                    <td className="px-3 py-2">
                      <p className="font-medium">{line.code}</p>
                      <p className="text-xs text-muted">{line.name}</p>
                    </td>
                    <td className="px-3 py-2">{line.unit}</td>
                    <td className="px-3 py-2 text-right">{formatStockQty(line.documentQty)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {formatStockQty(line.receivedQty)}
                      {line.priceBasis !== "kg" && line.documentQty !== line.receivedQty ? <span className="ml-2 text-xs font-medium text-danger">Lệch</span> : null}
                    </td>
                  </tr>
                  {line.priceBasis === "kg" ? (
                    <tr className="border-t border-dashed border-line bg-soft/60">
                      <td colSpan={4} className="px-3 py-3 text-xs text-ink">
                        <p>
                          {kgReceiveLabel(line.receiveState || "")}
                          {" · "}{formatStockQty(line.barCount || 0)} thanh
                          {line.lengthMm ? ` · dài ${formatStockQty(line.lengthMm)} m` : ""}
                          {line.theoryGrams ? ` · lý thuyết ${formatStockQty(line.theoryGrams)} kg` : ""}
                          {` · hóa đơn ${formatStockQty(line.invoiceGrams || 0)} kg`}
                          {line.weighedGrams ? ` · cân ${formatStockQty(line.weighedGrams)} kg` : ""}
                        </p>
                        {line.weighedGrams && line.theoryGrams && line.weighedGrams !== line.theoryGrams ? (
                          <p className="mt-1 font-medium text-danger">{line.unit === "kg" ? "Lệch cân so với lý thuyết. Tồn theo kg cân." : "Lệch cân so với lý thuyết. Tồn vẫn theo số thanh."}</p>
                        ) : null}
                        {line.receiveState === "tam_nhap" ? <p className="mt-1 text-muted">Chưa cộng tồn. Cần xác nhận khi có phiếu.</p> : null}
                        {!draft && canUpdate && line.receiveState === "tam_nhap" && line.id ? (
                          <ConfirmKg slipId={row.id} lineId={line.id} unit={line.unit} barCount={line.barCount || 0} lengthMm={line.lengthMm ?? null} onError={onError} />
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {row.note ? <p className="text-sm text-ink">{row.note}</p> : null}
        <div>
          <p className="mb-1 text-sm font-medium">Ảnh phiếu</p>
          {row.files.length === 0 ? <p className="text-sm text-muted">Chưa có ảnh.</p> : (
            <ul className="space-y-1">
              {row.files.map((file) => (
                <li key={file.id}><a className="text-sm font-medium text-primary" href={`/api/tep/${file.id}`} target="_blank" rel="noreferrer">{file.fileName}</a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 border-t border-line bg-white px-5 py-3">
        {error ? <p role="alert" className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Đóng</Button>
          {canUpdate && draft ? <Button type="button" variant="outline" onClick={onDelete}>Xóa nháp</Button> : null}
          {canUpdate && draft ? <Button type="button" variant="outline" onClick={onEdit}>Sửa</Button> : null}
          {canUpdate && draft ? <Button type="button" onClick={onPost}>Ghi sổ</Button> : null}
        </div>
      </div>
    </div>
  );
}

function ConfirmKg({
  slipId,
  lineId,
  unit,
  barCount,
  lengthMm,
  onError,
}: {
  slipId: string;
  lineId: string;
  unit: string;
  barCount: number;
  lengthMm: number | null;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [bars, setBars] = useState(barCount ? formatStockQty(barCount) : "");
  const [lengthM, setLengthM] = useState(lengthMm ? formatStockQty(lengthMm) : "");
  const [weighed, setWeighed] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    onError("");
    try {
      await callApi(`/api/kho/phieu/${slipId}/xac-nhan`, {
        method: "POST",
        body: JSON.stringify({ lineId, barCount: bars, lengthM, weighedKg: weighed }),
      });
      setAsk(false);
      router.refresh();
    } catch (caught) {
      setAsk(false);
      onError(caught instanceof Error ? caught.message : "Không xác nhận được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-4">
      {unit === "kg" ? null : (
        <label className="text-xs">
          <span className="mb-1 block font-medium text-muted">Số thanh</span>
          <input value={bars} onChange={(event) => setBars(event.target.value)} className={inputClass} inputMode="decimal" />
        </label>
      )}
      <label className="text-xs">
        <span className="mb-1 block font-medium text-muted">Dài (m)</span>
        <input value={lengthM} onChange={(event) => setLengthM(event.target.value)} className={inputClass} inputMode="decimal" />
      </label>
      <label className="text-xs">
        <span className="mb-1 block font-medium text-muted">Kg cân</span>
        <input value={weighed} onChange={(event) => setWeighed(event.target.value)} className={inputClass} inputMode="decimal" />
      </label>
      <div className="flex items-end">
        <Button type="button" onClick={() => setAsk(true)} disabled={busy}>Xác nhận nhận</Button>
      </div>
      <AlertDialog open={ask} onOpenChange={(next) => { if (!busy) setAsk(next); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận nhận</AlertDialogTitle>
            <AlertDialogDescription>
              {unit === "kg" ? "Tồn sẽ cộng theo kg cân." : "Tồn sẽ cộng theo số thanh."} Kg hóa đơn giữ nguyên. Lệch cân không chặn xác nhận.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <Button type="button" disabled={busy} onClick={send}>{busy ? "Đang xác nhận" : "Xác nhận"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
