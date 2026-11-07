"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { panelClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { formatCount } from "@/shared/lib/money";
import type { QuoteTemplateRow } from "@/modules/settings/quote-templates";
import type { PreviewRow, ScalarVar, TableColumnVar } from "@/modules/settings/quote-template-vars";

type Bundle = {
  templates: QuoteTemplateRow[];
  active: QuoteTemplateRow | null;
  layout: {
    defaultSheet: string;
    headerRow: number;
    subHeaderRow: number;
    bodyStartRow: number;
  };
  scalarVars: ScalarVar[];
  tableColumns: TableColumnVar[];
  preview: {
    scalars: Record<string, string>;
    dong: PreviewRow[];
    tong: { khoi_luong: number; truoc_thue: number };
  };
};

type Tab = "cach-lam" | "bien" | "xem-truoc";

export function QuoteTemplateScreen({ initial }: { initial: Bundle }) {
  const [bundle, setBundle] = useState(initial);
  const [tab, setTab] = useState<Tab>("cach-lam");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh(action: () => Promise<Bundle>) {
    setBusy(true);
    setError("");
    try {
      setBundle(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Chọn file .xlsx trước.");
      return;
    }
    void refresh(async () => {
      const body = new FormData();
      body.set("file", file);
      if (name.trim()) body.set("name", name.trim());
      const result = await callApi<Bundle>("/api/cai-dat/bieu-mau-bao-gia", { method: "POST", body });
      if (fileRef.current) fileRef.current.value = "";
      setName("");
      return result;
    });
  }

  const active = bundle.active;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className={cn(panelClass, "p-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Mẫu đang dùng</p>
            {active ? (
              <>
                <p className="mt-1 text-base font-medium text-ink">{active.name}</p>
                <p className="mt-1 text-xs text-muted">
                  File: {active.fileName} · Sheet: {active.sheetName}
                  {active.size ? ` · ${formatCount(active.size)} byte` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">Chưa có mẫu.</p>
            )}
          </div>
          {active ? (
            <a
              href={`/api/cai-dat/bieu-mau-bao-gia/${active.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink hover:bg-soft"
            >
              <Download className="size-4" aria-hidden /> Tải Excel gốc
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input value={name} placeholder="Tên mẫu mới (tuỳ chọn)" disabled={busy} onChange={(event) => setName(event.target.value)} />
          <input ref={fileRef} type="file" accept=".xlsx" className="text-sm" disabled={busy} aria-label="Chọn file Excel mẫu" />
          <Button type="button" size="sm" disabled={busy} onClick={upload}>
            <Upload className="size-4" aria-hidden /> Tải lên & dùng
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">Tải lên mẫu mới sẽ đặt làm mẫu đang dùng. Layout biến vẫn theo chuẩn sheet 2212 (ô C3, F3… và bảng từ dòng 11).</p>
      </div>

      {bundle.templates.length > 1 ? (
        <div className={cn(panelClass, "overflow-x-auto")}>
          <Table>
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead>Tên mẫu</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Sheet</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.templates.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-sm text-muted">{row.fileName}</TableCell>
                  <TableCell>
                    <Input
                      defaultValue={row.sheetName}
                      key={`${row.id}-${row.sheetName}`}
                      disabled={busy}
                      className="h-8 w-28"
                      aria-label={`Sheet ${row.name}`}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next === row.sheetName) return;
                        void refresh(() =>
                          callApi<Bundle>(`/api/cai-dat/bieu-mau-bao-gia/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ sheetName: next, note: row.note }),
                          }),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{row.active ? "Đang dùng" : "Không dùng"}</TableCell>
                  <TableCell className="text-right">
                    {!row.active ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void refresh(() =>
                            callApi<Bundle>(`/api/cai-dat/bieu-mau-bao-gia/${row.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ active: true }),
                            }),
                          )
                        }
                      >
                        Dùng mẫu này
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Hiện hành</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["cach-lam", "Cách làm mẫu & biến"],
            ["bien", "Danh sách biến"],
            ["xem-truoc", "Xem trước đổ dữ liệu"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              tab === id ? "border-primary bg-primary/10 font-medium text-primary" : "border-line bg-white text-ink hover:bg-soft",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cach-lam" ? (
        <div className={cn(panelClass, "space-y-3 p-4 text-sm text-ink")}>
          <p className="flex items-center gap-2 font-semibold">
            <FileSpreadsheet className="size-4 text-primary" aria-hidden /> Giữ nguyên file Excel làm gốc
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-muted">
            <li>
              File mẫu nằm ở <code className="text-ink">templates/bao-gia/hang-muc-mau.xlsx</code> (và bản đang dùng trong{" "}
              <code className="text-ink">storage/bieu-mau/…</code>).
            </li>
            <li>
              Phần đầu (Bên A/B, công trình, ngày…) là <strong className="font-medium text-ink">biến đơn</strong> — mỗi biến một ô cố định (vd{" "}
              <code className="text-ink">ben_a.ten → C3</code>).
            </li>
            <li>
              Bảng hạng mục là <strong className="font-medium text-ink">biến khối `dong[]`</strong> — bắt đầu dòng {bundle.layout.bodyStartRow}. Mỗi phần tử một dòng; loại{" "}
              <code className="text-ink">nhom</code> (cộng nhóm) hoặc <code className="text-ink">chi_tiet</code>.
            </li>
            <li>
              Dòng <code className="text-ink">TỔNG CỘNG</code>, ghi chú, chữ ký là <strong className="font-medium text-ink">neo cuối</strong> — engine tìm theo chữ sau khi chèn đủ dòng bảng (vì số dòng thay đổi).
            </li>
            <li>Tiền tính ở service báo giá; mẫu chỉ nhận số đã có. Thiếu biến bắt buộc sẽ báo tên biến, không để trống âm thầm.</li>
          </ol>
        </div>
      ) : null}

      {tab === "bien" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={cn(panelClass, "overflow-x-auto")}>
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Biến đơn</p>
              <p className="text-xs text-muted">Ô cố định trên sheet {bundle.layout.defaultSheet}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-soft hover:bg-soft">
                  <TableHead>Biến</TableHead>
                  <TableHead>Ô / neo</TableHead>
                  <TableHead>Bắt buộc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.scalarVars.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>
                      <p className="font-medium text-ink">{item.label}</p>
                      <p className="font-mono text-xs text-muted">{item.key}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.cell}</TableCell>
                    <TableCell>{item.required ? "Có" : "Không"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className={cn(panelClass, "overflow-x-auto")}>
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-ink">Biến bảng `dong[]`</p>
              <p className="text-xs text-muted">
                Header dòng {bundle.layout.headerRow}–{bundle.layout.subHeaderRow}, body từ dòng {bundle.layout.bodyStartRow}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-soft hover:bg-soft">
                  <TableHead>Trường dòng</TableHead>
                  <TableHead>Cột Excel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <p className="font-medium">loai</p>
                    <p className="text-xs text-muted">nhom | chi_tiet — không ghi ô riêng, quyết định style dòng</p>
                  </TableCell>
                  <TableCell className="text-muted">—</TableCell>
                </TableRow>
                {bundle.tableColumns.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>
                      <p className="font-medium text-ink">{item.label}</p>
                      <p className="font-mono text-xs text-muted">{item.key}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.column}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {tab === "xem-truoc" ? (
        <div className={cn(panelClass, "overflow-x-auto p-4")}>
          <p className="text-sm font-semibold text-ink">Xem trước logic đổ (dữ liệu mẫu rút gọn)</p>
          <p className="mt-1 text-xs text-muted">Chưa ghi đè file Excel ở bước này — chỉ minh họa biến → giá trị.</p>
          <div className="mt-4 space-y-1 text-sm">
            <p>
              <span className="text-muted">Bên A:</span> {bundle.preview.scalars["ben_a.ten"]} · {bundle.preview.scalars["ben_a.dai_dien"]}
            </p>
            <p>
              <span className="text-muted">Bên B:</span> {bundle.preview.scalars["ben_b.ten"]} · {bundle.preview.scalars["ben_b.dai_dien"]}
            </p>
            <p>
              <span className="text-muted">Công trình:</span> {bundle.preview.scalars["cong_trinh.ten"]}
            </p>
            <p>
              <span className="text-muted">Ngày:</span> {bundle.preview.scalars["ngay_lap_chuoi"]}
            </p>
          </div>
          <table className="mt-4 w-full min-w-[52rem] border-collapse text-xs">
            <thead>
              <tr className="bg-[#067a9e] text-white">
                <th className="border border-line px-2 py-1.5">STT</th>
                <th className="border border-line px-2 py-1.5">KH</th>
                <th className="border border-line px-2 py-1.5">Chủng loại</th>
                <th className="border border-line px-2 py-1.5">ĐVT</th>
                <th className="border border-line px-2 py-1.5">W</th>
                <th className="border border-line px-2 py-1.5">H</th>
                <th className="border border-line px-2 py-1.5">SL</th>
                <th className="border border-line px-2 py-1.5">KL</th>
                <th className="border border-line px-2 py-1.5">Đơn giá</th>
                <th className="border border-line px-2 py-1.5">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {bundle.preview.dong.map((row, index) =>
                row.loai === "nhom" ? (
                  <tr key={`n-${index}`} className="bg-soft font-semibold">
                    <td className="border border-line px-2 py-1" colSpan={3}>
                      {row.chung_loai}
                    </td>
                    <td className="border border-line px-2 py-1" colSpan={4} />
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{row.khoi_luong.toFixed(2)}</td>
                    <td className="border border-line px-2 py-1" />
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{formatCount(row.thanh_tien)}</td>
                  </tr>
                ) : (
                  <tr key={`c-${index}`}>
                    <td className="border border-line px-2 py-1 text-right">{row.stt}</td>
                    <td className="border border-line px-2 py-1">{row.ky_hieu}</td>
                    <td className="border border-line px-2 py-1">{row.chung_loai}</td>
                    <td className="border border-line px-2 py-1">{row.don_vi}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{row.rong}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{row.cao}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{row.so_luong}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{row.khoi_luong.toFixed(2)}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{formatCount(row.don_gia)}</td>
                    <td className="border border-line px-2 py-1 text-right tabular-nums">{formatCount(row.thanh_tien)}</td>
                  </tr>
                ),
              )}
              <tr className="bg-soft font-bold">
                <td className="border border-line px-2 py-1.5" colSpan={3}>
                  TỔNG CỘNG (TRƯỚC THUẾ)
                </td>
                <td className="border border-line px-2 py-1.5" colSpan={4} />
                <td className="border border-line px-2 py-1.5 text-right tabular-nums">{bundle.preview.tong.khoi_luong.toFixed(2)}</td>
                <td className="border border-line px-2 py-1.5" />
                <td className="border border-line px-2 py-1.5 text-right tabular-nums">{formatCount(bundle.preview.tong.truoc_thue)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Ghi chú: {bundle.preview.scalars["ghi_chu"]}</p>
        </div>
      ) : null}
    </div>
  );
}
