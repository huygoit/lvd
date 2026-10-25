"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/shared/lib/cn";
import { ProjectFinanceOverview } from "@/modules/projects/project-finance-overview";
import { ProjectItems, type HangMucActions } from "@/modules/projects/project-items";
import { ProjectCosts, type ChiPhiActions } from "@/modules/projects/project-costs";
import { ProjectMaterials } from "@/modules/projects/project-materials";
import { ProjectOrders } from "@/modules/projects/project-orders";
import { ProjectDocuments } from "@/modules/projects/project-documents";

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
        <ProjectFinanceOverview
          project={project}
          canEdit={canEdit}
          canQuote={canQuote}
          onEdit={onEdit}
          onQuote={onQuote}
        />
      ) : tab === "Hạng mục" ? (
        <ProjectItems projectId={project.id} defaultOwnerId={project.ownerId} staff={staff} canEdit={canEdit} addLineRef={addLineRef} vatPercent={project.vatPercent} onSauThue={onSauThue} />
      ) : tab === "Đơn hàng" ? (
        <ProjectOrders projectId={project.id} canEdit={canEdit} />
      ) : tab === "Vật tư công trình" ? (
        <ProjectMaterials projectId={project.id} />
      ) : tab === "Chi phí" ? (
        <ProjectCosts projectId={project.id} staff={staff} canEdit={canEdit} defaultPayerId={project.ownerId} addCostRef={addCostRef} />
      ) : tab === "Tài liệu" ? (
        <ProjectDocuments projectId={project.id} canEdit={canEdit} />
      ) : (
        <section className="rounded-xl border border-dashed border-line bg-soft px-4 py-16 text-center">
          <h2 className="text-base font-semibold text-ink">{tab}</h2>
          <p className="mt-2 text-sm text-muted">Chưa nối dữ liệu.</p>
        </section>
      )}
    </div>
  );
}
