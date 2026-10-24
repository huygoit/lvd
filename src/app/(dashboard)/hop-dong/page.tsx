import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { buttonPrimary, inputClass, panelClass } from "@/shared/components/controls";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { formatVnd } from "@/shared/lib/money";
import { rethrowPage } from "@/shared/page";
import { contractInternalLabel, contractKindLabel, signLabel } from "@/modules/contracts/labels";
import { listContracts } from "@/modules/contracts/service";

export const metadata: Metadata = { title: "Hợp đồng" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải hợp đồng...</p>}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function money(value: number | null) {
  return value === null ? "Chưa có" : formatVnd(value);
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const q = one(query.q);
  let rows: Awaited<ReturnType<typeof listContracts>> = [];
  try {
    rows = await listContracts(user, { q });
  } catch (error) {
    rethrowPage(error);
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Hợp đồng</h1>
          <p className="mt-1 text-sm text-muted">Ba loại riêng: thi công, mua bán, mẫu khách hàng. Giá quản trị không hiện nếu chưa được cấp quyền.</p>
        </div>
        {hasCapability(user, "contracts.create") ? <Link href="/hop-dong/moi" className={buttonPrimary}>Lập hợp đồng</Link> : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/hop-dong">
        <input name="q" defaultValue={q} placeholder="Mã, số ký, công trình, điểm, ký hiệu" className={`${inputClass} max-w-sm`} />
        <button className={buttonPrimary}>Lọc</button>
      </form>
      <div className={panelClass}>
        {rows.length === 0 ? <p className="p-4 text-sm text-muted">Chưa có hợp đồng.</p> : (
          <Table>
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead>Mã</TableHead>
                <TableHead>Hợp đồng</TableHead>
                <TableHead>Công trình</TableHead>
                <TableHead>Đối tác</TableHead>
                <TableHead>Nội bộ</TableHead>
                <TableHead>Ký</TableHead>
                <TableHead className="text-right">Giá ký</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><Link href={`/hop-dong/${row.id}`} className="font-semibold text-primary">{row.code}</Link></TableCell>
                  <TableCell className="whitespace-normal">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted">{contractKindLabel[row.kind as keyof typeof contractKindLabel]}{row.signedNumber ? ` · ${row.signedNumber}` : ""}</p>
                  </TableCell>
                  <TableCell>{row.project.code}</TableCell>
                  <TableCell>{row.customer.name}</TableCell>
                  <TableCell><Badge variant="secondary">{contractInternalLabel[row.internalStatus as keyof typeof contractInternalLabel]}</Badge></TableCell>
                  <TableCell>{signLabel[row.signStatus as keyof typeof signLabel]}</TableCell>
                  <TableCell className="text-right">{money(row.declaredSignedTotal ?? row.lineSumSigned)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
