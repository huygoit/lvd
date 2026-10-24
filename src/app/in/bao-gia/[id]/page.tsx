import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/shared/auth/session";
import { formatCount } from "@/shared/lib/money";
import { readVnd } from "@/shared/lib/vnd-words";
import { rethrowPage } from "@/shared/page";
import { placeAndDate, printCode, quoteClauses, quoteIntro } from "@/modules/quotations/document";
import { PrintButton } from "@/modules/quotations/print-button";
import { getQuotation } from "@/modules/quotations/service";

export const metadata: Metadata = { title: "In báo giá" };

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
  const author = detail.staff.find((item) => item.id === version.authorId)?.name ?? "";
  const clauses = quoteClauses(version);
  const spoken = version.totals.retail ? version.totals.pretax : version.totals.posttax;
  const words = version.totals.retail
    ? `Bằng chữ: ${readVnd(spoken)}.`
    : `Bằng chữ (tổng cộng đã gồm thuế): ${readVnd(spoken)}.`;
  return (
    <main className="mx-auto max-w-[210mm] bg-white px-8 py-8 text-ink shadow-[var(--shadow-card)] print:shadow-none">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print { .no-print { display: none !important; } }
        .sheet table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .sheet th, .sheet td { border: 1px solid #cbd5e1; padding: 4px 5px; vertical-align: top; }
        .sheet th { background: #0b1f44; color: white; font-weight: 600; text-align: center; }
        .sheet .num { text-align: right; white-space: nowrap; }
        .sheet .sum td { font-weight: 700; background: #f8fafc; }
        .watermark { position: fixed; inset: 35% 8%; z-index: 1; display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 700; color: rgba(185, 28, 28, 0.16); transform: rotate(-22deg); pointer-events: none; }
      `}</style>
      {draft ? <div className="watermark">BẢN NHÁP</div> : null}
      <div className="no-print mb-4 flex gap-2">
        <Link href={`/bao-gia/${detail.id}?v=${version.id}`} className="text-sm font-semibold text-primary">Về báo giá</Link>
        <PrintButton />
      </div>
      <article className="sheet">
        <header className="flex items-start justify-between gap-6 border-b-2 border-navy pb-3">
          <div>
            <p className="text-base font-bold tracking-wide text-navy">{version.companyName}</p>
            <p className="mt-1 text-xs">{version.companyAddress}</p>
            <p className="text-xs">MST: {version.companyTaxCode} – ĐT: {version.companyPhone}</p>
            <p className="text-xs">Email: {version.companyEmail}</p>
          </div>
          <p className="shrink-0 text-right text-xs">{placeAndDate(version.quoteDate)}</p>
        </header>
        <h1 className="mt-5 text-center text-xl font-bold tracking-wide text-navy">BẢNG BÁO GIÁ</h1>
        <p className="text-center text-sm font-semibold">Số: {printCode(detail.customer.code)}</p>
        <p className="mt-4 text-sm">Kính gửi: {version.customerName}</p>
        <p className="text-sm">Địa chỉ: {version.customerAddress}</p>
        <p className="mt-3 text-sm">{quoteIntro(version.title, version.projectLocation)}</p>
        <table className="mt-3">
          <thead>
            <tr>
              <th>STT</th>
              <th>Nội dung / Hạng mục</th>
              <th>Đơn vị tính</th>
              <th>Chiều rộng (mm)</th>
              <th>Chiều cao (mm)</th>
              <th>Số lượng (bộ)</th>
              <th>Đơn giá cửa (VND)</th>
              <th>Đơn giá phụ kiện (VND)</th>
              <th>Thành tiền trước thuế (VND)</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {version.items.map((item, index) => (
              <tr key={item.id}>
                <td className="num">{index + 1}</td>
                <td>{item.name}</td>
                <td>{item.unit}</td>
                <td className="num">{blank(item.widthMm)}</td>
                <td className="num">{blank(item.heightMm)}</td>
                <td className="num">{formatCount(item.quantity)}</td>
                <td className="num">{formatCount(item.mainUnitPrice)}</td>
                <td className="num">{item.accessoryUnitPrice ? formatCount(item.accessoryUnitPrice) : ""}</td>
                <td className="num">{formatCount(item.pretax)}</td>
                <td>{item.note}</td>
              </tr>
            ))}
            {version.totals.retail ? (
              <tr className="sum">
                <td />
                <td colSpan={7}>TỔNG CỘNG</td>
                <td className="num">{formatCount(version.totals.pretax)}</td>
                <td />
              </tr>
            ) : (
              <>
                <tr className="sum">
                  <td />
                  <td colSpan={7}>Cộng tiền hàng (trước thuế)</td>
                  <td className="num">{formatCount(version.totals.pretax)}</td>
                  <td />
                </tr>
                <tr className="sum">
                  <td />
                  <td colSpan={7}>Thuế giá trị gia tăng ({version.totals.taxBps / 100}%)</td>
                  <td className="num">{formatCount(version.totals.tax)}</td>
                  <td />
                </tr>
                <tr className="sum">
                  <td />
                  <td colSpan={7}>TỔNG CỘNG (đã gồm thuế)</td>
                  <td className="num">{formatCount(version.totals.posttax)}</td>
                  <td />
                </tr>
              </>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-sm italic">{words}</p>
        <h2 className="mt-4 text-sm font-semibold">Điều kiện báo giá:</h2>
        <ul className="mt-1 space-y-1 text-sm">
          {clauses.map((line) => (
            <li key={line}>- {line}</li>
          ))}
        </ul>
        <div className="mt-10 grid grid-cols-2 text-center text-sm">
          <div>
            <p className="font-semibold">XÁC NHẬN CỦA KHÁCH HÀNG</p>
          </div>
          <div>
            <p className="font-semibold">ĐẠI DIỆN CÔNG TY</p>
            <p className="mt-16 font-semibold">{version.representativeName}</p>
            <p className="mt-2 text-xs">Người lập báo giá: {author}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
