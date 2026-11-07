"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { callApi } from "@/shared/client/api";
import { nhanVatPercent, vatPercents } from "@/shared/catalog/vat";
import { buttonPrimary, Field, inputClass } from "@/shared/components/controls";

type Customer = { id: string; code: string; name: string };
type Project = { id: string; customerId: string; code: string; name: string };

export function QuoteCreateForm({
  customers,
  projects,
  customerId,
  projectId,
}: {
  customers: Customer[];
  projects: Project[];
  customerId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState(customerId);
  const [project, setProject] = useState(projectId);
  const [projectName, setProjectName] = useState("");
  const [hangMuc, setHangMuc] = useState(() => projects.find((item) => item.id === projectId)?.name ?? "");
  const [taxPercent, setTaxPercent] = useState("10");
  const [validityDays, setValidityDays] = useState("15");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const related = useMemo(() => projects.filter((item) => item.customerId === customer), [projects, customer]);

  function chonCongTrinh(id: string) {
    setProject(id);
    if (!id) {
      setHangMuc(projectName.trim());
      return;
    }
    const picked = related.find((item) => item.id === id) ?? projects.find((item) => item.id === id);
    if (picked) setHangMuc(picked.name);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const created = await callApi<{ id: string }>("/api/bao-gia", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer,
          projectId: project,
          projectName: String(form.get("projectName") ?? ""),
          location: String(form.get("location") ?? ""),
          title: hangMuc.trim(),
          taxPercent: taxPercent === "chua" ? -1 : Number(taxPercent),
          validityDays: Number(validityDays || 0),
        }),
      });
      router.push(`/bao-gia?mo=sua&id=${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được báo giá.");
      setBusy(false);
    }
  }

  if (customers.length === 0) {
    return (
      <p className="rounded-[18px] border border-line bg-white p-4 text-sm">
        Chưa có khách đang sử dụng.{" "}
        <Link className="font-semibold text-primary" href="/khach-hang/moi">
          Thêm khách trước
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[18px] border border-line bg-white p-4 sm:p-5">
      <Field label="Khách hàng">
        <select
          className={inputClass}
          value={customer}
          required
          onChange={(event) => {
            setCustomer(event.target.value);
            setProject("");
            setHangMuc("");
            setProjectName("");
          }}
        >
          <option value="">Chọn khách</option>
          {customers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Công trình có sẵn">
        <select className={inputClass} value={project} onChange={(event) => chonCongTrinh(event.target.value)}>
          <option value="">Tạo công trình mới bên dưới</option>
          {related.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
      </Field>
      {project ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên công trình mới">
            <input
              name="projectName"
              className={inputClass}
              placeholder="Biệt thự Thảo Điền"
              required={!project}
              value={projectName}
              onChange={(event) => {
                const next = event.target.value;
                setProjectName(next);
                setHangMuc(next);
              }}
            />
          </Field>
          <Field label="Địa điểm">
            <input name="location" className={inputClass} />
          </Field>
        </div>
      )}
      <Field label="Hạng mục">
        <input
          className={inputClass}
          value={hangMuc}
          required
          placeholder="Sửa chữa tài sản công năm 2025…"
          onChange={(event) => setHangMuc(event.target.value)}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Thuế VAT">
          <select className={inputClass} value={taxPercent} onChange={(event) => setTaxPercent(event.target.value)}>
            <option value="chua">Báo giá chưa bao gồm VAT</option>
            {vatPercents.map((muc) => (
              <option key={muc} value={muc}>
                {nhanVatPercent(muc)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hiệu lực (ngày)" hint="Số ngày kể từ ngày tạo báo giá (ngày hôm nay).">
          <input
            className={inputClass}
            inputMode="numeric"
            value={validityDays}
            placeholder="15"
            onChange={(event) => setValidityDays(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className={buttonPrimary} disabled={busy || !customer || !hangMuc.trim()}>
        Tạo báo giá
      </button>
    </form>
  );
}
