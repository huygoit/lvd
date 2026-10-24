"use client";

import { useState } from "react";
import { CatalogTable } from "@/modules/settings/catalog-table";
import { StaffOrgTable } from "@/modules/settings/staff-org-table";

type Choice = { id: string; name: string; active: boolean };
type StaffRow = { id: string; name: string; active: boolean; departmentId: string; positionId: string };

export function OrgScreen({
  kind,
  label,
  placeholder,
  endpoint,
  listKey,
  departments,
  positions,
  staff,
}: {
  kind: "phong" | "chuc-vu";
  label: string;
  placeholder: string;
  endpoint: string;
  listKey: string;
  departments: Choice[];
  positions: Choice[];
  staff: StaffRow[];
}) {
  const [departmentRows, setDepartmentRows] = useState(departments);
  const [positionRows, setPositionRows] = useState(positions);
  return (
    <div className="space-y-6">
      <CatalogTable
        initial={kind === "phong" ? departments : positions}
        label={label}
        placeholder={placeholder}
        endpoint={endpoint}
        listKey={listKey}
        onSaved={kind === "phong" ? setDepartmentRows : setPositionRows}
      />
      <StaffOrgTable staff={staff} departments={departmentRows} positions={positionRows} />
    </div>
  );
}
