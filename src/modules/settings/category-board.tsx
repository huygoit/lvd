"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderPlus, GripVertical, Plus, Trash2 } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { panelClass } from "@/shared/components/controls";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/cn";
import { digitsVnd, formatCount } from "@/shared/lib/money";
import { measureUnits } from "@/shared/catalog/units";
import type { QuoteCategoryGroupRow, QuoteCategoryRow } from "@/modules/settings/categories";

type Bundle = {
  groups: QuoteCategoryGroupRow[];
  categories: QuoteCategoryRow[];
};

function priceLabel(value: number) {
  return value > 0 ? formatCount(value) : "";
}

export function CategoryBoard({ initial }: { initial: Bundle }) {
  const [groups, setGroups] = useState(initial.groups);
  const [categories, setCategories] = useState(initial.categories);
  const [selectedId, setSelectedId] = useState(initial.groups[0]?.id ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initial.groups.map((row) => row.id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [rootName, setRootName] = useState("");
  const [childName, setChildName] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("bộ");
  const [unitPrice, setUnitPrice] = useState("");

  const [dragGroup, setDragGroup] = useState("");
  const [overGroup, setOverGroup] = useState("");
  const [dragItem, setDragItem] = useState("");
  const [overItem, setOverItem] = useState("");

  const selected = groups.find((row) => row.id === selectedId) ?? null;

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, QuoteCategoryGroupRow[]>();
    for (const row of groups) {
      const key = row.parentId;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
    }
    return map;
  }, [groups]);

  const groupItems = useMemo(() => {
    if (!selectedId) return [];
    return categories
      .filter((row) => row.groupId === selectedId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
  }, [categories, selectedId]);

  function apply(bundle: Bundle) {
    setGroups(bundle.groups);
    setCategories(bundle.categories);
    if (bundle.groups.length === 0) {
      setSelectedId("");
      return;
    }
    if (!bundle.groups.some((row) => row.id === selectedId)) {
      setSelectedId(bundle.groups[0].id);
    }
  }

  async function run(action: () => Promise<Bundle>) {
    setBusy(true);
    setError("");
    try {
      apply(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addGroup(parentId: string | null, raw: string, clear: () => void) {
    const label = raw.trim();
    if (label.length < 2) return;
    void run(async () => {
      const result = await callApi<Bundle & { group: QuoteCategoryGroupRow }>("/api/cai-dat/hang-muc", {
        method: "POST",
        body: JSON.stringify({ target: "group", name: label, parentId }),
      });
      clear();
      setSelectedId(result.group.id);
      if (parentId) setExpanded((current) => new Set(current).add(parentId));
      setExpanded((current) => new Set(current).add(result.group.id));
      return result;
    });
  }

  function addItem() {
    if (!selectedId || name.trim().length < 2) return;
    void run(async () => {
      const result = await callApi<Bundle>("/api/cai-dat/hang-muc", {
        method: "POST",
        body: JSON.stringify({
          target: "category",
          groupId: selectedId,
          name,
          unit,
          unitPrice: unitPrice || 0,
        }),
      });
      setName("");
      setUnit("bộ");
      setUnitPrice("");
      return result;
    });
  }

  async function dropGroup(fromId: string, toId: string) {
    setDragGroup("");
    setOverGroup("");
    if (!fromId || fromId === toId) return;
    const from = groups.find((row) => row.id === fromId);
    const to = groups.find((row) => row.id === toId);
    if (!from || !to || from.parentId !== to.parentId) return;
    const siblings = (childrenOf.get(from.parentId) ?? []).map((row) => row.id);
    const start = siblings.indexOf(fromId);
    const end = siblings.indexOf(toId);
    if (start < 0 || end < 0) return;
    const nextIds = [...siblings];
    const [moved] = nextIds.splice(start, 1);
    nextIds.splice(end, 0, moved);
    const previous = groups;
    const order = new Map(nextIds.map((id, index) => [id, index + 1]));
    setGroups((current) =>
      current.map((row) => (order.has(row.id) ? { ...row, sortOrder: order.get(row.id)! } : row)),
    );
    setBusy(true);
    setError("");
    try {
      apply(
        await callApi<Bundle>("/api/cai-dat/hang-muc", {
          method: "PATCH",
          body: JSON.stringify({ target: "group", parentId: from.parentId, order: nextIds }),
        }),
      );
    } catch (caught) {
      setGroups(previous);
      setError(caught instanceof Error ? caught.message : "Không lưu được thứ tự nhóm.");
    } finally {
      setBusy(false);
    }
  }

  async function dropItem(fromId: string, toId: string) {
    setDragItem("");
    setOverItem("");
    if (!selectedId || !fromId || fromId === toId) return;
    const ids = groupItems.map((row) => row.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);
    const previous = categories;
    const order = new Map(nextIds.map((id, index) => [id, index + 1]));
    setCategories((current) =>
      current.map((row) => (row.groupId === selectedId && order.has(row.id) ? { ...row, sortOrder: order.get(row.id)! } : row)),
    );
    setBusy(true);
    setError("");
    try {
      apply(
        await callApi<Bundle>("/api/cai-dat/hang-muc", {
          method: "PATCH",
          body: JSON.stringify({ target: "category", groupId: selectedId, order: nextIds }),
        }),
      );
    } catch (caught) {
      setCategories(previous);
      setError(caught instanceof Error ? caught.message : "Không lưu được thứ tự hạng mục.");
    } finally {
      setBusy(false);
    }
  }

  function renderGroup(row: QuoteCategoryGroupRow, depth: number) {
    const kids = childrenOf.get(row.id) ?? [];
    const open = expanded.has(row.id);
    const selectedRow = selectedId === row.id;
    return (
      <div key={row.id}>
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-xl px-1 py-0.5",
            selectedRow ? "bg-primary/10" : "hover:bg-soft",
            overGroup === row.id && dragGroup && dragGroup !== row.id && "ring-2 ring-primary/30",
            !row.active && "opacity-60",
          )}
          style={{ paddingLeft: 4 + depth * 12 }}
          onDragOver={(event) => {
            event.preventDefault();
            if (dragGroup) setOverGroup(row.id);
          }}
          onDrop={(event) => {
            event.preventDefault();
            void dropGroup(event.dataTransfer.getData("text/plain"), row.id);
          }}
        >
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-white"
            aria-label={open ? `Thu gọn ${row.name}` : `Mở ${row.name}`}
            onClick={() => toggleExpand(row.id)}
          >
            {kids.length > 0 ? open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : <span className="size-4" />}
          </button>
          <button
            type="button"
            draggable={!busy}
            aria-label={`Kéo nhóm ${row.name}`}
            className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted hover:bg-white active:cursor-grabbing"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", row.id);
              setDragGroup(row.id);
            }}
            onDragEnd={() => {
              setDragGroup("");
              setOverGroup("");
            }}
          >
            <GripVertical className="size-3.5" />
          </button>
          <button type="button" className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left" onClick={() => setSelectedId(row.id)}>
            <span className="block truncate text-sm font-medium text-ink">{row.name}</span>
            <span className="block text-[11px] text-muted">
              {row.itemCount} hạng mục{row.childCount ? ` · ${row.childCount} nhóm con` : ""}
            </span>
          </button>
        </div>
        {open
          ? kids.map((child) => renderGroup(child, depth + 1))
          : null}
      </div>
    );
  }

  const roots = childrenOf.get(null) ?? [];

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={cn(panelClass, "flex min-h-[28rem] flex-col")}>
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Nhóm (thư mục)</p>
            <p className="mt-0.5 text-xs text-muted">Thêm nhóm con trong nhóm đang chọn. Kéo cùng cấp để đổi thứ tự.</p>
          </div>
          <div className="flex-1 space-y-0.5 overflow-auto p-2">
            {roots.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted">Chưa có nhóm. Thêm nhóm gốc bên dưới.</p>
            ) : (
              roots.map((row) => renderGroup(row, 0))
            )}
          </div>
          <div className="space-y-2 border-t border-line p-3">
            <Input
              value={rootName}
              placeholder="Tên nhóm gốc mới"
              aria-label="Tên nhóm gốc mới"
              disabled={busy}
              onChange={(event) => setRootName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addGroup(null, rootName, () => setRootName(""));
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || rootName.trim().length < 2}
              onClick={() => addGroup(null, rootName, () => setRootName(""))}
            >
              <FolderPlus className="size-4" aria-hidden /> Thêm nhóm gốc
            </Button>
          </div>
        </aside>

        <section className={cn(panelClass, "min-h-[28rem]")}>
          {!selected ? (
            <div className="flex h-full min-h-[28rem] items-center justify-center px-6 text-center text-sm text-muted">
              Chọn hoặc tạo một nhóm bên trái để quản lý hạng mục.
            </div>
          ) : (
            <>
              <div className="space-y-3 border-b border-line px-4 py-3">
                <div className="flex flex-wrap items-start gap-2">
                  <Input
                    key={`${selected.id}-${selected.name}`}
                    defaultValue={selected.name}
                    aria-label="Tên nhóm đang chọn"
                    disabled={busy}
                    className="max-w-md flex-1 text-base font-semibold"
                    onBlur={(event) => {
                      const next = event.target.value.trim();
                      if (next === selected.name || next.length < 2) {
                        event.target.value = selected.name;
                        return;
                      }
                      void run(() =>
                        callApi<Bundle>(`/api/cai-dat/hang-muc/${selected.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ target: "group", name: next }),
                        }),
                      );
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={selected.active ? "secondary" : "outline"}
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        callApi<Bundle>(`/api/cai-dat/hang-muc/${selected.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ target: "group", active: !selected.active }),
                        }),
                      )
                    }
                  >
                    {selected.active ? "Đang dùng" : "Không dùng"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.childCount > 0 || selected.itemCount > 0}
                    title={
                      selected.childCount > 0 || selected.itemCount > 0
                        ? "Chỉ xóa được khi không còn nhóm con và hạng mục"
                        : "Xóa nhóm"
                    }
                    onClick={() => {
                      if (!window.confirm(`Xóa nhóm “${selected.name}”?`)) return;
                      void run(() =>
                        callApi<Bundle>(`/api/cai-dat/hang-muc/${selected.id}?target=group`, { method: "DELETE" }),
                      );
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden /> Xóa
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={childName}
                    placeholder="Tên nhóm con trong nhóm này"
                    aria-label="Tên nhóm con"
                    disabled={busy}
                    className="max-w-sm flex-1"
                    onChange={(event) => setChildName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addGroup(selected.id, childName, () => setChildName(""));
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || childName.trim().length < 2}
                    onClick={() => addGroup(selected.id, childName, () => setChildName(""))}
                  >
                    <FolderPlus className="size-4" aria-hidden /> Thêm nhóm con
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-soft hover:bg-soft">
                      <TableHead className="w-10" />
                      <TableHead className="w-14">STT</TableHead>
                      <TableHead>Hạng mục</TableHead>
                      <TableHead className="w-28">Đơn vị</TableHead>
                      <TableHead className="w-36">Đơn giá TC</TableHead>
                      <TableHead className="w-36">Trạng thái</TableHead>
                      <TableHead className="w-16" />
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
                              addItem();
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
                          {measureUnits.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={unitPrice}
                          placeholder="0"
                          inputMode="numeric"
                          aria-label="Đơn giá tham chiếu mới"
                          className="text-right tabular-nums"
                          onChange={(event) => setUnitPrice(digitsVnd(event.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right" colSpan={2}>
                        <Button type="button" size="sm" disabled={busy || name.trim().length < 2} onClick={addItem}>
                          <Plus className="size-4" aria-hidden /> Thêm
                        </Button>
                      </TableCell>
                    </TableRow>
                    {groupItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-sm text-muted">
                          Nhóm này chưa có hạng mục. Thêm ở dòng Mới.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupItems.map((row, index) => (
                        <TableRow
                          key={row.id}
                          className={cn(overItem === row.id && dragItem && dragItem !== row.id && "bg-soft")}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (dragItem) setOverItem(row.id);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            void dropItem(event.dataTransfer.getData("text/plain"), row.id);
                          }}
                        >
                          <TableCell>
                            <button
                              type="button"
                              draggable={!busy}
                              aria-label={`Kéo ${row.name}`}
                              className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-muted hover:bg-soft active:cursor-grabbing"
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", row.id);
                                setDragItem(row.id);
                              }}
                              onDragEnd={() => {
                                setDragItem("");
                                setOverItem("");
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
                                  callApi<Bundle>(`/api/cai-dat/hang-muc/${row.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ target: "category", name: next }),
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
                                  callApi<Bundle>(`/api/cai-dat/hang-muc/${row.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ target: "category", unit: next }),
                                  }),
                                );
                              }}
                            >
                              {measureUnits.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              defaultValue={priceLabel(row.unitPrice)}
                              key={`${row.id}-p-${row.unitPrice}`}
                              inputMode="numeric"
                              placeholder="0"
                              aria-label={`Đơn giá ${row.name}`}
                              disabled={busy}
                              className="text-right tabular-nums"
                              onChange={(event) => {
                                event.target.value = digitsVnd(event.target.value);
                              }}
                              onBlur={(event) => {
                                const raw = digitsVnd(event.target.value);
                                const next = raw ? Number(raw) : 0;
                                event.target.value = priceLabel(next);
                                if (next === row.unitPrice) return;
                                void run(() =>
                                  callApi<Bundle>(`/api/cai-dat/hang-muc/${row.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ target: "category", unitPrice: next }),
                                  }),
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant={row.active ? "secondary" : "outline"}
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  callApi<Bundle>(`/api/cai-dat/hang-muc/${row.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ target: "category", active: !row.active }),
                                  }),
                                )
                              }
                            >
                              {row.active ? "Đang dùng" : "Không dùng"}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              aria-label={`Xóa ${row.name}`}
                              onClick={() => {
                                if (!window.confirm(`Xóa hạng mục “${row.name}”?`)) return;
                                void run(() =>
                                  callApi<Bundle>(`/api/cai-dat/hang-muc/${row.id}?target=category`, {
                                    method: "DELETE",
                                  }),
                                );
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
