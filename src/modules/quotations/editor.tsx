"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { SheetFooter } from "@/shared/components/ui/sheet";
import { Badge } from "@/shared/components/badge";
import { buttonGhost, buttonPrimary, Field, inputClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";
import { addDays, dayCount, formatYmd } from "@/shared/lib/dates";
import { formatVnd } from "@/shared/lib/money";
import { customerFollowLabel, groupLabel, internalLabel } from "@/modules/customers/labels";
import { applyTax, priceItem, taxRateBps, type ItemInput } from "@/modules/quotations/calc";
import { isMeasureUnit, measureUnits } from "@/shared/catalog/units";

const cell = "h-9 w-full min-w-[4.5rem] rounded-md border border-input bg-white px-2 text-sm text-ink shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type Line = {
  key: string;
  sourceItemId: string | null;
  groupKey: string;
  name: string;
  spec: string;
  unit: string;
  widthMm: string;
  heightMm: string;
  quantity: string;
  mainUnitPrice: string;
  accessoryUnitPrice: string;
  note: string;
};

export type EditorItem = {
  id: string;
  sourceItemId: string | null;
  groupKey: string;
  name: string;
  spec: string;
  unit: string;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  mainUnitPrice: number;
  accessoryUnitPrice: number;
  note: string;
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
  receiverName: string;
  receiverTitle: string;
  receiverPhone: string;
  receiverEmail: string;
  scheduleText: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  includedScope: string;
  excludedScope: string;
  note: string;
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

function choices(categories: { id: string; name: string; unit: string; active: boolean }[], groupKey: string) {
  const known = groupLabel as Record<string, string>;
  const visible = categories.filter((item) => item.active || item.id === groupKey);
  if (groupKey && !visible.some((item) => item.id === groupKey)) {
    return [{ id: groupKey, name: known[groupKey] ?? "Hạng mục cũ", unit: "bộ", active: false }, ...visible];
  }
  return visible;
}

function blankLine(groupKey: string, name = "", unit = "bộ"): Line {
  return {
    key: crypto.randomUUID(),
    sourceItemId: null,
    groupKey,
    name,
    spec: "",
    unit,
    widthMm: "",
    heightMm: "",
    quantity: "1",
    mainUnitPrice: "",
    accessoryUnitPrice: "",
    note: "",
  };
}

function fromItem(item: EditorItem): Line {
  return {
    key: item.id,
    sourceItemId: item.sourceItemId,
    groupKey: item.groupKey,
    name: item.name,
    spec: item.spec,
    unit: item.unit || "bộ",
    widthMm: item.widthMm ? String(item.widthMm) : "",
    heightMm: item.heightMm ? String(item.heightMm) : "",
    quantity: String(item.quantity),
    mainUnitPrice: item.mainUnitPrice ? String(item.mainUnitPrice) : "",
    accessoryUnitPrice: item.accessoryUnitPrice ? String(item.accessoryUnitPrice) : "",
    note: item.note,
  };
}

function money(value: string) {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) return 0;
  const normalized = /^\d{1,3}(\.\d{3})+$/.test(cleaned) ? cleaned.replace(/\./g, "") : cleaned;
  if (!/^\d+$/.test(normalized)) throw new Error("Số tiền chỉ gồm chữ số, ví dụ 1500000 hoặc 1.500.000.");
  return Number(normalized);
}

function whole(value: string, label: string) {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label} phải là số nguyên.`);
  return Number(value.trim());
}

function toInput(line: Line): ItemInput {
  return {
    groupKey: line.groupKey,
    name: line.name.trim(),
    unit: line.unit.trim() || "bộ",
    widthMm: line.widthMm.trim() ? whole(line.widthMm, "Chiều rộng") : null,
    heightMm: line.heightMm.trim() ? whole(line.heightMm, "Chiều cao") : null,
    quantity: whole(line.quantity || "0", "Số lượng"),
    mainUnitPrice: money(line.mainUnitPrice),
    accessoryUnitPrice: money(line.accessoryUnitPrice),
  };
}

export function QuoteEditor({
  quoteId,
  code,
  customerName,
  projectName,
  version,
  versions,
  staff,
  customers,
  projects,
  flags,
  today,
  categories,
  sheet = false,
}: {
  quoteId: string;
  code: string;
  customerName: string;
  projectName: string;
  version: EditorVersion;
  versions: { id: string; number: number }[];
  staff: { id: string; name: string }[];
  customers: { id: string; code: string; name: string }[];
  projects: { id: string; customerId: string; code: string; name: string }[];
  flags: Flags;
  today: string;
  categories: { id: string; name: string; unit: string; active: boolean }[];
  sheet?: boolean;
}) {
  const router = useRouter();
  const opening = categories.find((item) => item.active) ?? categories[0];
  const [lines, setLines] = useState<Line[]>(version.items.length ? version.items.map(fromItem) : [blankLine(opening?.id ?? "", opening?.name ?? "", opening?.unit || "bộ")]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"" | "duyet" | "sua" | "gui" | "phan-hoi" | "ban-moi" | "sao-chep">("");
  const [reason, setReason] = useState("");
  const [recipientName, setRecipientName] = useState(version.receiverName || customerName);
  const [channel, setChannel] = useState("zalo");
  const [responseStatus, setResponseStatus] = useState("chap_thuan");
  const [occurredOn, setOccurredOn] = useState(today);
  const [confirmerName, setConfirmerName] = useState(version.receiverName || customerName);
  const [responseNote, setResponseNote] = useState("");
  const [ngoaiLe, setNgoaiLe] = useState(false);
  const [thayThe, setThayThe] = useState(false);
  const [copyCustomer, setCopyCustomer] = useState(customers[0]?.id ?? "");
  const [copyProject, setCopyProject] = useState("");
  const [compare, setCompare] = useState<{ added: string[]; removed: string[]; changed: string[]; terms: string[]; delta: number } | null>(null);
  const [validityDays, setValidityDays] = useState(String(Math.max(dayCount(version.quoteDate, version.validUntil), 0)));
  const [meta, setMeta] = useState({
    title: version.title,
    quoteDate: version.quoteDate,
    ownerId: version.ownerId,
    receiverName: version.receiverName,
    receiverTitle: version.receiverTitle,
    receiverPhone: version.receiverPhone,
    receiverEmail: version.receiverEmail,
    scheduleText: version.scheduleText,
    paymentTerms: version.paymentTerms,
    deliveryTerms: version.deliveryTerms,
    warrantyTerms: version.warrantyTerms,
    includedScope: version.includedScope,
    excludedScope: version.excludedScope,
    note: version.note,
    taxPercent: String(version.taxBps / 100),
    warrantyMonths: version.warrantyMonths ? String(version.warrantyMonths) : "",
    advanceAmount: version.advanceAmount ? String(version.advanceAmount) : "",
    advanceDays: version.advanceDays ? String(version.advanceDays) : "",
    paymentDays: version.paymentDays ? String(version.paymentDays) : "",
  });

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const priced = useMemo(() => {
    const rows = lines.map((line) => {
      if (!line.name.trim()) return { line, error: "", money: null as number | null, method: "" };
      try {
        const pricedLine = priceItem(toInput(line));
        return { line, error: "", money: pricedLine.pretax, method: pricedLine.calcMethod === "dien_tich" ? "m²" : "bộ" };
      } catch (caught) {
        return { line, error: caught instanceof Error ? caught.message : "Dòng chưa hợp lệ.", money: null, method: "" };
      }
    });
    const pretax = rows.reduce((sum, row) => sum + (row.money ?? 0), 0);
    try {
      return { rows, totals: applyTax(pretax, taxRateBps(Number(meta.taxPercent || 0))), taxError: "" };
    } catch (caught) {
      return { rows, totals: applyTax(pretax, 0), taxError: caught instanceof Error ? caught.message : "Thuế suất chưa hợp lệ." };
    }
  }, [lines, meta.taxPercent]);

  function patchLine(key: string, patch: Partial<Line>) {
    setDirty(true);
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function payload(revision: number) {
    const days = whole(validityDays || "0", "Số ngày hiệu lực");
    return {
      versionId: version.id,
      revision,
      ...meta,
      validUntil: addDays(meta.quoteDate, days),
      taxPercent: Number(meta.taxPercent || 0),
      warrantyMonths: meta.warrantyMonths.trim() ? whole(meta.warrantyMonths, "Số tháng bảo hành") : 0,
      advanceAmount: money(meta.advanceAmount),
      advanceDays: meta.advanceDays.trim() ? whole(meta.advanceDays, "Số ngày tạm ứng") : 0,
      paymentDays: meta.paymentDays.trim() ? whole(meta.paymentDays, "Số ngày thanh toán") : 0,
      items: lines.filter((line) => line.name.trim()).map((line) => ({ ...toInput(line), sourceItemId: line.sourceItemId, spec: line.spec, note: line.note })),
    };
  }

  async function persist(revision: number) {
    const saved = await callApi<{ revision: number }>(`/api/bao-gia/${quoteId}`, {
      method: "PUT",
      body: JSON.stringify(payload(revision)),
    });
    setDirty(false);
    return saved.revision;
  }

  async function act(action: string, extra: Record<string, unknown> = {}, saveFirst = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const revision = saveFirst ? await persist(version.revision) : version.revision;
      const result = await callApi<{ id?: string; versionId?: string }>(`/api/bao-gia/${quoteId}/hanh-dong`, {
        method: "POST",
        body: JSON.stringify({ action, versionId: version.id, revision, ...extra }),
      });
      setPanel("");
      if (action === "sao-chep" && result.id) {
        router.push(`/bao-gia?mo=sua&id=${result.id}`);
        return;
      }
      if (action === "phien-ban-moi" && result.versionId) {
        router.push(`/bao-gia?mo=sua&id=${quoteId}&v=${result.versionId}`);
      }
      router.refresh();
      setNotice("Đã cập nhật.");
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
      await persist(version.revision);
      router.refresh();
      setNotice("Đã lưu nháp.");
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
  const internalTone = version.internalStatus === "da_duyet" ? "success" : version.internalStatus === "cho_duyet" ? "warning" : "neutral";
  const actions = (
    <>
      {flags.edit ? (
        <button type="button" className={buttonGhost} disabled={busy} onClick={saveOnly}>
          Lưu nháp
        </button>
      ) : null}
      {flags.submit ? (
        <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("gui-duyet", {}, true)}>
          Lưu và gửi duyệt
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
      <Link href={`/in/bao-gia/${quoteId}?v=${version.id}`} className={buttonGhost}>
        In hoặc lưu PDF
      </Link>
    </>
  );

  return (
    <>
    <div className={sheet ? "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4" : "space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {sheet ? null : (
            <Link href="/bao-gia" className="text-sm font-semibold text-primary">
              Báo giá
            </Link>
          )}
          <h1 className="text-2xl font-semibold text-ink">
            {code} · phiên bản {version.number}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {customerName} · {projectName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={internalTone}>{internalLabel[version.internalStatus as keyof typeof internalLabel] ?? version.internalStatus}</Badge>
            <Badge tone="info">{customerFollowLabel[version.customerStatus as keyof typeof customerFollowLabel] ?? version.customerStatus}</Badge>
          </div>
        </div>
        {sheet ? null : <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
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
      {notice ? <p className="text-sm text-success">{notice}</p> : null}

      <section className="grid gap-3 rounded-[18px] border border-line bg-white p-4 md:grid-cols-3">
        <Field label="Nội dung in trên báo giá" hint="Câu dẫn: xin gửi báo giá nội dung này tại địa điểm công trình.">
          <input className={inputClass} value={meta.title} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, title: event.target.value }); }} />
        </Field>
        <Field label="Ngày báo giá">
          <NgayNhap className={inputClass} value={meta.quoteDate} disabled={!flags.edit} onChange={(ymd) => { setDirty(true); setMeta({ ...meta, quoteDate: ymd }); }} />
        </Field>
        <Field label="Hiệu lực (ngày)" hint={/^\d+$/.test(validityDays.trim()) && Number(validityDays) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(meta.quoteDate) ? `Đến hết ${formatYmd(addDays(meta.quoteDate, Number(validityDays)))}` : "Không ghi hạn"}>
          <input className={inputClass} inputMode="numeric" value={validityDays} disabled={!flags.edit} onChange={(event) => { setDirty(true); setValidityDays(event.target.value); }} />
        </Field>
        <Field label="Thuế suất cả báo giá" hint={meta.taxPercent === "0" ? "Khách lẻ: bản in không hiện VAT." : "Một suất cho toàn bộ tiền hàng."}>
          <select className={inputClass} value={meta.taxPercent} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, taxPercent: event.target.value }); }}>
            <option value="10">10%</option>
            <option value="8">8%</option>
            <option value="0">0% — khách lẻ</option>
          </select>
        </Field>
        <Field label="Phụ trách">
          <select className={inputClass} value={meta.ownerId} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, ownerId: event.target.value }); }}>
            {staff.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Người nhận">
          <input className={inputClass} value={meta.receiverName} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, receiverName: event.target.value }); }} />
        </Field>
      </section>

      <section className="rounded-[18px] border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Hạng mục</h2>
            <p className="text-xs text-muted">Có cả rộng và cao thì tính theo m². Thiếu một cạnh thì đơn giá cửa tính theo bộ. Phụ kiện luôn cộng theo bộ.</p>
          </div>
          {flags.edit ? (
            <button type="button" className={buttonGhost} onClick={() => { setDirty(true); setLines([...lines, blankLine(opening?.id ?? "", opening?.name ?? "", opening?.unit || "bộ")]); }}>
              Thêm dòng
            </button>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-1 py-2 font-medium">Hạng mục</th>
                <th className="px-1 py-2 font-medium">Nội dung</th>
                <th className="px-1 py-2 font-medium">ĐVT</th>
                <th className="px-1 py-2 font-medium">Rộng</th>
                <th className="px-1 py-2 font-medium">Cao</th>
                <th className="px-1 py-2 font-medium">Số bộ</th>
                <th className="px-1 py-2 font-medium">Đơn giá cửa</th>
                <th className="px-1 py-2 font-medium">Phụ kiện</th>
                <th className="px-1 py-2 font-medium">Ghi chú</th>
                <th className="px-1 py-2 text-right font-medium">Trước thuế</th>
                <th className="px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {priced.rows.map((row, index) => (
                <tr key={row.line.key} className="align-top">
                  <td className="px-1 py-1">
                    <select className={`${cell} min-w-[16rem]`} value={row.line.groupKey} disabled={!flags.edit} aria-label={`Hạng mục dòng ${index + 1}`} onChange={(event) => {
                      const groupKey = event.target.value;
                      const picked = categories.find((item) => item.id === groupKey);
                      const previous = categories.find((item) => item.id === row.line.groupKey);
                      const current = row.line.name.trim();
                      const replaceName = current.length === 0 || current === previous?.name;
                      const replaceUnit = row.line.unit.trim() === (previous?.unit || "bộ");
                      patchLine(row.line.key, {
                        groupKey,
                        ...(replaceName && picked ? { name: picked.name } : {}),
                        ...(replaceUnit && picked ? { unit: picked.unit || "bộ" } : {}),
                      });
                    }}>
                      {choices(categories, row.line.groupKey).map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      className={`${cell} min-w-[14rem]`}
                      value={row.line.name}
                      disabled={!flags.edit}
                      placeholder="Cửa đi 2 cánh, nhôm hệ 55"
                      aria-label={`Nội dung dòng ${index + 1}`}
                      onChange={(event) => patchLine(row.line.key, { name: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && index === lines.length - 1 && flags.edit) {
                          event.preventDefault();
                          setDirty(true);
                          setLines([...lines, blankLine(opening?.id ?? "", opening?.name ?? "", opening?.unit || "bộ")]);
                        }
                      }}
                    />
                    {row.error ? <p className="mt-1 text-xs text-danger">{row.error}</p> : row.method ? <p className="mt-1 text-xs text-muted">Tính theo {row.method}</p> : null}
                  </td>
                  <td className="px-1 py-1">
                    <select className={`${cell} w-24`} value={row.line.unit} disabled={!flags.edit} aria-label={`Đơn vị dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { unit: event.target.value })}>
                      {row.line.unit && !isMeasureUnit(row.line.unit) ? <option value={row.line.unit}>{row.line.unit}</option> : null}
                      {measureUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1"><input className={`${cell} w-20`} inputMode="numeric" value={row.line.widthMm} disabled={!flags.edit} placeholder="mm" aria-label={`Rộng dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { widthMm: event.target.value })} /></td>
                  <td className="px-1 py-1"><input className={`${cell} w-20`} inputMode="numeric" value={row.line.heightMm} disabled={!flags.edit} placeholder="mm" aria-label={`Cao dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { heightMm: event.target.value })} /></td>
                  <td className="px-1 py-1"><input className={`${cell} w-16`} inputMode="numeric" value={row.line.quantity} disabled={!flags.edit} aria-label={`Số bộ dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { quantity: event.target.value })} /></td>
                  <td className="px-1 py-1"><input className={`${cell} w-28`} inputMode="numeric" value={row.line.mainUnitPrice} disabled={!flags.edit} placeholder="0" aria-label={`Đơn giá cửa dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { mainUnitPrice: event.target.value })} /></td>
                  <td className="px-1 py-1"><input className={`${cell} w-28`} inputMode="numeric" value={row.line.accessoryUnitPrice} disabled={!flags.edit} placeholder="0" aria-label={`Phụ kiện dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { accessoryUnitPrice: event.target.value })} /></td>
                  <td className="px-1 py-1"><input className={`${cell} min-w-[8rem]`} value={row.line.note} disabled={!flags.edit} aria-label={`Ghi chú dòng ${index + 1}`} onChange={(event) => patchLine(row.line.key, { note: event.target.value })} /></td>
                  <td className="px-1 py-2 text-right font-semibold whitespace-nowrap">{row.money === null ? "—" : formatVnd(row.money)}</td>
                  <td className="px-1 py-1">
                    {flags.edit && lines.length > 1 ? (
                      <button type="button" className="h-9 px-2 text-sm font-semibold text-danger" onClick={() => { setDirty(true); setLines(lines.filter((line) => line.key !== row.line.key)); }}>
                        Xóa
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-white px-4 py-3 shadow-[var(--shadow-card)]">
        {priced.taxError ? <p className="text-sm text-danger">{priced.taxError}</p> : priced.totals.retail ? (
          <p className="text-sm text-muted">Khách lẻ, không tính VAT</p>
        ) : (
          <p className="text-sm text-muted">Cộng tiền hàng {formatVnd(priced.totals.pretax)} · Thuế {meta.taxPercent}% {formatVnd(priced.totals.tax)}</p>
        )}
        <p className="text-lg font-semibold text-ink">{priced.totals.retail ? "Tổng cộng" : "Tổng đã gồm thuế"} {formatVnd(priced.totals.posttax)}</p>
      </div>

      <section className="grid gap-3 rounded-[18px] border border-line bg-white p-4 md:grid-cols-2">
        <Field label="Thời gian thi công">
          <input className={inputClass} value={meta.scheduleText} disabled={!flags.edit} placeholder="15 ngày kể từ ngày ký" onChange={(event) => { setDirty(true); setMeta({ ...meta, scheduleText: event.target.value }); }} />
        </Field>
        <Field label="Bảo hành (tháng)" hint="Để trống hoặc 0 thì in câu không áp dụng bảo hành.">
          <input className={inputClass} inputMode="numeric" value={meta.warrantyMonths} disabled={!flags.edit} placeholder="12" onChange={(event) => { setDirty(true); setMeta({ ...meta, warrantyMonths: event.target.value }); }} />
        </Field>
        <Field label="Tạm ứng (đồng)" hint="Để trống nếu không thu tạm ứng.">
          <input className={inputClass} inputMode="numeric" value={meta.advanceAmount} disabled={!flags.edit} placeholder="0" onChange={(event) => { setDirty(true); setMeta({ ...meta, advanceAmount: event.target.value }); }} />
        </Field>
        <Field label="Tạm ứng trong (ngày làm việc)">
          <input className={inputClass} inputMode="numeric" value={meta.advanceDays} disabled={!flags.edit} placeholder="3" onChange={(event) => { setDirty(true); setMeta({ ...meta, advanceDays: event.target.value }); }} />
        </Field>
        <Field label="Thanh toán sau nghiệm thu (ngày)">
          <input className={inputClass} inputMode="numeric" value={meta.paymentDays} disabled={!flags.edit} placeholder="7" onChange={(event) => { setDirty(true); setMeta({ ...meta, paymentDays: event.target.value }); }} />
        </Field>
        <Field label="Điện thoại người nhận">
          <input className={inputClass} value={meta.receiverPhone} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, receiverPhone: event.target.value }); }} />
        </Field>
        <Field label="Ghi chú nội bộ">
          <input className={inputClass} value={meta.note} disabled={!flags.edit} onChange={(event) => { setDirty(true); setMeta({ ...meta, note: event.target.value }); }} />
        </Field>
      </section>

      <section className="rounded-[18px] border border-line bg-white p-4">
        <h2 className="text-sm font-semibold">Tệp đính kèm</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {version.files.length === 0 ? <li className="text-muted">Chưa có tệp.</li> : null}
          {version.files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-2">
              <a className="font-medium text-primary" href={`/api/tep/${file.id}`}>{file.fileName}</a>
              {file.locked || !flags.edit ? <span className="text-xs text-muted">{file.locked ? "Đã khóa" : ""}</span> : (
                <button type="button" className="text-danger" onClick={async () => {
                  try {
                    await callApi(`/api/tep/${file.id}`, { method: "DELETE" });
                    router.refresh();
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : "Không xóa được tệp.");
                  }
                }}>Xóa</button>
              )}
            </li>
          ))}
        </ul>
        {flags.edit || flags.deliver ? (
          <label className={`${buttonGhost} mt-3`}>
            Thêm tệp
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
          </label>
        ) : null}
      </section>

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
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}>Hủy</button>
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
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}>Hủy</button>
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
                  <button type="button" className={buttonPrimary} disabled={busy} onClick={() => act("gui-khach", { recipientName, channel })}>Lưu lần gửi</button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}>Hủy</button>
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
                    Lưu phản hồi
                  </button>
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}>Hủy</button>
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
                  <button type="button" className={buttonGhost} onClick={() => setPanel("")}>Hủy</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
    {sheet ? (
      <SheetFooter className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (dirty && !window.confirm("Bản đang sửa chưa lưu. Đóng?")) return;
            router.push("/bao-gia");
          }}
        >
          Đóng
        </Button>
        {actions}
      </SheetFooter>
    ) : null}
    </>
  );
}
