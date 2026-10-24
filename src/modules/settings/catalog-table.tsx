"use client";

import { useRef, useState } from "react";
import { callApi } from "@/shared/client/api";
import { panelClass } from "@/shared/components/controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

type Row = { id: string; name: string; active: boolean };

const cell = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70 hover:border-line focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";

export function CatalogTable({
  initial,
  label,
  placeholder,
  endpoint,
  listKey,
  onSaved,
}: {
  initial: Row[];
  label: string;
  placeholder: string;
  endpoint: string;
  listKey: string;
  onSaved?: (rows: Row[]) => void;
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const creating = useRef(false);

  function take(body: Record<string, unknown>) {
    const next = body[listKey];
    if (!Array.isArray(next)) throw new Error("Không lưu được.");
    const saved = next as Row[];
    setRows(saved);
    setNames({});
    onSaved?.(saved);
  }

  async function create(raw: string) {
    const labelText = raw.trim();
    if (labelText.length < 2 || creating.current) return;
    creating.current = true;
    setError("");
    try {
      const result = await callApi<Record<string, unknown>>(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: labelText }),
      });
      take(result);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      creating.current = false;
    }
  }

  async function rename(row: Row, raw: string) {
    const next = raw.trim();
    if (next === row.name) return;
    if (next.length < 2) {
      setNames((current) => ({ ...current, [row.id]: row.name }));
      setError(`Tên ${label.toLocaleLowerCase("vi")} cần ít nhất 2 ký tự.`);
      return;
    }
    setError("");
    try {
      const result = await callApi<Record<string, unknown>>(`${endpoint}/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: next }),
      });
      take(result);
    } catch (caught) {
      setNames((current) => ({ ...current, [row.id]: row.name }));
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    }
  }

  async function setActive(row: Row, active: boolean) {
    if (active === row.active) return;
    setError("");
    const previous = rows;
    setRows(rows.map((item) => (item.id === row.id ? { ...item, active } : item)));
    try {
      const result = await callApi<Record<string, unknown>>(`${endpoint}/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      take(result);
    } catch (caught) {
      setRows(previous);
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <div className={panelClass}>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft hover:bg-soft">
              <TableHead className="w-14">STT</TableHead>
              <TableHead>{label}</TableHead>
              <TableHead className="w-40">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm text-muted">{index + 1}</TableCell>
                <TableCell className="whitespace-normal p-1">
                  <input
                    aria-label={`Tên ${row.name}`}
                    className={cell}
                    value={names[row.id] ?? row.name}
                    onChange={(event) => setNames((current) => ({ ...current, [row.id]: event.target.value }))}
                    onBlur={(event) => void rename(row, event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </TableCell>
                <TableCell className="p-1">
                  <select
                    aria-label={`Trạng thái ${row.name}`}
                    className={cell}
                    value={row.active ? "dung" : "ngung"}
                    onChange={(event) => void setActive(row, event.target.value === "dung")}
                  >
                    <option value="dung">Đang dùng</option>
                    <option value="ngung">Ngừng dùng</option>
                  </select>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="text-xs text-muted">Mới</TableCell>
              <TableCell className="whitespace-normal p-1">
                <input
                  aria-label={`Tên ${label.toLocaleLowerCase("vi")} mới`}
                  className={cell}
                  placeholder={placeholder}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={(event) => void create(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              </TableCell>
              <TableCell className="text-sm text-muted">Rời ô để thêm</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
