import { Filter } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { buttonPrimary, inputClass, panelClass } from "@/shared/components/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { rethrowPage } from "@/shared/page";
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
          <p className="mt-1 text-sm text-muted">Số HĐ, tên, công trình, khách, báo giá, ngày ký.</p>
        </div>
        {hasCapability(user, "contracts.create") ? (
          <Link href="/hop-dong/moi" className={buttonPrimary}>
            Lập hợp đồng
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap gap-2" action="/hop-dong">
        <input name="q" defaultValue={q} placeholder="Số HĐ, tên, công trình, khách, báo giá" className={`${inputClass} max-w-sm`} />
        <button className={buttonPrimary}>
          <Filter className="size-4" aria-hidden /> Lọc
        </button>
      </form>
      <div className={panelClass}>
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted">Chưa có hợp đồng.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead>Số hợp đồng</TableHead>
                <TableHead>Tên hợp đồng</TableHead>
                <TableHead>Công trình</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Báo giá</TableHead>
                <TableHead>Ngày ký</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/hop-dong/${row.id}`} className="font-semibold text-primary">
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-normal font-medium">{row.name}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/cong-trinh/${row.project.id}`} className="font-medium text-primary">
                      {row.project.code} · {row.project.name}
                    </Link>
                  </TableCell>
                  <TableCell>{row.customer.name}</TableCell>
                  <TableCell>
                    {row.quotation ? (
                      <Link
                        href={`/bao-gia?mo=sua&id=${row.quotation.id}&v=${row.quotation.versionId}`}
                        className="text-primary"
                      >
                        {row.quotation.code}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell>{row.signedOn || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
