"use client";

import { useState } from "react";
import { callApi } from "@/shared/client/api";
import { panelClass } from "@/shared/components/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

type Choice = { id: string; name: string; active: boolean };
type StaffRow = { id: string; name: string; active: boolean; departmentId: string; positionId: string };

const cell = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-ink outline-none hover:border-line focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";

function options(rows: Choice[], selected: string) {
  return rows.filter((row) => row.active || row.id === selected);
}

export function StaffOrgTable({
  staff: initial,
  departments,
  positions,
}: {
  staff: StaffRow[];
  departments: Choice[];
  positions: Choice[];
}) {
  const [staff, setStaff] = useState(initial);
  const [error, setError] = useState("");

  async function save(row: StaffRow, patch: { departmentId?: string; positionId?: string }) {
    const previous = staff;
    setStaff(staff.map((item) => (item.id === row.id ? { ...item, ...patch } : item)));
    setError("");
    try {
      const result = await callApi<{ staff: StaffRow[] }>("/api/cai-dat/nhan-su", {
        method: "PATCH",
        body: JSON.stringify({ staffId: row.id, ...patch }),
      });
      setStaff(result.staff);
    } catch (caught) {
      setStaff(previous);
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-ink">Nhân sự</h2>
      <p className="text-sm text-muted">Chọn phòng ban và chức vụ ngay trên dòng. Đổi lựa chọn là lưu.</p>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead>Nhân sự</TableHead>
              <TableHead className="w-64">Phòng ban</TableHead>
              <TableHead className="w-64">Chức vụ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-sm text-muted">Chưa có nhân sự.</TableCell>
              </TableRow>
            ) : staff.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <span className="font-medium">{row.name}</span>
                  {row.active ? null : <span className="ml-2 text-xs text-muted">Ngừng hoạt động</span>}
                </TableCell>
                <TableCell className="p-1">
                  <select
                    aria-label={`Phòng ban của ${row.name}`}
                    className={cell}
                    value={row.departmentId}
                    onChange={(event) => void save(row, { departmentId: event.target.value })}
                  >
                    <option value="">Chưa xếp</option>
                    {options(departments, row.departmentId).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="p-1">
                  <select
                    aria-label={`Chức vụ của ${row.name}`}
                    className={cell}
                    value={row.positionId}
                    onChange={(event) => void save(row, { positionId: event.target.value })}
                  >
                    <option value="">Chưa xếp</option>
                    {options(positions, row.positionId).map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
