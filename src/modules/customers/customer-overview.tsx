"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { ArchiveButton } from "@/modules/customers/contact-panel";
import { customerTypeLabel } from "@/modules/customers/labels";

const tabs = [
  "Thông tin chung",
  "Hợp đồng",
  "Công trình",
  "Đợt thanh toán",
  "Hóa đơn",
  "Hóa đơn đến hạn",
  "Tài liệu",
  "Ghi chú",
] as const;

type Tab = (typeof tabs)[number];

const stats = [
  { label: "Tổng công trình", value: "0" },
  { label: "Tổng thu", value: "0" },
  { label: "Hóa đơn đến hạn", value: "0" },
];

export function CustomerOverview({
  customer,
  canUpdate,
  canDelete,
  canQuote,
  canProject,
  onEdit,
  onDelete,
  onQuote,
  onProject,
  onChanged,
}: {
  customer: {
    id: string;
    name: string;
    code: string;
    type: string;
    status: string;
    address: string;
    phone: string;
    fax: string;
    email: string;
    altPhone: string;
    taxCode: string;
    invoiceAddress: string;
    representativeName: string;
    representativeTitle: string;
    executorName: string;
    executorTitle: string;
    invoiceEmail: string;
    note: string;
    bankAccounts: { id: string; bankName: string; accountNumber: string; isPrimary: boolean }[];
  };
  canUpdate: boolean;
  canDelete: boolean;
  canQuote: boolean;
  canProject: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onQuote: () => void;
  onProject: () => void;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Thông tin chung");
  const typeLabel = customerTypeLabel[customer.type as keyof typeof customerTypeLabel] ?? customer.type;

  return (
    <div className="space-y-4">
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
      {tab === "Thông tin chung" ? (
        <div className="space-y-4 rounded-xl bg-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-ink">{customer.name}</h2>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-primary">{typeLabel}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{customer.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canQuote && customer.status === "dang_dung" ? (
                <Button type="button" size="sm" variant="outline" onClick={onQuote}>Lập báo giá</Button>
              ) : null}
              {canProject && customer.status === "dang_dung" ? (
                <Button type="button" size="sm" variant="outline" onClick={onProject}>Tạo công trình</Button>
              ) : null}
              {canUpdate ? (
                <Button type="button" size="sm" variant="outline" onClick={onEdit}><Pencil /> Sửa</Button>
              ) : null}
              {canDelete ? (
                <Button type="button" size="sm" variant="outline" className="text-danger hover:text-danger" onClick={onDelete}>
                  <Trash2 /> Xóa
                </Button>
              ) : null}
              {customer.status === "dang_dung" && canDelete ? <ArchiveButton id={customer.id} onDone={onChanged} /> : null}
            </div>
          </div>
          <section className="rounded-xl border border-line bg-white p-4">
            <BangThongTin
              rows={[
                { label: "Địa chỉ liên lạc", value: customer.address, wide: true },
                { label: "Email liên lạc", value: customer.email },
                { label: "Số điện thoại liên lạc", value: customer.altPhone },
              ]}
            />
          </section>
          <section className="rounded-xl border border-line bg-white p-4">
            <h3 className="text-sm font-semibold text-ink">Thông tin ký kết hợp đồng và xuất hóa đơn</h3>
            <div className="mt-3">
              <BangThongTin
                rows={[
                  { label: "Mã số thuế", value: customer.taxCode },
                  { label: "Địa chỉ đăng ký kinh doanh", value: customer.invoiceAddress },
                  { label: "Số điện thoại", value: customer.phone },
                  { label: "Số fax", value: customer.fax },
                  { label: "Người đại diện", value: customer.representativeName },
                  { label: "Chức vụ", value: customer.representativeTitle },
                  { label: "Người thực hiện hợp đồng", value: customer.executorName },
                  { label: "Chức vụ ", value: customer.executorTitle },
                ]}
              />
            </div>
            {customer.bankAccounts.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3">
                <h4 className="text-sm font-semibold text-ink">Tài khoản ngân hàng</h4>
                <ul className="mt-2 space-y-1 text-sm text-ink">
                  {customer.bankAccounts.map((item) => (
                    <li key={item.id}>
                      {item.accountNumber} · {item.bankName}
                      {item.isPrimary ? " · Chính" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-4 border-t border-line pt-3">
              <BangThongTin
                rows={[
                  { label: "Email nhận hóa đơn", value: customer.invoiceEmail },
                  { label: "Ghi chú", value: customer.note },
                ]}
              />
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <article key={item.label} className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="text-sm text-muted">{item.label}</p>
                <p className="mt-1 text-[28px] font-semibold leading-none text-ink">{item.value}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Công trình" headers={["Mã", "Tên", "Giai đoạn"]} />
            <Panel title="Hóa đơn" headers={["Số hóa đơn", "Ngày", "Số tiền", "Trạng thái"]} />
          </div>
        </div>
      ) : (
        <section className="rounded-xl border border-dashed border-line bg-soft px-4 py-16 text-center">
          <h2 className="text-base font-semibold text-ink">{tab}</h2>
          <p className="mt-2 text-sm text-muted">Chưa nối dữ liệu.</p>
        </section>
      )}
    </div>
  );
}

function BangThongTin({ rows }: { rows: { label: string; value: string; wide?: boolean }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className={row.wide ? "sm:col-span-2" : undefined}>
          <dt className="text-xs text-muted">{row.label.trim()}</dt>
          <dd className="mt-0.5 text-sm text-ink">{row.value.trim() || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ title, headers }: { title: string; headers: string[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <h3 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow className="bg-soft hover:bg-soft">
            {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={headers.length} className="py-8 text-center text-sm text-muted">Chưa có dữ liệu.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}
