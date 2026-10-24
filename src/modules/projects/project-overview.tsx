"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { ProjectProgress } from "@/modules/projects/project-progress";
import { ProjectItems, type HangMucActions } from "@/modules/projects/project-items";
import { ProjectCosts, type ChiPhiActions } from "@/modules/projects/project-costs";
import { ProjectMaterials } from "@/modules/projects/project-materials";
import { ProjectOrders } from "@/modules/projects/project-orders";

export function dateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const tabs = [
  "Tổng quan",
  "Hạng mục",
  "Đơn hàng",
  "Vật tư công trình",
  "Thành viên",
  "Hóa đơn",
  "Chi phí",
  "Đợt thanh toán",
  "Tài liệu",
  "Ghi chú",
] as const;

type Tab = (typeof tabs)[number];

export function ProjectOverview({
  project,
  staff,
  canEdit,
  canQuote,
  onEdit,
  onQuote,
  onHangMuc,
  onChiPhi,
  onSauThue,
  addLineRef,
  addCostRef,
}: {
  project: {
    id: string;
    code: string;
    name: string;
    customerName: string;
    ownerId: string;
    ownerName: string;
    stage: string;
    location: string;
    venture: string;
    bidPackage: string;
    startedOn: string;
    endedOn: string;
    vatPercent: number | null;
  };
  staff: { id: string; name: string }[];
  canEdit: boolean;
  canQuote: boolean;
  onEdit: () => void;
  onQuote: () => void;
  onHangMuc: (active: boolean) => void;
  onChiPhi: (active: boolean) => void;
  onSauThue: (value: number | null) => void;
  addLineRef: RefObject<HangMucActions | null>;
  addCostRef: RefObject<ChiPhiActions | null>;
}) {
  const [tab, setTab] = useState<Tab>("Tổng quan");
  const initial = project.ownerName.trim().slice(0, 1).toLocaleUpperCase("vi");
  const hangMuc = tab === "Hạng mục";
  const chiPhi = tab === "Chi phí";
  const reported = useRef(hangMuc);
  const reportedCost = useRef(chiPhi);
  if (reported.current !== hangMuc) {
    reported.current = hangMuc;
    onHangMuc(hangMuc);
  }
  if (reportedCost.current !== chiPhi) {
    reportedCost.current = chiPhi;
    onChiPhi(chiPhi);
  }

  useEffect(() => () => onHangMuc(false), [onHangMuc]);
  useEffect(() => () => onChiPhi(false), [onChiPhi]);

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              tab === item ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
            )}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Tổng quan" ? (
        <div className="space-y-4 rounded-xl bg-soft p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-ink">{project.name}</h2>
              <p className="mt-1 text-sm text-muted">{project.customerName}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Dự án</dt>
                  <dd className="font-medium text-ink">{project.venture || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Gói thầu</dt>
                  <dd className="font-medium text-ink">{project.bidPackage || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Địa chỉ công trình</dt>
                  <dd className="font-medium text-ink">{project.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Ngày bắt đầu</dt>
                  <dd className="font-medium text-ink">{dateLabel(project.startedOn)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Ngày kết thúc</dt>
                  <dd className="font-medium text-ink">{dateLabel(project.endedOn)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Thuế GTGT (VAT)</dt>
                  <dd className="font-medium text-ink">{project.vatPercent === null ? "—" : project.vatPercent}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-2">
              {canQuote ? <Button type="button" size="sm" variant="outline" onClick={onQuote}>Lập báo giá</Button> : null}
              {canEdit ? <Button type="button" size="sm" variant="outline" onClick={onEdit}><Pencil /> Sửa</Button> : null}
            </div>
          </div>
          <ProjectProgress stage={project.stage} large />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Hợp đồng", "0"],
              ["Hóa đơn đến hạn", "0"],
              ["Thành viên", project.ownerName ? "1" : "0"],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-[28px] font-semibold leading-none text-ink">{value}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-line bg-white">
              <h3 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Thành viên</h3>
              {project.ownerName ? (
                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initial}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{project.ownerName}</p>
                    <p className="text-xs text-muted">Phụ trách</p>
                  </div>
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted">Chưa có dữ liệu.</p>
              )}
            </section>
            <section className="overflow-hidden rounded-xl border border-line bg-white">
              <h3 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Hợp đồng</h3>
              <Table>
                <TableHeader>
                  <TableRow className="bg-soft hover:bg-soft">
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted">Chưa có dữ liệu.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>
          </div>
        </div>
      ) : tab === "Hạng mục" ? (
        <ProjectItems projectId={project.id} defaultOwnerId={project.ownerId} staff={staff} canEdit={canEdit} addLineRef={addLineRef} vatPercent={project.vatPercent} onSauThue={onSauThue} />
      ) : tab === "Đơn hàng" ? (
        <ProjectOrders projectId={project.id} canEdit={canEdit} />
      ) : tab === "Vật tư công trình" ? (
        <ProjectMaterials projectId={project.id} />
      ) : tab === "Chi phí" ? (
        <ProjectCosts projectId={project.id} staff={staff} canEdit={canEdit} defaultPayerId={project.ownerId} addCostRef={addCostRef} />
      ) : (
        <section className="rounded-xl border border-dashed border-line bg-soft px-4 py-16 text-center">
          <h2 className="text-base font-semibold text-ink">{tab}</h2>
          <p className="mt-2 text-sm text-muted">Chưa nối dữ liệu.</p>
        </section>
      )}
    </div>
  );
}
