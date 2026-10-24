"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { panelClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { measureUnits } from "@/shared/catalog/units";

type Category = {
  id: string;
  name: string;
  unit: string;
  sortOrder: number;
  active: boolean;
};

export function CategoryBoard({ initial }: { initial: Category[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("bộ");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState("");
  const [overId, setOverId] = useState("");

  async function run(action: () => Promise<{ categories: Category[] }>) {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      setRows(result.categories);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const label = name.trim();
    if (label.length < 2 || unit.trim().length === 0) return;
    void run(async () => {
      const result = await callApi<{ categories: Category[] }>("/api/cai-dat/hang-muc", {
        method: "POST",
        body: JSON.stringify({ name: label, unit }),
      });
      setName("");
      setUnit("bộ");
      return result;
    });
  }

  async function drop(fromId: string, toId: string) {
    setDragId("");
    setOverId("");
    if (!fromId || fromId === toId) return;
    const ids = rows.map((row) => row.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);
    const previous = rows;
    const byId = new Map(rows.map((row) => [row.id, row]));
    setRows(nextIds.map((id) => byId.get(id)!));
    setBusy(true);
    setError("");
    try {
      const result = await callApi<{ categories: Category[] }>("/api/cai-dat/hang-muc", {
        method: "PATCH",
        body: JSON.stringify({ order: nextIds }),
      });
      setRows(result.categories);
    } catch (caught) {
      setRows(previous);
      setError(caught instanceof Error ? caught.message : "Không lưu được thứ tự.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead className="w-10" />
              <TableHead className="w-14">STT</TableHead>
              <TableHead>Hạng mục</TableHead>
              <TableHead className="w-28">Đơn vị</TableHead>
              <TableHead className="w-36">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-white">
              <TableCell />
              <TableCell className="text-xs text-muted">Mới</TableCell>
              <TableCell>
                <Input
                  value={name}
                  placeholder="Cửa cuốn nan nhôm có mô tơ"
                  aria-label="Tên hạng mục mới"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add();
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <select
                  value={unit}
                  aria-label="Đơn vị hạng mục mới"
                  className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
                  onChange={(event) => setUnit(event.target.value)}
                >
                  {measureUnits.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" disabled={busy || name.trim().length < 2 || unit.trim().length === 0} onClick={add}>
                  Thêm
                </Button>
              </TableCell>
            </TableRow>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-sm text-muted">
                  Chưa có hạng mục. Gõ tên ở dòng Mới rồi bấm Thêm.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(overId === row.id && dragId && dragId !== row.id && "bg-soft")}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragId) setOverId(row.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void drop(event.dataTransfer.getData("text/plain"), row.id);
                  }}
                >
                  <TableCell>
                    <button
                      type="button"
                      draggable={!busy}
                      aria-label={`Kéo để sắp ${row.name}`}
                      className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-muted hover:bg-soft active:cursor-grabbing"
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", row.id);
                        setDragId(row.id);
                      }}
                      onDragEnd={() => {
                        setDragId("");
                        setOverId("");
                      }}
                    >
                      <GripVertical className="size-4" />
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted">{index + 1}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Input
                      defaultValue={row.name}
                      key={`${row.id}-${row.name}`}
                      aria-label={`Tên ${row.name}`}
                      disabled={busy}
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next === row.name) return;
                        void run(() =>
                          callApi<{ categories: Category[] }>(`/api/cai-dat/hang-muc/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ name: next }),
                          }),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      defaultValue={row.unit}
                      key={`${row.id}-dv-${row.unit}`}
                      aria-label={`Đơn vị ${row.name}`}
                      disabled={busy}
                      className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next === row.unit) return;
                        void run(() =>
                          callApi<{ categories: Category[] }>(`/api/cai-dat/hang-muc/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ unit: next }),
                          }),
                        );
                      }}
                    >
                      {measureUnits.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={row.active ? "secondary" : "outline"}
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          callApi<{ categories: Category[] }>(`/api/cai-dat/hang-muc/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ active: !row.active }),
                          }),
                        )
                      }
                    >
                      {row.active ? "Đang dùng" : "Ngừng dùng"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
