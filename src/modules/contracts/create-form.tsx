"use client";

import { ArrowRight, FileSpreadsheet, Save } from "lucide-react";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass, selectClass } from "@/shared/components/controls";
import { NgayNhap } from "@/shared/components/ngay-nhap";

type Project = { id: string; code: string; name: string; customerId: string };
type Customer = { id: string; code: string; name: string };

export type QuoteSeed = {
  code: string;
  versionNumber: number;
  customerName: string;
  projectName: string;
  title: string;
};

export function ContractCreateForm({
  projects,
  customers,
  projectId,
  versionId,
  quoteSeed,
}: {
  projects: Project[];
  customers: Customer[];
  projectId: string;
  versionId: string;
  quoteSeed?: QuoteSeed | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosenProject, setChosenProject] = useState(projectId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formDataOf(event);
    setBusy(true);
    setError("");
    const body = versionId
      ? {
          quotationVersionId: versionId,
          kind: "thi_cong",
          name: String(form.get("name") ?? "").trim() || undefined,
          signedOn: String(form.get("signedOn") ?? "").trim() || undefined,
        }
      : Object.fromEntries(form.entries());
    try {
      const created = await callApi<{ id: string }>("/api/hop-dong", { method: "POST", body: JSON.stringify(body) });
      router.push(`/hop-dong/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {quoteSeed ? (
        <div className="overflow-hidden rounded-[20px] border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/60 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <FileSpreadsheet className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Từ báo giá đã đồng ý</p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {quoteSeed.code} · phiên bản {quoteSeed.versionNumber}
              </p>
              <p className="mt-1 text-sm text-muted">
                {quoteSeed.customerName} · {quoteSeed.projectName}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-900">
                <ArrowRight className="size-4 shrink-0" aria-hidden />
                Số hợp đồng tự cấp khi lưu. Công trình, khách, báo giá gắn sẵn — chỉ cần tên HĐ và ngày ký nếu có.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4 rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
        {versionId ? (
          <>
            <Field label="Tên hợp đồng">
              <input
                name="name"
                className={inputClass}
                defaultValue={quoteSeed?.title || ""}
                placeholder="Để trống sẽ lấy hạng mục báo giá"
              />
            </Field>
            <Field label="Ngày ký">
              <NgayNhap name="signedOn" className={inputClass} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Công trình">
              <select
                name="projectId"
                className={selectClass}
                required
                value={chosenProject}
                onChange={(event) => setChosenProject(event.target.value)}
              >
                <option value="">Chọn công trình</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Khách hàng">
              <select
                name="customerId"
                className={selectClass}
                defaultValue={projects.find((item) => item.id === chosenProject)?.customerId ?? ""}
              >
                <option value="">Theo khách của công trình</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tên hợp đồng">
              <input name="name" className={inputClass} placeholder="Để trống sẽ lấy tên công trình" />
            </Field>
            <Field label="Ngày ký">
              <NgayNhap name="signedOn" className={inputClass} />
            </Field>
          </>
        )}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className={buttonPrimary} disabled={busy}>
          <Save className="size-4" aria-hidden /> {busy ? "Đang tạo…" : "Tạo hợp đồng"}
        </button>
      </div>
    </form>
  );
}
