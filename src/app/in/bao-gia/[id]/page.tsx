import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/auth/session";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { formatCount } from "@/shared/lib/money";
import { readVnd } from "@/shared/lib/vnd-words";
import { rethrowPage } from "@/shared/page";
import { areaFromSizeMilli, formatAreaMilli } from "@/modules/quotations/calc";
import {
  hieuLucHeader,
  labeledLine,
  pickText,
  placeAndDate,
  printCode,
} from "@/modules/quotations/document";
import { PrintFooter } from "@/modules/quotations/print-button";
import { getQuotation } from "@/modules/quotations/service";
import { companyLogoDataUrl, companyParty } from "@/modules/settings/company-profile";

export const metadata: Metadata = { title: "Xem báo giá PDF" };

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <Body params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function blank(value: number | null) {
  return value ? formatCount(value) : "";
}

function khoiLuongIn(item: {
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  areaOverrideMilli: number | null;
}) {
  if (item.areaOverrideMilli != null && item.areaOverrideMilli > 0) {
    return formatAreaMilli(item.areaOverrideMilli);
  }
  if (item.widthMm && item.heightMm && item.quantity) {
    return formatAreaMilli(areaFromSizeMilli(item.widthMm, item.heightMm, item.quantity));
  }
  return "";
}

async function Body({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  let detail: Awaited<ReturnType<typeof getQuotation>> | null = null;
  try {
    detail = await getQuotation(user, id);
  } catch (error) {
    rethrowPage(error);
  }
  if (!detail) notFound();
  const version = detail.versions.find((item) => item.id === one(query.v)) ?? detail.versions[0];
  if (!version) notFound();
  const draft = version.internalStatus !== "da_duyet";
  const author = version.authorName;
  const hieuLuc = hieuLucHeader(version.quoteDate, version.validUntil);
  // Snapshot trống (báo giá cũ) thì lấy từ hồ sơ khách / công ty để bản in đủ Đại diện, Chức vụ.
  const party = await companyParty();
  const tenCongTy = pickText(version.companyName, party.name) || "Công ty TNHH Liên Việt Door";
  const ctyDaiDien = pickText(version.representativeName, party.representativeName);
  const ctyChucVu = pickText(version.representativeTitle, party.representativeTitle);
  const khachDaiDien = pickText(version.customerRepresentativeName, detail.customer.representativeName);
  const khachChucVu = pickText(version.customerRepresentativeTitle, detail.customer.representativeTitle);
  const dongCtyDaiDien = labeledLine("Đại diện", ctyDaiDien);
  const dongCtyChucVu = labeledLine("Chức vụ", ctyChucVu);
  const dongKhachDaiDien = labeledLine("Đại diện", khachDaiDien);
  const dongKhachChucVu = labeledLine("Chức vụ", khachChucVu);
  const congTrinh = labeledLine("Công trình", version.projectName);
  const hangMuc = labeledLine("Hạng mục", version.title);
  const ghiChu = String(version.quoteNote ?? "").trim();
  const spoken = version.totals.retail ? version.totals.pretax : version.totals.posttax;
  const words = version.totals.retail
    ? `Bằng chữ: ${readVnd(spoken)}.`
    : `Bằng chữ (tổng cộng đã gồm thuế): ${readVnd(spoken)}.`;
  const logoUrl = await companyLogoDataUrl();
  const isAuthor = version.authorId === user.id;
  // Ai có quyền duyệt đều thấy nút Duyệt khi đang chờ (kể cả người lập).
  const allowApprove = version.internalStatus === "cho_duyet" && hasCapability(user, "quotations.approve");
  // Người lập và người duyệt/gửi đều thấy nút Zalo + email sau khi đã duyệt.
  const allowSend =
    isAuthor ||
    hasCapability(user, "quotations.approve") ||
    hasAnyCapability(user, ["quotations.deliver", "quotations.create"]);
  const allowCreateContract =
    !version.contractId &&
    (isAuthor ||
      hasCapability(user, "quotations.respond") ||
      hasAnyCapability(user, ["quotations.create", "contracts.create"]));
  const recipientName =
    pickText(version.customerRepresentativeName, detail.customer.representativeName) || detail.customer.name;
  return (
    <main className="phieu-in mx-auto max-w-[210mm] bg-white px-8 py-8 pb-28 text-ink shadow-[var(--shadow-card)] print:max-w-none print:px-0 print:py-0 print:pb-0 print:shadow-none">
      <style>{`
        /* Font hệ thống: Chrome Save as PDF không nhúng được Inter biến thiên (Type3) → nhiều máy mở PDF bị lỗi. */
        .phieu-in, .phieu-in * { font-family: "Segoe UI", Arial, Helvetica, sans-serif !important; }
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .no-print, nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }
          .phieu-in { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .sheet { position: relative; }
        .sheet table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .sheet th, .sheet td { border: 1px solid #cbd5e1; padding: 4px 5px; vertical-align: top; }
        .sheet th { background: #067a9e; color: white; font-weight: 600; text-align: center; }
        .sheet .num { text-align: right; white-space: nowrap; }
        .sheet .sum td { font-weight: 700; background: #f8fafc; }
        /* absolute trong sheet, tránh position:fixed + rotate làm PDF lệch/hỏng trên một số máy. */
        .watermark { position: absolute; left: 8%; right: 8%; top: 28%; z-index: 1; text-align: center; font-size: 64px; font-weight: 700; color: rgba(185, 28, 28, 0.14); transform: rotate(-22deg); pointer-events: none; user-select: none; }
      `}</style>
      <PrintFooter
        backHref={`/bao-gia?mo=sua&id=${detail.id}&v=${version.id}`}
        quotationId={detail.id}
        versionId={version.id}
        revision={version.revision}
        code={detail.code}
        customerName={detail.customer.name}
        customerEmail={pickText(version.customerEmail, detail.customer.email)}
        customerPhone={version.customerPhone}
        recipientName={recipientName}
        internalStatus={version.internalStatus}
        customerStatus={version.customerStatus}
        allowApprove={allowApprove}
        allowSend={allowSend}
        allowCreateContract={allowCreateContract}
      />
      <article className="sheet">
        {draft ? <div className="watermark" aria-hidden="true">BẢN NHÁP</div> : null}
        <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-3">
          <div className="flex min-w-0 items-start gap-3">
            {logoUrl ? (
              // Logo từ hồ sơ công ty, nhúng base64 để in ổn định.
              <img src={logoUrl} alt="" className="h-14 w-auto max-w-[7rem] shrink-0 object-contain" />
            ) : null}
            <div className="min-w-0">
              <p className="text-base font-bold tracking-wide text-navy">{version.companyName}</p>
              <p className="mt-1 text-xs">{version.companyAddress}</p>
              <p className="text-xs">
                MST: {version.companyTaxCode} – ĐT: {version.companyPhone}
              </p>
              <p className="text-xs">Email: {version.companyEmail}</p>
            </div>
          </div>
          <div className="shrink-0 space-y-1 text-right text-xs leading-relaxed">
            <p>{placeAndDate(version.quoteDate)}</p>
            {hieuLuc ? <p className="font-medium text-navy">{hieuLuc}</p> : null}
            {author ? <p>Người lập: {author}</p> : null}
          </div>
        </header>
        <h1 className="mt-5 text-center text-xl font-bold tracking-wide text-navy">BẢNG BÁO GIÁ</h1>
        <p className="text-center text-sm font-semibold">Số: {printCode(detail.customer.code)}</p>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm leading-relaxed">
          <p className="col-span-2">
            Kính gửi: <span className="font-bold">{version.customerName}</span>
          </p>
          {dongKhachDaiDien ? <p>{dongKhachDaiDien}</p> : null}
          {dongKhachChucVu ? <p>{dongKhachChucVu}</p> : null}
          {version.customerAddress.trim() ? (
            <p className="col-span-2">Địa chỉ: {version.customerAddress}</p>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm leading-relaxed">
          <p className="col-span-2 font-medium">{tenCongTy}</p>
          {dongCtyDaiDien ? <p>{dongCtyDaiDien}</p> : null}
          {dongCtyChucVu ? <p>{dongCtyChucVu}</p> : null}
        </div>
        <p className="mt-3 text-sm">Xin gửi báo giá với thông tin như sau:</p>
        {congTrinh ? <p className="text-sm">{congTrinh}</p> : null}
        {hangMuc ? <p className="text-sm">{hangMuc}</p> : null}
        <table className="mt-3">
          <thead>
            <tr>
              <th>STT</th>
              <th>Ký hiệu</th>
              <th>Nội dung</th>
              <th>Đơn vị tính</th>
              <th>Rộng (mm)</th>
              <th>Cao (mm)</th>
              <th>Số lượng</th>
              <th>Khối lượng (m2)</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let stt = 0;
              return version.items.map((item) => {
                if (item.calcMethod === "nhom") {
                  return (
                    <tr key={item.id} className="sum">
                      <td />
                      <td />
                      <td colSpan={5} className="whitespace-pre-line font-semibold">
                        {item.name}
                      </td>
                      <td className="num">{khoiLuongIn(item)}</td>
                      <td />
                      <td className="num">{formatCount(item.pretax)}</td>
                    </tr>
                  );
                }
                stt += 1;
                return (
                  <tr key={item.id}>
                    <td className="num">{stt}</td>
                    <td>{item.positionCode}</td>
                    <td className="whitespace-pre-line">{item.name}</td>
                    <td>{item.unit}</td>
                    <td className="num">{blank(item.widthMm)}</td>
                    <td className="num">{blank(item.heightMm)}</td>
                    <td className="num">{item.quantity ? formatCount(item.quantity) : ""}</td>
                    <td className="num">{khoiLuongIn(item)}</td>
                    <td className="num">{item.mainUnitPrice ? formatCount(item.mainUnitPrice) : ""}</td>
                    <td className="num">{formatCount(item.pretax)}</td>
                  </tr>
                );
              });
            })()}
            {version.totals.retail ? (
              <tr className="sum">
                <td />
                <td colSpan={8}>TỔNG CỘNG (TRƯỚC THUẾ)</td>
                <td className="num">{formatCount(version.totals.pretax)}</td>
              </tr>
            ) : (
              <>
                <tr className="sum">
                  <td />
                  <td colSpan={8}>Cộng tiền hàng (trước thuế)</td>
                  <td className="num">{formatCount(version.totals.pretax)}</td>
                </tr>
                <tr className="sum">
                  <td />
                  <td colSpan={8}>Thuế giá trị gia tăng ({version.totals.taxBps / 100}%)</td>
                  <td className="num">{formatCount(version.totals.tax)}</td>
                </tr>
                <tr className="sum">
                  <td />
                  <td colSpan={8}>TỔNG CỘNG (đã gồm thuế)</td>
                  <td className="num">{formatCount(version.totals.posttax)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-right text-sm italic">{words}</p>
        {ghiChu ? (
          <>
            <h2 className="mt-4 text-sm font-semibold">Ghi chú:</h2>
            <p className="mt-1 whitespace-pre-line text-sm">{ghiChu}</p>
          </>
        ) : null}
        <div className="mt-10 grid grid-cols-2 text-center text-sm">
          <div>
            <p className="font-semibold">XÁC NHẬN CỦA KHÁCH HÀNG</p>
            {khachDaiDien ? <p className="mt-16 font-semibold">{khachDaiDien}</p> : <p className="mt-16">&nbsp;</p>}
            {khachChucVu ? <p className="text-xs text-muted">{khachChucVu}</p> : null}
          </div>
          <div>
            <p className="font-semibold">ĐẠI DIỆN CÔNG TY</p>
            {ctyDaiDien ? <p className="mt-16 font-semibold">{ctyDaiDien}</p> : <p className="mt-16">&nbsp;</p>}
            {ctyChucVu ? <p className="text-xs text-muted">{ctyChucVu}</p> : null}
          </div>
        </div>
      </article>
    </main>
  );
}
