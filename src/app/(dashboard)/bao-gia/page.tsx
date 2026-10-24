import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { hasAnyCapability, hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { buttonPrimary, inputClass, panelClass, selectClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatYmd, todayYmd } from "@/shared/lib/dates";
import { formatVnd } from "@/shared/lib/money";
import { rethrowPage } from "@/shared/page";
import { customerFollowLabel, internalLabel } from "@/modules/customers/labels";
import { customerOptions, listStaff } from "@/modules/customers/service";
import { QuoteEditor } from "@/modules/quotations/editor";
import { QuoteRowActions, QuoteSheet } from "@/modules/quotations/quote-sheet";
import { getQuotation, listQuotations } from "@/modules/quotations/service";
import { listProjects } from "@/modules/projects/service";
import { listQuoteCategories } from "@/modules/settings/categories";

export const metadata: Metadata = { title: "Báo giá" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải báo giá...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  let rows: Awaited<ReturnType<typeof listQuotations>> = [];
  try {
    rows = await listQuotations(user, {
      q: one(query.q),
      internal: one(query["noi-bo"]),
      customer: one(query.khach),
    });
  } catch (error) {
    rethrowPage(error);
  }
  const staff = await listStaff();
  const names = new Map(staff.map((item) => [item.id, item.name]));
  const canDelete = hasAnyCapability(user, ["quotations.update", "quotations.create"]);
  const editId = one(query.mo) === "sua" ? one(query.id) : "";
  let sheet: ReactNode = null;
  if (editId) {
    let detail: Awaited<ReturnType<typeof getQuotation>> | null = null;
    try {
      detail = await getQuotation(user, editId);
    } catch (error) {
      rethrowPage(error);
    }
    const requested = one(query.v);
    const version = detail?.versions.find((item) => item.id === requested) ?? detail?.versions[0];
    if (detail && version) {
      const editable = version.internalStatus === "nhap" || version.internalStatus === "yeu_cau_chinh";
      const customers = hasAnyCapability(user, ["customers.view", "customers.view.assigned"]) ? await customerOptions(user) : [];
      const projects = hasAnyCapability(user, ["projects.view", "projects.view.assigned"]) ? await listProjects(user, {}) : [];
      const categories = await listQuoteCategories();
      sheet = (
        <QuoteSheet title={`${detail.code} · phiên bản ${version.number}`} description={`${detail.customer.name} · ${detail.project.name}`}>
          <QuoteEditor
            key={`${version.id}-${version.revision}`}
            sheet
            quoteId={detail.id}
            code={detail.code}
            customerName={detail.customer.name}
            projectName={detail.project.name}
            today={todayYmd(new Date())}
            staff={detail.staff}
            customers={customers}
            projects={projects.map((item) => ({ id: item.id, customerId: item.customerId, code: item.code, name: item.name }))}
            versions={detail.versions.map((item) => ({ id: item.id, number: item.number }))}
            categories={categories}
            flags={{
              edit: editable && hasAnyCapability(user, ["quotations.update", "quotations.create"]),
              submit: editable && hasAnyCapability(user, ["quotations.submit", "quotations.create"]),
              withdraw: version.internalStatus === "cho_duyet" && hasAnyCapability(user, ["quotations.withdraw", "quotations.submit"]),
              approve: version.internalStatus === "cho_duyet" && hasCapability(user, "quotations.approve") && version.authorId !== user.id,
              requestChange: version.internalStatus === "cho_duyet" && hasAnyCapability(user, ["quotations.request_change", "quotations.approve"]) && version.authorId !== user.id,
              deliver: version.internalStatus === "da_duyet" && hasAnyCapability(user, ["quotations.deliver", "quotations.create"]),
              respond: version.internalStatus === "da_duyet" && version.deliveries.length > 0 && hasAnyCapability(user, ["quotations.respond", "quotations.create"]),
              version: hasAnyCapability(user, ["quotations.version", "quotations.create"]),
              copy: hasAnyCapability(user, ["quotations.copy", "quotations.create"]),
              exception: hasCapability(user, "quotations.approve"),
            }}
            version={{
              id: version.id,
              number: version.number,
              revision: version.revision,
              title: version.title,
              quoteDate: version.quoteDate,
              validUntil: version.validUntil,
              authorId: version.authorId,
              ownerId: version.ownerId,
              internalStatus: version.internalStatus,
              customerStatus: version.customerStatus,
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
              taxBps: version.taxBps,
              warrantyMonths: version.warrantyMonths,
              advanceAmount: version.advanceAmount,
              advanceDays: version.advanceDays,
              paymentDays: version.paymentDays,
              changeReason: version.changeReason,
              items: version.items.map((item) => ({
                id: item.id,
                sourceItemId: item.sourceItemId,
                groupKey: item.groupKey,
                name: item.name,
                spec: item.spec,
                unit: item.unit,
                widthMm: item.widthMm,
                heightMm: item.heightMm,
                quantity: item.quantity,
                mainUnitPrice: item.mainUnitPrice,
                accessoryUnitPrice: item.accessoryUnitPrice,
                note: item.note,
              })),
              files: version.files,
              approvals: version.approvals.map((item) => ({ id: item.id, action: item.action, reason: item.reason, actorId: item.actorId, createdAt: item.createdAt })),
              deliveries: version.deliveries.map((item) => ({ id: item.id, channel: item.channel, recipientName: item.recipientName, note: item.note, sentAt: item.sentAt })),
              responses: version.responses.map((item) => ({ id: item.id, status: item.status, occurredOn: item.occurredOn, confirmerName: item.confirmerName, note: item.note })),
            }}
          />
        </QuoteSheet>
      );
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Báo giá</h1>
          <p className="mt-1 text-sm text-muted">Danh sách theo phiên bản mới nhất. Sửa mở ngay tại đây, chân màn hình giữ nút lưu.</p>
        </div>
        {hasCapability(user, "quotations.create") ? <Link href="/bao-gia/moi" className={buttonPrimary}>Lập báo giá</Link> : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/bao-gia">
        <input name="q" defaultValue={one(query.q)} placeholder="Mã, khách, công trình" className={`${inputClass} max-w-sm`} />
        <select name="noi-bo" defaultValue={one(query["noi-bo"])} className={`${selectClass} max-w-[180px]`}>
          <option value="">Mọi trạng thái nội bộ</option>
          {Object.entries(internalLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="khach" defaultValue={one(query.khach)} className={`${selectClass} max-w-[200px]`}>
          <option value="">Mọi phản hồi khách</option>
          {Object.entries(customerFollowLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        {rows.length === 0 ? <p className="p-4 text-sm text-muted">Chưa có báo giá.</p> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead>Mã</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Công trình</TableHead>
                <TableHead>Nội bộ</TableHead>
                <TableHead>Khách</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/bao-gia?mo=sua&id=${row.id}`} className="font-semibold text-primary">{row.code}</Link>
                    <p className="text-xs text-muted">Phiên bản {row.versionNumber}</p>
                  </TableCell>
                  <TableCell className="whitespace-normal">{row.customer}</TableCell>
                  <TableCell className="whitespace-normal">{row.project}</TableCell>
                  <TableCell>
                    <Badge variant={row.internalStatus === "da_duyet" ? "default" : "secondary"}>
                      {internalLabel[row.internalStatus as keyof typeof internalLabel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customerFollowLabel[row.customerStatus as keyof typeof customerFollowLabel]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted">{formatYmd(row.quoteDate)} · {names.get(row.ownerId) ?? ""}</TableCell>
                  <TableCell className="text-right font-semibold">{formatVnd(row.posttax)}</TableCell>
                  <TableCell className="text-right">
                    <QuoteRowActions id={row.id} code={row.code} canDelete={canDelete} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {sheet}
    </div>
  );
}
