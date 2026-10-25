"use client";

import { useEffect, useState } from "react";
import { Banknote, Pencil, PiggyBank, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { formatCount, formatVnd } from "@/shared/lib/money";
import { ProjectProgress } from "@/modules/projects/project-progress";
import { GHI_CHU_GIA_TRI, type NhomChiPhi, type SoTongQuan } from "@/modules/projects/overview-figures";

type Bang = SoTongQuan & { nhomChiPhi: NhomChiPhi[]; khoanChung: { name: string; rateBps: number }[]; hienChiPhiChung: boolean };

function chuThichChiPhi(bang: Bang) {
  const phan = [
    ...(bang.hienChiPhiChung ? ["chi phí chung"] : []),
    "đơn hàng đã lưu",
    "chi phí công trình",
  ];
  const cau = phan.join(" + ");
  return cau.charAt(0).toLocaleUpperCase("vi") + cau.slice(1);
}

function hienTyLe(rateBps: number) {
  const tram = rateBps / 100;
  const text = Number.isInteger(tram) ? String(tram) : tram.toFixed(2).replace(/0$/, "").replace(".", ",");
  return `${text}%`;
}

type HoSo = {
  id: string;
  code: string;
  name: string;
  customerName: string;
  ownerName: string;
  stage: string;
  location: string;
  venture: string;
  bidPackage: string;
  startedOn: string;
  endedOn: string;
};

function ngay(value: string) {
  const khop = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!khop) return "";
  return `${khop[3]}/${khop[2]}/${khop[1]}`;
}

function mauLoi(value: number | null) {
  if (value === null) return "text-muted";
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-ink";
}

function SoLon({ value, thieu, mau }: { value: number | null; thieu: string | null; mau: string }) {
  if (value === null) {
    return <p className="mt-2 text-lg font-semibold leading-snug tracking-tight text-muted">{thieu}</p>;
  }
  return <p className={cn("mt-2 whitespace-nowrap text-2xl font-semibold leading-none tracking-tight tabular-nums", mau)}>{formatVnd(value)}</p>;
}

function TheSo({
  tieuDe,
  icon: Icon,
  vien,
  value,
  thieu,
  mau,
  chuThich,
}: {
  tieuDe: string;
  icon: LucideIcon;
  vien: string;
  value: number | null;
  thieu: string | null;
  mau: string;
  chuThich: string;
}) {
  return (
    <article className="flex flex-col rounded-[18px] border border-line bg-white px-4 py-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="pt-1 text-sm font-medium text-muted">{tieuDe}</h3>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", vien)}>
          <Icon className="size-4" strokeWidth={2} />
        </span>
      </div>
      <SoLon value={value} thieu={thieu} mau={mau} />
      <p className="mt-3 text-xs leading-5 text-muted">{chuThich}</p>
    </article>
  );
}

function Dong({ nhan, giaTri, dam }: { nhan: string; giaTri: string; dam?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3 last:border-b-0">
      <dt className="text-sm text-muted">{nhan}</dt>
      <dd className={cn("text-right text-sm tabular-nums text-ink", dam && "text-base font-semibold")}>{giaTri}</dd>
    </div>
  );
}

export function ProjectFinanceOverview({
  project,
  canEdit,
  canQuote,
  onEdit,
  onQuote,
}: {
  project: HoSo;
  canEdit: boolean;
  canQuote: boolean;
  onEdit: () => void;
  onQuote: () => void;
}) {
  const [tai, setTai] = useState<{ id: string; bang: Bang | null; loi: string } | null>(null);
  const khop = tai?.id === project.id ? tai : null;
  const bang = khop?.bang ?? null;
  const loi = khop?.loi ?? "";

  useEffect(() => {
    const huy = new AbortController();
    const id = project.id;
    callApi<Bang>(`/api/cong-trinh/${id}/tong-quan`, { signal: huy.signal })
      .then((data) => {
        if (!huy.signal.aborted) setTai({ id, bang: data, loi: "" });
      })
      .catch((error: unknown) => {
        if (huy.signal.aborted) return;
        setTai({ id, bang: null, loi: error instanceof Error ? error.message : "Không tải được số tổng quan." });
      });
    return () => huy.abort();
  }, [project.id]);

  const ngan = [
    project.ownerName ? `Phụ trách ${project.ownerName}` : "",
    project.startedOn ? ngay(project.startedOn) : "",
    project.endedOn ? ngay(project.endedOn) : "",
  ].filter(Boolean);

  const thueNhan = !bang
    ? ""
    : bang.vatPercent === null
      ? "Chưa nhập thuế"
      : bang.tienThue === null
        ? "Chưa có hạng mục"
        : `${bang.vatPercent}% · ${formatVnd(bang.tienThue)}`;

  return (
    <section className="rounded-[18px] bg-page px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Tổng quan công trình</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{project.name}</h2>
          <p className="mt-1 text-sm text-muted">{project.customerName} · {project.code}</p>
          {ngan.length > 0 ? <p className="mt-1 text-sm text-muted">{ngan.join(" · ")}</p> : null}
          <p className="mt-3 text-sm text-muted">{GHI_CHU_GIA_TRI}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-4 sm:w-auto sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {canQuote ? <Button type="button" size="sm" variant="outline" onClick={onQuote}>Lập báo giá</Button> : null}
            {canEdit ? <Button type="button" size="sm" variant="outline" onClick={onEdit}><Pencil /> Sửa</Button> : null}
          </div>
          <ProjectProgress stage={project.stage} />
        </div>
      </div>

      {loi ? <p className="mt-8 text-sm text-danger" role="alert">{loi}</p> : null}

      {!bang && !loi ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {["Giá trị", "Chi phí", "Lợi nhuận", "Lợi nhuận ròng"].map((nhan) => (
            <div key={nhan} className="h-28 animate-pulse rounded-[18px] border border-line bg-white" />
          ))}
        </div>
      ) : null}

      {bang ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <TheSo
              tieuDe="Tổng giá trị sau thuế"
              icon={Banknote}
              vien="bg-primary/10 text-primary"
              value={bang.sauThue}
              thieu={bang.thieuSauThue}
              mau="text-ink"
              chuThich={bang.sauThue === null
                ? bang.thieuSauThue === "Chưa nhập thuế"
                  ? "Cần nhập thuế GTGT trên hồ sơ công trình."
                  : "Chưa có dòng hạng mục để tính."
                : `Từ ${formatCount(bang.soHangMuc)} hạng mục · thuế GTGT ${bang.vatPercent}%`}
            />
            <TheSo
              tieuDe="Tổng chi phí"
              icon={Wallet}
              vien="bg-[#fff4e8] text-[#c2410c]"
              value={bang.tongChiPhi}
              thieu={bang.thieuChiPhi}
              mau="text-ink"
              chuThich={bang.tongChiPhi === null ? bang.thieuChiPhi ?? "" : chuThichChiPhi(bang)}
            />
            <TheSo
              tieuDe="Lợi nhuận"
              icon={TrendingUp}
              vien="bg-success/10 text-success"
              value={bang.loiNhuan}
              thieu={bang.thieuLoiNhuan}
              mau={mauLoi(bang.loiNhuan)}
              chuThich={bang.loiNhuan === null ? "Chỉ hiện số khi đủ giá trị sau thuế và tổng chi phí." : "Giá trị sau thuế trừ tổng chi phí, chưa trừ thuế thu nhập doanh nghiệp"}
            />
            <TheSo
              tieuDe="Lợi nhuận ròng"
              icon={PiggyBank}
              vien="bg-[#eefbf4] text-success"
              value={bang.loiNhuanRong}
              thieu={bang.thieuLoiNhuanRong}
              mau={mauLoi(bang.loiNhuanRong)}
              chuThich={bang.ghiChuRong}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-[18px] border border-line bg-white px-5 py-5 shadow-[var(--shadow-card)]">
              <h3 className="text-base font-semibold">Nguồn giá trị</h3>
              <p className="mt-1 text-sm text-muted">Hạng mục đang ghi trên công trình</p>
              <dl className="mt-3">
                <Dong nhan="Số hạng mục" giaTri={formatCount(bang.soHangMuc)} />
                <Dong nhan="Thành tiền trước thuế" giaTri={bang.truocThue === null ? "Chưa có hạng mục" : formatVnd(bang.truocThue)} />
                <Dong nhan="Thuế GTGT" giaTri={thueNhan} />
                <Dong nhan="Sau thuế" giaTri={bang.sauThue === null ? bang.thieuSauThue ?? "—" : formatVnd(bang.sauThue)} dam />
              </dl>
            </section>
            <section className="rounded-[18px] border border-line bg-white px-5 py-5 shadow-[var(--shadow-card)]">
              <h3 className="text-base font-semibold">Nguồn chi phí</h3>
              <p className="mt-1 text-sm text-muted">{bang.hienChiPhiChung ? "Chi phí chung tính trên tổng doanh thu sau thuế của hạng mục. " : ""}Thuế thu nhập = (doanh thu sau thuế − đơn hàng − chi phí công trình) × % hồ sơ công ty.</p>
              <dl className="mt-3">
                {bang.hienChiPhiChung ? (
                  <Dong
                    nhan={bang.khoanChung.length ? `Chi phí chung · ${bang.khoanChung.map((khoan) => `${khoan.name} ${hienTyLe(khoan.rateBps)}`).join(", ")}` : "Chi phí chung"}
                    giaTri={bang.chiPhiChung === null ? "Chưa có doanh thu sau thuế" : formatVnd(bang.chiPhiChung)}
                  />
                ) : null}
                <Dong nhan="Đơn hàng đã lưu" giaTri={formatVnd(bang.tienDonHang)} />
                <Dong nhan="Chi phí công trình" giaTri={formatVnd(bang.tienCongTrinh)} />
                <Dong nhan="Tổng chi phí" giaTri={bang.tongChiPhi === null ? bang.thieuChiPhi ?? "—" : formatVnd(bang.tongChiPhi)} dam />
                <Dong
                  nhan={bang.thueTndnBps === null ? "Thuế thu nhập doanh nghiệp" : `Thuế thu nhập doanh nghiệp · ${hienTyLe(bang.thueTndnBps)}`}
                  giaTri={bang.thueTndn === null ? bang.thieuThueTndn ?? "—" : formatVnd(bang.thueTndn)}
                />
              </dl>
              {bang.nhomChiPhi.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {bang.nhomChiPhi.map((nhom) => (
                    <li key={nhom.nhom} className="flex items-baseline justify-between gap-6 text-sm">
                      <span className="text-muted">{nhom.nhan}</span>
                      <span className="tabular-nums text-ink">{formatVnd(nhom.tien)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
