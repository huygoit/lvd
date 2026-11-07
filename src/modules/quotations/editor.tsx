"use client";

import { Copy, Plus, Save, Trash2, X } from "lucide-react";

import { useEffect, useMemo, useRef, useState, type PointerEvent as SuKienChuot } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { listPanelClass } from "@/shared/components/action-badge";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { addDays, dayCount, formatYmd } from "@/shared/lib/dates";
import { digitsVnd, formatCount, formatVnd } from "@/shared/lib/money";
import { customerFollowLabel } from "@/modules/customers/labels";
import { withChuaVatNote } from "@/modules/quotations/document";
import { QuoteStatusBadges } from "@/modules/quotations/quote-sheet";
import {
  applyTax,
  areaFromSizeMilli,
  formatAreaMilli,
  priceItem,
  taxSelectToBps,
  taxSelectValue,
  type ItemInput,
} from "@/modules/quotations/calc";
import { isMeasureUnit, measureUnits } from "@/shared/catalog/units";
import { nhanVatPercent, vatPercents } from "@/shared/catalog/vat";

// px-0 để chữ/số trong ô thẳng hàng với tiêu đề (padding nằm ở th/td).
const cell =
  "w-full rounded-md border border-transparent bg-transparent px-0 py-1.5 text-sm leading-5 text-ink outline-none placeholder:text-muted/70 hover:border-line focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";
const caoToiThieu = 58;
const NOTICE_MS = 1500;
const NOTICE_KEY = "lvd-bao-gia-flash";

type FlashNotice = { text: string; until: number };

function readFlash(): FlashNotice | null {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FlashNotice;
    if (!data?.text || !data.until || data.until <= Date.now()) {
      sessionStorage.removeItem(NOTICE_KEY);
      return null;
    }
    return data;
  } catch {
    sessionStorage.removeItem(NOTICE_KEY);
    return null;
  }
}

function writeFlash(text: string) {
  const payload: FlashNotice = { text, until: Date.now() + NOTICE_MS };
  sessionStorage.setItem(NOTICE_KEY, JSON.stringify(payload));
  return payload;
}

type Line = {
  key: string;
  sourceItemId: string | null;
  /** nhom = dòng nhóm; chỉ sửa nội dung, KL/thành tiền = tổng các dòng item phía sau. */
  kind: "item" | "nhom";
  positionCode: string;
  name: string;
  unit: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  /** Khối lượng nhập tay (m²). Rỗng = tính từ rộng × cao × SL. */
  areaOverride: string;
  mainUnitPrice: string;
};

export type EditorItem = {
  id: string;
  sourceItemId: string | null;
  calcMethod: string;
  positionCode: string;
  name: string;
  unit: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  areaOverrideMilli: number | null;
  mainUnitPrice: number;
  pretax: number;
};

export type EditorVersion = {
  id: string;
  number: number;
  revision: number;
  title: string;
  quoteDate: string;
  validUntil: string;
  authorId: string;
  ownerId: string;
  internalStatus: string;
  customerStatus: string;
  constructionTime: string;
  internalNote: string;
  quoteNote: string;
  taxBps: number;
  warrantyMonths: number;
  advanceAmount: number;
  advanceDays: number;
  paymentDays: number;
  changeReason: string;
  items: EditorItem[];
  files: { id: string; fileName: string; size: number; locked: boolean }[];
  approvals: { id: string; action: string; reason: string; actorId: string; createdAt: string }[];
  deliveries: { id: string; channel: string; recipientName: string; note: string; sentAt: string }[];
  responses: { id: string; status: string; occurredOn: string; confirmerName: string; note: string }[];
};

type Flags = {
  edit: boolean;
  submit: boolean;
  withdraw: boolean;
  approve: boolean;
  requestChange: boolean;
  deliver: boolean;
  respond: boolean;
  version: boolean;
  copy: boolean;
  exception: boolean;
};

function blankLine(unit = "m2"): Line {
  return {
    key: crypto.randomUUID(),
    sourceItemId: null,
    kind: "item",
    positionCode: "",
    name: "",
    unit,
    widthMm: "",
    heightMm: "",
    quantity: "1",
    areaOverride: "",
    mainUnitPrice: "",
  };
}

/** Nhân đôi dòng — key mới, không giữ sourceItemId. */
function cloneLine(source: Line): Line {
  return {
    ...source,
    key: crypto.randomUUID(),
    sourceItemId: null,
  };
}

function blankGroup(): Line {
  return {
    key: crypto.randomUUID(),
    sourceItemId: null,
    kind: "nhom",
    positionCode: "",
    name: "",
    unit: "bộ",
    widthMm: "",
    heightMm: "",
    quantity: "",
    areaOverride: "",
    mainUnitPrice: "",
  };
}

function fromItem(item: EditorItem): Line {
  if (item.calcMethod === "nhom") {
    return {
      key: item.id,
      sourceItemId: item.sourceItemId,
      kind: "nhom",
      positionCode: "",
      name: item.name,
      unit: "bộ",
      widthMm: "",
      heightMm: "",
      quantity: "",
      areaOverride: "",
      mainUnitPrice: "",
    };
  }
  return {
    key: item.id,
    sourceItemId: item.sourceItemId,
    kind: "item",
    positionCode: item.positionCode,
    name: item.name,
    unit: item.unit || "m2",
    widthMm: item.areaOverrideMilli != null ? "" : item.widthMm ? String(item.widthMm) : "",
    heightMm: item.areaOverrideMilli != null ? "" : item.heightMm ? String(item.heightMm) : "",
    quantity: item.areaOverrideMilli != null ? "" : String(item.quantity),
    areaOverride: item.areaOverrideMilli != null ? formatAreaMilli(item.areaOverrideMilli) : "",
    mainUnitPrice: item.mainUnitPrice ? formatCount(item.mainUnitPrice) : "",
  };
}

function money(value: string) {
  // Chỉ lấy chữ số — chịu được format 1.500.000 hoặc khoảng trắng hiếm.
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function whole(value: string, label: string) {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label} phải là số nguyên.`);
  return Number(value.trim());
}

function parseArea(value: string): number | null {
  const raw = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!raw) return null;
  const so = Number(raw);
  if (!Number.isFinite(so) || so < 0) throw new Error("Khối lượng không hợp lệ.");
  return so;
}

function toInput(line: Line): ItemInput {
  const override = line.areaOverride.trim() ? parseArea(line.areaOverride) : null;
  const hasOverride = override !== null && override > 0;
  return {
    name: line.name.trim(),
    unit: line.unit.trim() || "m2",
    widthMm: hasOverride ? null : line.widthMm.trim() ? whole(line.widthMm, "Chiều rộng") : null,
    heightMm: hasOverride ? null : line.heightMm.trim() ? whole(line.heightMm, "Chiều cao") : null,
    // Có khối lượng tay thì số lượng để 0 — thành tiền = khối lượng × đơn giá.
    quantity: hasOverride ? 0 : whole(line.quantity || "0", "Số lượng"),
    mainUnitPrice: money(line.mainUnitPrice),
    accessoryUnitPrice: 0,
    areaOverride: hasOverride ? override : null,
  };
}

function hienKhoiLuong(line: Line) {
  if (line.areaOverride.trim()) return line.areaOverride;
  const w = line.widthMm.trim() ? Number(line.widthMm) : 0;
  const h = line.heightMm.trim() ? Number(line.heightMm) : 0;
  const q = line.quantity.trim() ? Number(line.quantity) : 0;
  if (!w || !h || !q || !Number.isFinite(w) || !Number.isFinite(h) || !Number.isFinite(q)) return "";
  return formatAreaMilli(areaFromSizeMilli(w, h, q));
}

export function QuoteEditor({
  quoteId,
  code,
  customerName,
  projectName,
  version,
  versions,
  customers,
  projects,
  flags,
  today,
  sheet = false,
}: {
  quoteId: string;
  code: string;
  customerName: string;
  projectName: string;
  version: EditorVersion;
  versions: { id: string; number: number }[];
  customers: { id: string; code: string; name: string }[];
  projects: { id: string; customerId: string; code: string; name: string }[];
  flags: Flags;
  today: string;
  sheet?: boolean;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>(version.items.length ? version.items.map(fromItem) : [blankLine()]);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const rowHeightsRef = useRef(rowHeights);
  rowHeightsRef.current = rowHeights;
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const ngungKeo = useRef<(() => void) | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Đọc lại flash sau refresh — tránh router.refresh() làm mất banner giữa chừng.
  const [notice, setNotice] = useState(() => readFlash()?.text ?? "");
  const [revision, setRevision] = useState(version.revision);
  const [panel, setPanel] = useState<"" | "duyet" | "sua" | "gui" | "phan-hoi" | "ban-moi" | "sao-chep">("");
  const [reason, setReason] = useState("");
  const [recipientName, setRecipientName] = useState(customerName);
  const [channel, setChannel] = useState("zalo");
  const [responseStatus, setResponseStatus] = useState("chap_thuan");
  const [occurredOn, setOccurredOn] = useState(today);
  const [confirmerName, setConfirmerName] = useState(customerName);
  const [responseNote, setResponseNote] = useState("");
  const [ngoaiLe, setNgoaiLe] = useState(false);
  const [thayThe, setThayThe] = useState(false);
  const [copyCustomer, setCopyCustomer] = useState(customers[0]?.id ?? "");
  const [copyProject, setCopyProject] = useState("");
  const [compare, setCompare] = useState<{ added: string[]; removed: string[]; changed: string[]; terms: string[]; delta: number } | null>(null);
  const [validityDays, setValidityDays] = useState(String(Math.max(dayCount(version.quoteDate, version.validUntil), 0)));
  const [meta, setMeta] = useState({
    constructionTime: version.constructionTime,
    internalNote: version.internalNote,
    quoteNote: version.quoteNote ?? "",
    taxPercent: taxSelectValue(version.taxBps),
    warrantyMonths: version.warrantyMonths ? String(version.warrantyMonths) : "",
    advanceAmount: version.advanceAmount > 0 ? formatCount(version.advanceAmount) : "",
    advanceDays: version.advanceAmount > 0 && version.advanceDays > 0 ? String(version.advanceDays) : "",
    paymentDays: version.paymentDays ? String(version.paymentDays) : "",
  });

  // Đồng bộ lại khi đổi phiên bản — không đè form đang gõ của cùng một bản.
  useEffect(() => {
    setRevision(version.revision);
    setValidityDays(String(Math.max(dayCount(version.quoteDate, version.validUntil), 0)));
    setMeta({
      constructionTime: version.constructionTime,
      internalNote: version.internalNote,
      quoteNote: version.quoteNote ?? "",
      taxPercent: taxSelectValue(version.taxBps),
      warrantyMonths: version.warrantyMonths ? String(version.warrantyMonths) : "",
      advanceAmount: version.advanceAmount > 0 ? formatCount(version.advanceAmount) : "",
      advanceDays: version.advanceAmount > 0 && version.advanceDays > 0 ? String(version.advanceDays) : "",
      paymentDays: version.paymentDays ? String(version.paymentDays) : "",
    });
  }, [version.id]);

  useEffect(() => {
    setRevision(version.revision);
  }, [version.revision]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  // Banner giữ đúng thời gian còn lại (kể cả sau refresh).
  useEffect(() => {
    if (!notice) return;
    const flash = readFlash();
    const left = flash && flash.text === notice ? flash.until - Date.now() : NOTICE_MS;
    if (left <= 0) {
      sessionStorage.removeItem(NOTICE_KEY);
      setNotice("");
      return;
    }
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(NOTICE_KEY);
      setNotice("");
    }, left);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function flashNotice(text: string) {
    writeFlash(text);
    setNotice(text);
  }

  function NoticeBanner() {
    if (!notice) return null;
    return (
      <p
        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm"
        role="status"
      >
        {notice}
      </p>
    );
  }

  const priced = useMemo(() => {
    type Row = {
      line: Line;
      error: string;
      money: number | null;
      areaMilli: number;
      method: string;
      stt: number | null;
    };
    const base: Row[] = lines.map((line) => {
      if (line.kind === "nhom") {
        return { line, error: "", money: null, areaMilli: 0, method: "nhom", stt: null };
      }
      const trong =
        !line.name.trim() &&
        !line.positionCode.trim() &&
        !line.widthMm.trim() &&
        !line.heightMm.trim() &&
        !line.areaOverride.trim() &&
        !line.mainUnitPrice.trim() &&
        (!line.quantity.trim() || line.quantity.trim() === "1");
      if (trong) return { line, error: "", money: null, areaMilli: 0, method: "", stt: null };
      try {
        const pricedLine = priceItem(toInput(line));
        const coTien =
          Boolean(line.mainUnitPrice.trim()) &&
          (Boolean(line.areaOverride.trim()) ||
            (Boolean(line.widthMm.trim()) && Boolean(line.heightMm.trim()) && Boolean(line.quantity.trim())) ||
            Boolean(line.quantity.trim()));
        return {
          line,
          error: "",
          money: coTien ? pricedLine.pretax : null,
          areaMilli: coTien ? pricedLine.areaMilli : 0,
          method: pricedLine.calcMethod === "dien_tich" ? "m²" : "bộ",
          stt: null,
        };
      } catch (caught) {
        return {
          line,
          error: caught instanceof Error ? caught.message : "Dòng chưa hợp lệ.",
          money: null,
          areaMilli: 0,
          method: "",
          stt: null,
        };
      }
    });

    // Gán STT cho dòng item; cộng khối lượng + thành tiền vào dòng nhóm phía trước.
    let stt = 0;
    const rows = base.map((row, index) => {
      if (row.line.kind === "nhom") {
        let areaMilli = 0;
        let money = 0;
        let coCon = false;
        for (let i = index + 1; i < base.length; i += 1) {
          if (base[i].line.kind === "nhom") break;
          if (base[i].money !== null) {
            coCon = true;
            money += base[i].money ?? 0;
            areaMilli += base[i].areaMilli;
          }
        }
        return {
          ...row,
          money: coCon ? money : null,
          areaMilli,
        };
      }
      stt += 1;
      return { ...row, stt };
    });

    // Tổng báo giá chỉ cộng dòng item — tránh cộng đôi với nhóm.
    const pretax = rows.reduce(
      (sum, row) => (row.line.kind === "nhom" ? sum : sum + (row.money ?? 0)),
      0,
    );
    try {
      return { rows, totals: applyTax(pretax, taxSelectToBps(meta.taxPercent)), taxError: "" };
    } catch (caught) {
      return { rows, totals: applyTax(pretax, -1), taxError: caught instanceof Error ? caught.message : "Thuế suất chưa hợp lệ." };
    }
  }, [lines, meta.taxPercent]);

  function patchLine(key: string, patch: Partial<Line>) {
    setDirty(true);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  // Chèn bản sao ngay dưới dòng đang đứng (cách B).
  function duplicateLine(key: string) {
    setDirty(true);
    setLines((current) => {
      const index = current.findIndex((line) => line.key === key);
      if (index < 0) return current;
      const next = [...current];
      next.splice(index + 1, 0, cloneLine(current[index]));
      return next;
    });
  }

  function keoCao(key: string, event: SuKienChuot<HTMLDivElement>) {
    event.preventDefault();
    const row = rowRefs.current[key];
    const o = row?.querySelector("textarea");
    const startY = event.clientY;
    const startH = rowHeightsRef.current[key] ?? o?.getBoundingClientRect().height ?? caoToiThieu;
    function move(ev: PointerEvent) {
      const next = Math.max(caoToiThieu, Math.round(startH + ev.clientY - startY));
      const heights = { ...rowHeightsRef.current, [key]: next };
      rowHeightsRef.current = heights;
      setRowHeights(heights);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (ngungKeo.current === up) ngungKeo.current = null;
    }
    ngungKeo.current?.();
    ngungKeo.current = up;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function payload(revision: number) {
    return {
      versionId: version.id,
      revision,
      constructionTime: meta.constructionTime,
      internalNote: meta.internalNote,
      quoteNote: meta.quoteNote,
      // Server tự cộng ngày hiệu lực từ ngày báo giá — tránh lỗi lệch ngày client.
      validityDays: whole(validityDays || "0", "Số ngày hiệu lực"),
      taxPercent: meta.taxPercent === "chua" ? -1 : Number(meta.taxPercent || 0),
      warrantyMonths: meta.warrantyMonths.trim() ? whole(meta.warrantyMonths, "Số tháng bảo hành") : 0,
      advanceAmount: money(meta.advanceAmount),
      advanceDays:
        money(meta.advanceAmount) > 0 && meta.advanceDays.trim()
          ? whole(meta.advanceDays, "Số ngày tạm ứng")
          : 0,
      paymentDays: meta.paymentDays.trim() ? whole(meta.paymentDays, "Số ngày thanh toán sau nghiệm thu") : 0,
      items: lines
        .filter((line) => line.name.trim())
        .map((line) => {
          if (line.kind === "nhom") {
            return {
              name: line.name.trim(),
              quantity: 0,
              mainUnitPrice: 0,
              accessoryUnitPrice: 0,
              sourceItemId: line.sourceItemId,
              positionCode: "",
              calcMethod: "nhom" as const,
            };
          }
          return {
            ...toInput(line),
            sourceItemId: line.sourceItemId,
            positionCode: line.positionCode.trim(),
            calcMethod: undefined,
          };
        }),
    };
  }

  async function persist(currentRevision: number) {
    const saved = await callApi<{ revision: number }>(`/api/bao-gia/${quoteId}`, {
      method: "PUT",
      body: JSON.stringify(payload(currentRevision)),
    });
    setRevision(saved.revision);
    setDirty(false);
    return saved.revision;
  }

  async function act(action: string, extra: Record<string, unknown> = {}, saveFirst = false) {
    setBusy(true);
    setError("");
    try {
      const nextRevision = saveFirst ? await persist(revision) : revision;
      const result = await callApi<{ id?: string; versionId?: string }>(`/api/bao-gia/${quoteId}/hanh-dong`, {
        method: "POST",
        body: JSON.stringify({ action, versionId: version.id, revision: nextRevision, ...extra }),
      });
      setPanel("");
      if (action === "sao-chep" && result.id) {
        router.push(`/bao-gia?mo=sua&id=${result.id}`);
        return;
      }
      if (action === "phien-ban-moi" && result.versionId) {
        router.push(`/bao-gia?mo=sua&id=${quoteId}&v=${result.versionId}`);
      }
      flashNotice("Lưu thành công");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thực hiện được.");
    } finally {
      setBusy(false);
    }
  }

  async function saveOnly() {
    setBusy(true);
    setError("");
    try {
      await persist(revision);
      flashNotice("Lưu thành công");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("entityType", "phien_ban");
    form.set("entityId", version.id);
    setBusy(true);
    setError("");
    try {
      await callApi("/api/tep", { method: "POST", body: form });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải tệp được.");
    } finally {
      setBusy(false);
    }
  }

  const copyProjects = projects.filter((item) => item.customerId === copyCustomer);
  const actions = (
    <>
      {flags.edit ? (
        <button type="button" className={buttonGhost} disabled={busy} onClick={saveOnly}>
          <Save className="size-4" aria-hidden /> Lưu nháp
        </button>
      ) : null}
      {flags.submit ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("gui-duyet", {}, true)}>
          <Save className="size-4" aria-hidden /> Lưu và gửi duyệt
        </button>
      ) : null}
      {flags.approve ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => setPanel("duyet")}>
          Duyệt
        </button>
      ) : null}
      {flags.withdraw && !flags.approve ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("rut-duyet")}>
          Rút về nháp
        </button>
      ) : null}
      {flags.deliver && version.customerStatus === "chua_gui" ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => setPanel("gui")}>
          Ghi đã gửi khách
        </button>
      ) : null}
      {flags.respond && version.customerStatus !== "chap_thuan" ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => setPanel("phan-hoi")}>
          Ghi phản hồi
        </button>
      ) : null}
      <Link
        href={`/in/bao-gia/${quoteId}?v=${version.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonGhost}
      >
        Xem báo giá PDF
      </Link>
    </>
  );

  const themHangMuc = flags.edit ? (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonGhost}
        onClick={() => {
          setDirty(true);
          setLines([...lines, blankGroup()]);
        }}
      >
        <Plus className="size-4" aria-hidden /> Thêm nhóm hạng mục
      </button>
      <button
        type="button"
        className={buttonGhost}
        onClick={() => {
          setDirty(true);
          setLines([...lines, blankLine()]);
        }}
      >
        <Plus className="size-4" aria-hidden /> Thêm dòng
      </button>
    </div>
  ) : null;

  const vatSelect = (
    <div className="min-w-[12.5rem]">
      <label className="mb-1 block text-[11px] font-semibold tracking-wide text-muted uppercase">
        Cấu hình thuế VAT
      </label>
      <select
        className={inputClass}
        value={meta.taxPercent}
        disabled={!flags.edit}
        aria-label="Cấu hình thuế VAT"
        onChange={(event) => {
          const taxPercent = event.target.value;
          setDirty(true);
          setMeta({
            ...meta,
            taxPercent,
            // Chọn chưa VAT thì tự chèn dòng ghi chú; bỏ chọn thì gỡ dòng đó.
            quoteNote: withChuaVatNote(meta.quoteNote, taxPercent === "chua"),
          });
        }}
      >
        <option value="chua">Báo giá chưa bao gồm VAT</option>
        {vatPercents.map((muc) => (
          <option key={muc} value={muc}>
            {nhanVatPercent(muc)}
          </option>
        ))}
      </select>
    </div>
  );

  const nhanThueGtgt =
    meta.taxPercent === "chua" ? "Thuế GTGT" : `Thuế GTGT (${meta.taxPercent}%)`;

  return (
    <>
    {sheet ? (
      <SheetHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle>
                {code} · phiên bản {version.number}
              </SheetTitle>
              <QuoteStatusBadges
                internalStatus={version.internalStatus}
                customerStatus={version.customerStatus}
              />
            </div>
            <SheetDescription>
              {customerName} · {projectName}
            </SheetDescription>
          </div>
          {vatSelect}
        </div>
      </SheetHeader>
    ) : null}
    <div className={sheet ? "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" : "space-y-4"}>
      {sheet ? null : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Link href="/bao-gia" className="text-sm font-semibold text-primary">
              Báo giá
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold text-ink">
                {code} · phiên bản {version.number}
              </h1>
              <QuoteStatusBadges
                internalStatus={version.internalStatus}
                customerStatus={version.customerStatus}
              />
            </div>
            <p className="text-sm text-muted">
              {customerName} · {projectName}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {vatSelect}
            <NoticeBanner />
            <div className="flex flex-wrap gap-2">{actions}</div>
          </div>
        </div>
      )}
      {versions.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {versions.map((item) => (
            <Link
              key={item.id}
              href={`/bao-gia?mo=sua&id=${quoteId}&v=${item.id}`}
              className={item.id === version.id ? buttonPrimary : buttonGhost}
              onClick={(event) => {
                if (dirty && !window.confirm("Bản đang sửa chưa lưu. Bỏ thay đổi?")) event.preventDefault();
              }}
            >
              Phiên bản {item.number}
            </Link>
          ))}
        </div>
      ) : null}
      {version.changeReason ? <p className="text-sm text-muted">Lý do phiên bản: {version.changeReason}</p> : null}
      {error ? <p className="rounded-[12px] bg-red-50 px-3 py-2 text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Hạng mục</h2>
            <p className="mt-0.5 text-xs text-muted">
              {version.title || "—"}
              {" · "}Khối lượng = rộng × cao × số lượng ÷ 1.000.000. Nhập khối lượng tay sẽ xóa rộng/cao.
            </p>
          </div>
          {themHangMuc}
        </div>
        <div className={listPanelClass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] table-fixed border-collapse text-sm">
              <thead>
                <tr className="bg-soft text-xs text-muted">
                  <th className="w-12 px-2 py-2.5 text-center font-medium">STT</th>
                  <th className="w-24 px-2 py-2.5 text-left font-medium">Ký hiệu</th>
                  <th className="w-[22%] px-2 py-2.5 text-left font-medium">Nội dung</th>
                  <th className="w-24 px-2 py-2.5 text-left font-medium">Đơn vị tính</th>
                  <th className="w-24 px-2 py-2.5 text-right font-medium">Rộng (mm)</th>
                  <th className="w-24 px-2 py-2.5 text-right font-medium">Cao (mm)</th>
                  <th className="w-20 px-2 py-2.5 text-right font-medium">Số lượng</th>
                  <th className="w-32 px-2 py-2.5 text-right font-medium">Khối lượng (m2)</th>
                  <th className="w-32 px-2 py-2.5 text-right font-medium">Đơn giá</th>
                  <th className="w-36 px-2 py-2.5 text-right font-medium">Thành tiền</th>
                  {flags.edit ? <th className="w-20 px-1 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {priced.rows.map((row, index) => {
                  const hopCao = rowHeights[row.line.key] ? { height: rowHeights[row.line.key] } : undefined;
                  const laNhom = row.line.kind === "nhom";
                  return (
                    <tr
                      key={row.line.key}
                      ref={(node) => {
                        rowRefs.current[row.line.key] = node;
                      }}
                      className={
                        laNhom
                          ? "relative border-t border-line bg-soft/70"
                          : "relative border-t border-line/70"
                      }
                    >
                      <td className="relative px-2 py-1.5 text-center align-top tabular-nums text-muted">
                        {/* Cùng padding/leading với ô nhập để STT thẳng hàng dòng value. */}
                        {laNhom ? (
                          <span className="block py-1.5 leading-5">&nbsp;</span>
                        ) : (
                          <span className={`${cell} inline-flex items-center justify-center text-muted`}>
                            {row.stt ?? ""}
                          </span>
                        )}
                        {flags.edit ? (
                          <div
                            role="separator"
                            aria-orientation="horizontal"
                            aria-label="Kéo để đổi chiều cao hàng"
                            onPointerDown={(event) => keoCao(row.line.key, event)}
                            className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-ns-resize hover:bg-primary/40"
                          />
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-left align-top">
                        {laNhom ? (
                          <span className="block py-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Nhóm</span>
                        ) : (
                          <input
                            className={`${cell} text-left`}
                            value={row.line.positionCode}
                            disabled={!flags.edit}
                            placeholder="D1, S1…"
                            aria-label={`Ký hiệu dòng ${index + 1}`}
                            onChange={(event) => patchLine(row.line.key, { positionCode: event.target.value })}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-left align-top" colSpan={laNhom ? 5 : 1}>
                        {laNhom ? (
                          <input
                            className={`${cell} text-left font-semibold`}
                            value={row.line.name}
                            disabled={!flags.edit}
                            placeholder="Tên nhóm hạng mục…"
                            aria-label={`Tên nhóm ${index + 1}`}
                            onChange={(event) => patchLine(row.line.key, { name: event.target.value })}
                          />
                        ) : (
                          <textarea
                            className={`${cell} min-h-[3.25rem] resize-none overflow-y-auto text-left`}
                            rows={2}
                            value={row.line.name}
                            disabled={!flags.edit}
                            placeholder="Cửa đi 2 cánh, nhôm hệ 55…"
                            aria-label={`Nội dung dòng ${index + 1}`}
                            style={hopCao}
                            onChange={(event) => patchLine(row.line.key, { name: event.target.value })}
                          />
                        )}
                        {row.error ? <p className="mt-1 text-left text-xs text-danger">{row.error}</p> : null}
                      </td>
                      {laNhom ? null : (
                        <>
                          <td className="px-2 py-1.5 text-left align-top">
                            <select
                              className={`${cell} text-left`}
                              value={row.line.unit}
                              disabled={!flags.edit}
                              aria-label={`Đơn vị dòng ${index + 1}`}
                              onChange={(event) => patchLine(row.line.key, { unit: event.target.value })}
                            >
                              {row.line.unit && !isMeasureUnit(row.line.unit) ? (
                                <option value={row.line.unit}>{row.line.unit}</option>
                              ) : null}
                              {measureUnits.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right align-top">
                            <input
                              className={`${cell} text-right tabular-nums`}
                              inputMode="numeric"
                              value={row.line.widthMm}
                              disabled={!flags.edit}
                              placeholder="mm"
                              aria-label={`Rộng dòng ${index + 1}`}
                              onChange={(event) =>
                                patchLine(row.line.key, {
                                  widthMm: event.target.value.replace(/\D/g, ""),
                                  areaOverride: "",
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right align-top">
                            <input
                              className={`${cell} text-right tabular-nums`}
                              inputMode="numeric"
                              value={row.line.heightMm}
                              disabled={!flags.edit}
                              placeholder="mm"
                              aria-label={`Cao dòng ${index + 1}`}
                              onChange={(event) =>
                                patchLine(row.line.key, {
                                  heightMm: event.target.value.replace(/\D/g, ""),
                                  areaOverride: "",
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right align-top">
                            <input
                              className={`${cell} text-right tabular-nums`}
                              inputMode="numeric"
                              value={row.line.quantity}
                              disabled={!flags.edit}
                              aria-label={`Số lượng dòng ${index + 1}`}
                              onChange={(event) =>
                                patchLine(row.line.key, {
                                  quantity: event.target.value.replace(/\D/g, ""),
                                })
                              }
                            />
                          </td>
                        </>
                      )}
                      <td className="px-2 py-1.5 text-right align-top">
                        {laNhom ? (
                          <span className="block py-1.5 font-semibold tabular-nums">
                            {row.areaMilli > 0 ? formatAreaMilli(row.areaMilli) : "—"}
                          </span>
                        ) : (
                          <input
                            className={`${cell} text-right tabular-nums`}
                            inputMode="decimal"
                            value={hienKhoiLuong(row.line)}
                            disabled={!flags.edit}
                            placeholder="m²"
                            aria-label={`Khối lượng dòng ${index + 1}`}
                            onChange={(event) =>
                              patchLine(row.line.key, {
                                areaOverride: event.target.value,
                                widthMm: "",
                                heightMm: "",
                                quantity: "",
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top">
                        {laNhom ? (
                          <span className="block py-1.5 text-muted">—</span>
                        ) : (
                          <input
                            className={`${cell} text-right tabular-nums`}
                            inputMode="numeric"
                            value={row.line.mainUnitPrice}
                            disabled={!flags.edit}
                            placeholder="0"
                            aria-label={`Đơn giá dòng ${index + 1}`}
                            onChange={(event) => {
                              const digits = digitsVnd(event.target.value);
                              patchLine(row.line.key, {
                                mainUnitPrice: digits ? formatCount(Number(digits)) : "",
                              });
                            }}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right align-top font-semibold tabular-nums leading-5 whitespace-nowrap">
                        <span className="block py-1.5">{row.money === null ? "—" : formatCount(row.money)}</span>
                      </td>
                      {flags.edit ? (
                        <td className="px-1 py-1.5 text-center align-top">
                          <div className="inline-flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              className="inline-flex h-8 items-center justify-center px-1 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-35"
                              title={laNhom ? "Không sao chép dòng nhóm" : "Sao chép dòng xuống dưới"}
                              aria-label={laNhom ? "Không sao chép dòng nhóm" : `Sao chép dòng ${index + 1}`}
                              disabled={laNhom}
                              onClick={() => duplicateLine(row.line.key)}
                            >
                              <Copy className="size-4" aria-hidden />
                            </button>
                            {lines.length > 1 ? (
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center px-1 text-sm font-medium text-danger"
                                title="Xóa dòng"
                                aria-label={`Xóa dòng ${index + 1}`}
                                onClick={() => {
                                  setDirty(true);
                                  setLines(lines.filter((line) => line.key !== row.line.key));
                                }}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {priced.taxError ? (
                  <tr className="border-t border-line">
                    <td colSpan={flags.edit ? 11 : 10} className="px-2 py-2 text-sm text-danger">
                      {priced.taxError}
                    </td>
                  </tr>
                ) : null}
                {priced.totals.retail ? (
                  <>
                    <tr className="border-t border-line bg-soft/60">
                      <td colSpan={9} className="px-2 py-2.5 text-right text-sm font-semibold text-ink">
                        Tổng cộng (trước thuế)
                      </td>
                      <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-ink">
                        {formatCount(priced.totals.pretax)}
                      </td>
                      {flags.edit ? <td /> : null}
                    </tr>
                    <tr>
                      <td colSpan={flags.edit ? 11 : 10} className="px-2 pb-2.5 text-xs font-medium text-muted">
                        Báo giá chưa bao gồm VAT
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="border-t border-line bg-soft/40">
                      <td colSpan={9} className="px-2 py-2 text-right text-sm text-muted">
                        Tổng cộng (trước thuế)
                      </td>
                      <td className="px-2 py-2 text-right text-sm tabular-nums text-ink">
                        {formatCount(priced.totals.pretax)}
                      </td>
                      {flags.edit ? <td /> : null}
                    </tr>
                    <tr className="bg-soft/40">
                      <td colSpan={9} className="px-2 py-2 text-right text-sm text-muted">
                        {nhanThueGtgt}
                      </td>
                      <td className="px-2 py-2 text-right text-sm tabular-nums text-ink">
                        {formatCount(priced.totals.tax)}
                      </td>
                      {flags.edit ? <td /> : null}
                    </tr>
                    <tr className="border-t border-line bg-soft/60">
                      <td colSpan={9} className="px-2 py-2.5 text-right text-sm font-semibold text-ink">
                        Tổng cộng (đã gồm GTGT)
                      </td>
                      <td className="px-2 py-2.5 text-right text-sm font-semibold tabular-nums text-ink">
                        {formatCount(priced.totals.posttax)}
                      </td>
                      {flags.edit ? <td /> : null}
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[18px] border border-line bg-white p-4">
        <Field label="Ghi chú" hint="In ra khách ở mục Ghi chú trên bản báo giá.">
          <textarea
            className={`${inputClass} min-h-28 py-2`}
            value={meta.quoteNote}
            disabled={!flags.edit}
            placeholder="Nhập nội dung ghi chú gửi khách…"
            rows={4}
            onChange={(event) => {
              setDirty(true);
              setMeta({ ...meta, quoteNote: event.target.value });
            }}
          />
        </Field>
      </section>

      <details className="rounded-[18px] border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Điều kiện thương mại</summary>
        <p className="mt-1 text-xs text-muted">Các ô số trống hoặc 0 được hiểu là không áp dụng khi in. Điều khoản chữ sinh tự động khi lưu.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            label="Hiệu lực (số ngày)"
            hint={
              /^\d+$/.test(validityDays.trim()) && Number(validityDays) > 0
                ? `Đến hết ${formatYmd(addDays(version.quoteDate, Number(validityDays)))}`
                : "Nhập số ngày (vd 15), không nhập ngày tháng. Để 0 thì không ghi hạn."
            }
          >
            <input
              className={inputClass}
              inputMode="numeric"
              value={validityDays}
              disabled={!flags.edit}
              onChange={(event) => {
                setDirty(true);
                setValidityDays(event.target.value.replace(/\D/g, "").slice(0, 4));
              }}
            />
          </Field>
          <Field label="Thời gian thi công">
            <input
              className={inputClass}
              value={meta.constructionTime}
              disabled={!flags.edit}
              placeholder="15 ngày kể từ ngày ký"
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, constructionTime: event.target.value });
              }}
            />
          </Field>
          <Field label="Bảo hành (tháng)" hint="Để trống hoặc 0 thì in câu không áp dụng bảo hành.">
            <input
              className={inputClass}
              inputMode="numeric"
              value={meta.warrantyMonths}
              disabled={!flags.edit}
              placeholder="12"
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, warrantyMonths: event.target.value.replace(/\D/g, "").slice(0, 3) });
              }}
            />
          </Field>
          <Field label="Tạm ứng (đồng)" hint="Để trống nếu không thu tạm ứng.">
            <input
              className={inputClass}
              inputMode="numeric"
              value={meta.advanceAmount}
              disabled={!flags.edit}
              placeholder="0"
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, advanceAmount: digitsVnd(event.target.value) });
              }}
            />
          </Field>
          <Field label="Tạm ứng trong (ngày làm việc)" hint="Chỉ dùng khi có tiền tạm ứng.">
            <input
              className={inputClass}
              inputMode="numeric"
              value={meta.advanceDays}
              disabled={!flags.edit || !meta.advanceAmount.trim()}
              placeholder="3"
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, advanceDays: event.target.value.replace(/\D/g, "").slice(0, 3) });
              }}
            />
          </Field>
          <Field label="Thanh toán sau nghiệm thu (ngày)">
            <input
              className={inputClass}
              inputMode="numeric"
              value={meta.paymentDays}
              disabled={!flags.edit}
              placeholder="7"
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, paymentDays: event.target.value.replace(/\D/g, "").slice(0, 3) });
              }}
            />
          </Field>
          <Field label="Ghi chú nội bộ" hint="Không in ra khách.">
            <input
              className={inputClass}
              value={meta.internalNote}
              disabled={!flags.edit}
              onChange={(event) => {
                setDirty(true);
                setMeta({ ...meta, internalNote: event.target.value });
              }}
            />
          </Field>
        </div>
      </details>

      <details className="rounded-[18px] border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          <span className="inline-flex w-[calc(100%-1.25rem)] items-center justify-between gap-3 align-middle">
            <span>Tệp đính kèm{version.files.length ? ` (${version.files.length})` : ""}</span>
            {flags.edit || flags.deliver ? (
              <label
                className={buttonGhost}
                onClick={(event) => event.stopPropagation()}
              >
                Thêm tệp
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => upload(event.target.files?.[0])}
                />
              </label>
            ) : null}
          </span>
        </summary>
        <ul className="mt-3 space-y-1 text-sm">
          {version.files.length === 0 ? <li className="text-muted">Chưa có tệp.</li> : null}
          {version.files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2">
              <a className="font-medium text-primary" href={`/api/tep/${file.id}`}>{file.fileName}</a>
              {file.locked || !flags.edit ? <span className="text-xs text-muted">{file.locked ? "Đã khóa" : ""}</span> : (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-medium text-danger"
                  onClick={async () => {
                  try {
                    await callApi(`/api/tep/${file.id}`, { method: "DELETE" });
                    router.refresh();
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Không xóa được tệp.");
                  }
                }}
                >
                  <Trash2 className="size-4 shrink-0" aria-hidden />
                  Xóa
                </button>
              )}
            </li>
          ))}
        </ul>
      </details>

      <details className="rounded-[18px] border border-line bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Thao tác khác và lịch sử</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {flags.withdraw && flags.approve ? <button type="button" className={buttonGhost} onClick={() => act("rut-duyet")}>Rút về nháp</button> : null}
          {flags.requestChange ? <button type="button" className={buttonGhost} onClick={() => setPanel("sua")}>Yêu cầu chỉnh</button> : null}
          {flags.deliver && version.customerStatus !== "chua_gui" ? <button type="button" className={buttonGhost} onClick={() => setPanel("gui")}>Ghi thêm lần gửi</button> : null}
          {flags.version ? <button type="button" className={buttonGhost} onClick={() => setPanel("ban-moi")}>Phiên bản mới</button> : null}
          {flags.copy ? <button type="button" className={buttonGhost} onClick={() => setPanel("sao-chep")}>Sao chép sang hồ sơ khác</button> : null}
          {flags.edit ? <button type="button" className={buttonGhost} onClick={() => act("cap-nhat-nguon", {}, dirty)}>Lấy lại tên khách và công trình</button> : null}
        </div>
        {versions.some((item) => item.number === version.number - 1) ? (
          <button
            type="button"
            className={`${buttonGhost} mt-3`}
            onClick={async () => {
              const previous = versions.find((item) => item.number === version.number - 1);
              if (!previous) return;
              try {
                const result = await callApi<{ added: string[]; removed: string[]; changed: string[]; terms: string[]; delta: number }>(
                  `/api/bao-gia/${quoteId}/so-sanh?trai=${previous.id}&phai=${version.id}`,
                );
                setCompare(result);
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : "Không so sánh được.");
              }
            }}
          >
            So với phiên bản liền trước
          </button>
        ) : null}
        {compare ? (
          <div className="mt-3 text-sm">
            <p>Chênh lệch tổng: {formatVnd(compare.delta)}</p>
            <p>Thêm: {compare.added.join(", ") || "không"}</p>
            <p>Bớt: {compare.removed.join(", ") || "không"}</p>
            <p>Sửa: {compare.changed.join("; ") || "không"}</p>
            <p>Điều khoản: {compare.terms.join(", ") || "không đổi"}</p>
          </div>
        ) : null}
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {version.approvals.map((item) => <li key={item.id}>{item.action}{item.reason ? ` · ${item.reason}` : ""}</li>)}
          {version.deliveries.map((item) => <li key={item.id}>Đã gửi {item.recipientName} qua {item.channel}</li>)}
          {version.responses.map((item) => <li key={item.id}>{customerFollowLabel[item.status as keyof typeof customerFollowLabel] ?? item.status} ngày {item.occurredOn}</li>)}
        </ul>
      </details>

      {panel ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md space-y-3 rounded-[18px] bg-white p-5">
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {panel === "duyet" ? (
              <>
                <h2 className="text-lg font-semibold">Duyệt phiên bản này?</h2>
                <p className="text-sm text-muted">Sau khi duyệt không sửa trực tiếp. Muốn đổi phải tạo phiên bản mới.</p>
                <div className="flex gap-2">
                  <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("duyet")}>Duyệt</button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}><X className="size-4" aria-hidden /> Hủy</button>
                </div>
              </>
            ) : null}
            {panel === "sua" || panel === "ban-moi" ? (
              <>
                <h2 className="text-lg font-semibold">{panel === "sua" ? "Yêu cầu chỉnh sửa" : "Tạo phiên bản mới"}</h2>
                <Field label="Lý do">
                  <textarea className={`${inputClass} h-24 py-2`} value={reason} onChange={(event) => setReason(event.target.value)} />
                </Field>
                <div className="flex gap-2">
                  <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act(panel === "sua" ? "yeu-cau-sua" : "phien-ban-moi", { reason }, panel === "ban-moi" && dirty)}>
                    Xác nhận
                  </button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}><X className="size-4" aria-hidden /> Hủy</button>
                </div>
              </>
            ) : null}
            {panel === "gui" ? (
              <>
                <h2 className="text-lg font-semibold">Ghi nhận đã gửi</h2>
                <p className="text-sm text-muted">Hệ thống chỉ lưu lịch sử, không gửi email hay Zalo thật.</p>
                <Field label="Người nhận">
                  <input className={inputClass} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
                </Field>
                <Field label="Kênh">
                  <select className={inputClass} value={channel} onChange={(event) => setChannel(event.target.value)}>
                    <option value="zalo">Zalo</option>
                    <option value="email">Email</option>
                    <option value="giay">Bản giấy</option>
                    <option value="khac">Khác</option>
                  </select>
                </Field>
                <div className="flex gap-2">
                  <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("gui-khach", { recipientName, channel })}><Save className="size-4" aria-hidden /> Lưu lần gửi</button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}><X className="size-4" aria-hidden /> Hủy</button>
                </div>
              </>
            ) : null}
            {panel === "phan-hoi" ? (
              <>
                <h2 className="text-lg font-semibold">Phản hồi của khách</h2>
                <Field label="Kết quả">
                  <select className={inputClass} value={responseStatus} onChange={(event) => setResponseStatus(event.target.value)}>
                    <option value="chap_thuan">Chấp thuận</option>
                    <option value="dang_thuong_luong">Đang thương lượng</option>
                    <option value="tu_choi">Từ chối</option>
                  </select>
                </Field>
                <Field label="Ngày">
                  <NgayNhap className={inputClass} value={occurredOn} onChange={setOccurredOn} />
                </Field>
                <Field label="Người xác nhận">
                  <input className={inputClass} value={confirmerName} onChange={(event) => setConfirmerName(event.target.value)} />
                </Field>
                <Field label="Ghi chú">
                  <textarea className={`${inputClass} h-20 py-2`} value={responseNote} onChange={(event) => setResponseNote(event.target.value)} />
                </Field>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={thayThe} onChange={(event) => setThayThe(event.target.checked)} />Thay bản khách đã chấp thuận trước đó</label>
                {flags.exception ? <label className="flex gap-2 text-sm"><input type="checkbox" checked={ngoaiLe} onChange={(event) => setNgoaiLe(event.target.checked)} />Chấp thuận ngoài hạn, kèm lý do ít nhất 10 ký tự</label> : null}
                <div className="flex gap-2">
                  <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("phan-hoi", { status: responseStatus, occurredOn, confirmerName, note: responseNote, ngoaiLe, thayThe })}>
                    <Save className="size-4" aria-hidden /> Lưu phản hồi
                  </button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}><X className="size-4" aria-hidden /> Hủy</button>
                </div>
              </>
            ) : null}
            {panel === "sao-chep" ? (
              <>
                <h2 className="text-lg font-semibold">Sao chép sang hồ sơ khác</h2>
                <Field label="Khách đích">
                  <select className={inputClass} value={copyCustomer} onChange={(event) => { setCopyCustomer(event.target.value); setCopyProject(""); }}>
                    {customers.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
                  </select>
                </Field>
                <Field label="Công trình đích">
                  <select className={inputClass} value={copyProject} onChange={(event) => setCopyProject(event.target.value)}>
                    <option value="">Chọn công trình</option>
                    {copyProjects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
                  </select>
                </Field>
                {copyProjects.length === 0 ? <p className="text-sm text-muted">Khách này chưa có công trình. Hãy tạo công trình trước khi sao chép.</p> : null}
                <div className="flex gap-2">
                  <button type="button" className={buttonPrimary} disabled={busy || !copyProject} onClick={() => act("sao-chep", { customerId: copyCustomer, projectId: copyProject })}>Tạo bản sao</button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}><X className="size-4" aria-hidden /> Hủy</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
    {sheet ? (
      <SheetFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">{themHangMuc}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <NoticeBanner />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (dirty && !window.confirm("Bản đang sửa chưa lưu. Đóng?")) return;
              router.push("/bao-gia");
            }}
          >
            <X className="size-4" aria-hidden /> Đóng
          </Button>
          {actions}
        </div>
      </SheetFooter>
    ) : themHangMuc ? (
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">{themHangMuc}</div>
    ) : null}
    </>
  );
}
