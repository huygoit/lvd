"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callApi, formDataOf } from "@/shared/client/api";
import { buttonPrimary, Field, inputClass, selectClass } from "@/shared/components/controls";
import { contractKindLabel } from "@/modules/contracts/labels";

type Project = { id: string; code: string; name: string; customerId: string };
type Customer = { id: string; code: string; name: string };

export function ContractCreateForm({
  projects,
  customers,
  projectId,
  versionId,
}: {
  projects: Project[];
  customers: Customer[];
  projectId: string;
  versionId: string;
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
      ? { quotationVersionId: versionId, kind: String(form.get("kind") ?? "thi_cong") }
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
    <form onSubmit={onSubmit} className="space-y-4 rounded-[18px] border border-line bg-white p-4">
      {versionId ? <p className="text-sm text-muted">Tạo từ báo giá khách đã chấp thuận. Gửi lại không tạo thêm bản.</p> : null}
      <Field label="Loại hợp đồng">
        <select name="kind" className={selectClass} defaultValue="thi_cong">
          {Object.entries(contractKindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      {versionId ? null : (
        <>
          <Field label="Công trình">
            <select name="projectId" className={selectClass} required value={chosenProject} onChange={(event) => setChosenProject(event.target.value)}>
              <option value="">Chọn công trình</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </select>
          </Field>
          <Field label="Đối tác">
            <select name="customerId" className={selectClass} defaultValue={projects.find((item) => item.id === chosenProject)?.customerId ?? ""}>
              <option value="">Theo khách của công trình</option>
              {customers.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </select>
          </Field>
          <Field label="Tên hợp đồng">
            <input name="name" className={inputClass} placeholder="Để trống sẽ lấy tên công trình" />
          </Field>
        </>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button className={buttonPrimary} disabled={busy}>{busy ? "Đang lưu" : "Lưu nháp"}</button>
    </form>
  );
}
