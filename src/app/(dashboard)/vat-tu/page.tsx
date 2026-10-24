import { Suspense } from "react";
import type { Metadata } from "next";
import { hasCapability } from "@/shared/auth/types";
import { requireUser } from "@/shared/auth/session";
import { rethrowPage } from "@/shared/page";
import { isMaterialPriceBasis } from "@/shared/catalog/materials";
import { MaterialBoard } from "@/modules/materials/material-board";
import { getMaterial, listMaterialSuppliers, listMaterials } from "@/modules/materials/service";

export const metadata: Metadata = { title: "Danh mục vật tư" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Đang tải vật tư...</p>}>
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
  const groupName = one(query.nhom);
  const basis = one(query["tinh-tien"]);
  const supplierId = one(query.ncc);
  const page = Number(one(query.trang) || 1);
  const mo = one(query.mo);
  const hoSo = one(query["ho-so"]);
  const canCreate = hasCapability(user, "inventory.create");
  const canUpdate = hasCapability(user, "inventory.update") || canCreate;
  const initialMode = mo === "them" && canCreate ? "them" : (mo === "sua" && canUpdate && hoSo) || (mo === "xem" && hoSo) ? mo : null;
  let data: Awaited<ReturnType<typeof listMaterials>> | null = null;
  let suppliers: Awaited<ReturnType<typeof listMaterialSuppliers>> = [];
  try {
    suppliers = await listMaterialSuppliers(user);
    const supplier = suppliers.find((item) => item.id === supplierId);
    data = await listMaterials(user, {
      q,
      groupName,
      priceBasis: isMaterialPriceBasis(basis) ? basis : "",
      supplierCode: supplier?.code ?? "",
      page,
    });
  } catch (error) {
    rethrowPage(error);
  }
  let opened: Awaited<ReturnType<typeof getMaterial>> | null = null;
  if (hoSo && initialMode && initialMode !== "them") {
    try {
      opened = await getMaterial(user, hoSo);
    } catch (error) {
      rethrowPage(error);
    }
  }
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <MaterialBoard
      rows={data.rows}
      opened={opened}
      q={q}
      groupName={groupName}
      suppliers={suppliers}
      supplierId={suppliers.some((item) => item.id === supplierId) ? supplierId : ""}
      priceBasis={isMaterialPriceBasis(basis) ? basis : ""}
      page={data.page}
      pages={pages}
      total={data.total}
      canCreate={canCreate}
      canUpdate={canUpdate}
      initialMode={initialMode === "them" || initialMode === "sua" || initialMode === "xem" ? initialMode : null}
      initialId={hoSo}
    />
  );
}
