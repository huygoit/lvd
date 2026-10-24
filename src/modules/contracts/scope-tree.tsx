"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonGhost, buttonPrimary, Field, inputClass, selectClass } from "@/shared/components/controls";
import { scopeKindLabel } from "@/modules/contracts/labels";
import { formatVnd } from "@/shared/lib/money";

export type TreeLine = {
  id: string;
  parentId: string | null;
  kind: string;
  code: string;
  name: string;
  unit: string;
  quantity: number | null;
  currentQuantity: number | null;
  widthMm: number | null;
  heightMm: number | null;
  signedAmount: number | null;
  adminAmount: number | null;
};

const nextKind: Record<string, string> = {
  hop_dong: "diem",
  diem: "nha",
  nha: "ky_hieu",
  ky_hieu: "bo",
};

function money(value: number | null) {
  return value === null ? "Chưa có" : formatVnd(value);
}

function label(line: TreeLine) {
  return `${line.code ? `${line.code} · ` : ""}${line.name}`;
}

export function ScopeTree({
  contractId,
  contractCode,
  lines,
  canEdit,
  canAdmin,
  frozen,
}: {
  contractId: string;
  contractCode: string;
  lines: TreeLine[];
  canEdit: boolean;
  canAdmin: boolean;
  frozen: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const byId = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);

  function ancestors(id: string) {
    const path: TreeLine[] = [];
    let cursor = byId.get(id);
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor.id)) {
      path.unshift(cursor);
      guard.add(cursor.id);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return path;
  }

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase("vi-VN");
    if (!text) return new Set(lines.map((line) => line.id));
    const ids = new Set<string>();
    for (const line of lines) {
      const hay = `${line.code} ${line.name}`.toLocaleLowerCase("vi-VN");
      if (!hay.includes(text)) continue;
      ids.add(line.id);
      for (const item of ancestors(line.id)) ids.add(item.id);
    }
    return ids;
  }, [lines, query, byId]);

  const crumb = selected ? ancestors(selected) : [];
  const current = selected ? byId.get(selected) : undefined;
  const kindDefault = current?.kind === "bo" ? "" : (nextKind[current?.kind ?? "hop_dong"] ?? "ky_hieu");

  function inBranch(line: TreeLine) {
    if (!selected) return true;
    if (line.id === selected) return line.kind === "ky_hieu" || line.kind === "bo";
    return ancestors(line.id).some((item) => item.id === selected);
  }

  const symbols = lines.filter((line) => (line.kind === "ky_hieu" || line.kind === "bo") && inBranch(line));
  const loose = lines.filter((line) => !line.parentId && line.kind === "ky_hieu");

  function nodes(parentId: string | null, depth: number) {
    return lines
      .filter((line) => line.parentId === parentId && visible.has(line.id))
      .map((line) => (
        <div key={line.id}>
          <button
            type="button"
            onClick={() => setSelected(line.id)}
            className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm ${selected === line.id ? "bg-soft text-primary" : "hover:bg-soft"}`}
            style={{ paddingLeft: 8 + depth * 16 }}
          >
            <span className="mt-0.5 text-[11px] text-muted">{scopeKindLabel[line.kind as keyof typeof scopeKindLabel]}</span>
            <span className="font-medium">{label(line)}</span>
          </button>
          {nodes(line.id, depth + 1)}
        </div>
      ));
  }

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formDataOf(event);
    const kind = String(form.get("kind") ?? kindDefault);
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/hop-dong/${contractId}/pham-vi`, {
        method: "POST",
        body: JSON.stringify({
          ...Object.fromEntries(form.entries()),
          parentId: kind === "diem" ? "" : (current?.id ?? ""),
        }),
      });
      router.refresh();
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thêm được.");
    } finally {
      setBusy(false);
    }
  }

  async function move(lineId: string) {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/hop-dong/${contractId}/pham-vi/chuyen`, {
        method: "POST",
        body: JSON.stringify({ lineId, parentId: current.id }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không chuyển được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-semibold">Cây phạm vi</h2>
        <p className="mt-1 text-xs text-muted">Hợp đồng → Gói/Điểm → Hạng mục/Nhà → Ký hiệu cửa → Bộ. Cấp không dùng thì bỏ qua, không tạo thư mục rỗng.</p>
      </div>
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} mb-2`} placeholder="Điểm O, Nhà G, D01" />
          <button type="button" onClick={() => setSelected(null)} className={`mb-1 flex w-full rounded-md px-2 py-1.5 text-left text-sm font-medium ${selected === null ? "bg-soft text-primary" : "hover:bg-soft"}`}>
            {contractCode}
          </button>
          {nodes(null, 0)}
          {lines.length === 0 ? <p className="px-2 py-2 text-sm text-muted">Chưa có nhánh. Thêm một gói/điểm, hoặc một ký hiệu nếu chỉ có một cửa.</p> : null}
        </div>
        <div className="min-w-0 p-3">
          <p className="text-sm text-muted">
            <button type="button" className="font-medium text-primary" onClick={() => setSelected(null)}>{contractCode}</button>
            {crumb.map((item) => (
              <span key={item.id}>
                {" / "}
                <button type="button" className="font-medium text-primary" onClick={() => setSelected(item.id)}>{label(item)}</button>
              </span>
            ))}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 pr-3 font-medium">Trong nhánh</th>
                  <th className="py-2 pr-3 font-medium">Số bộ</th>
                  <th className="py-2 pr-3 font-medium">Hiện hành</th>
                  <th className="py-2 text-right font-medium">Giá ký</th>
                  {canAdmin ? <th className="py-2 text-right font-medium">Giá quản trị</th> : null}
                </tr>
              </thead>
              <tbody>
                {symbols.length === 0 ? (
                  <tr><td colSpan={canAdmin ? 5 : 4} className="py-3 text-muted">Nhánh này chưa có ký hiệu cửa.</td></tr>
                ) : symbols.map((line) => (
                  <tr key={line.id} className="border-b border-line">
                    <td className="py-2 pr-3">
                      <button type="button" className="text-left font-medium text-primary" onClick={() => setSelected(line.id)}>{label(line)}</button>
                      <p className="text-xs text-muted">{ancestors(line.id).slice(0, -1).map((item) => label(item)).join(" / ") || "Ngay dưới hợp đồng"} · {scopeKindLabel[line.kind as keyof typeof scopeKindLabel]}{line.widthMm && line.heightMm ? ` · ${line.widthMm}×${line.heightMm} mm` : ""}</p>
                    </td>
                    <td className="py-2 pr-3">{line.quantity === null ? "Chưa có" : line.quantity}</td>
                    <td className="py-2 pr-3">{line.currentQuantity === null ? "Chưa có" : line.currentQuantity}</td>
                    <td className="py-2 text-right">{money(line.signedAmount)}</td>
                    {canAdmin ? <td className="py-2 text-right">{money(line.adminAmount)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && !frozen && current && (current.kind === "diem" || current.kind === "nha") && loose.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-muted">Ký hiệu đang nằm ngay dưới hợp đồng:</p>
              {loose.map((line) => (
                <button key={line.id} type="button" className={buttonGhost} disabled={busy} onClick={() => move(line.id)}>Đưa {label(line)} vào nhánh này</button>
              ))}
            </div>
          ) : null}
          {canEdit && !frozen && kindDefault ? (
            <form onSubmit={onAdd} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Thêm cấp">
                <select name="kind" key={kindDefault} defaultValue={kindDefault} className={selectClass}>
                  {Object.entries(scopeKindLabel).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                </select>
              </Field>
              <Field label="Mã">
                <input name="code" className={inputClass} placeholder="O, G, D01" />
              </Field>
              <Field label="Tên">
                <input name="name" className={inputClass} required placeholder="Điểm O, Nhà G, Cửa D01" />
              </Field>
              <Field label="Số bộ">
                <input name="quantity" className={inputClass} inputMode="numeric" placeholder="Bộ lẻ thì nhập 1" />
              </Field>
              <Field label="Rộng mm">
                <input name="widthMm" className={inputClass} inputMode="numeric" />
              </Field>
              <Field label="Cao mm">
                <input name="heightMm" className={inputClass} inputMode="numeric" />
              </Field>
              <Field label="Đơn giá ký">
                <input name="signedUnitPrice" className={inputClass} inputMode="numeric" />
              </Field>
              {canAdmin ? (
                <Field label="Đơn giá quản trị">
                  <input name="adminUnitPrice" className={inputClass} inputMode="numeric" />
                </Field>
              ) : null}
              <div className="sm:col-span-2">
                <button className={buttonPrimary} disabled={busy}>Thêm vào cây</button>
              </div>
            </form>
          ) : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
