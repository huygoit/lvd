"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Download, HardDrive, RotateCcw, Trash2 } from "lucide-react";
import type { BackupCard } from "@/modules/system/backup";
import { restorePhrase } from "@/modules/system/backup-phrase";
import { Button } from "@/shared/components/ui/button";
import { inputClass } from "@/shared/components/controls";
import { formatDateTime } from "@/shared/lib/dates";

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}

export function BackupScreen({ initial }: { initial: BackupCard[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [restoreId, setRestoreId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const totalBytes = rows.reduce((sum, row) => sum + row.dumpBytes + row.fileBytes, 0);
  const latest = rows[0];

  async function reload(nextMessage: string) {
    const response = await fetch("/api/cai-dat/sao-luu");
    const body = (await response.json()) as { message?: string; backups?: BackupCard[] };
    if (!response.ok) throw new Error(body.message || "Không tải được danh sách.");
    setRows(body.backups ?? []);
    setMessage(nextMessage);
    router.refresh();
  }

  async function create() {
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/cai-dat/sao-luu", { method: "POST" });
      const body = (await response.json()) as { message?: string; id?: string };
      if (!response.ok) throw new Error(body.message || "Không tạo được bản sao lưu.");
      await reload(`Đã lưu bản ${body.id} trên máy chủ.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được bản sao lưu.");
    } finally {
      setCreating(false);
    }
  }

  async function download(id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/cai-dat/sao-luu/${id}`);
      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Không tải được bản sao lưu.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được bản sao lưu.");
    } finally {
      setBusyId("");
    }
  }

  async function restore(id: string) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/cai-dat/sao-luu/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Không khôi phục được.");
      setRestoreId("");
      setConfirm("");
      await reload(`Đã khôi phục bản ${id}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không khôi phục được.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Xóa bản ${id} trên máy chủ?`)) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/cai-dat/sao-luu/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message || "Không xóa được bản sao lưu.");
      if (restoreId === id) setRestoreId("");
      await reload(`Đã xóa bản ${id}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xóa được bản sao lưu.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[18px] text-white shadow-[var(--shadow-card)]" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Database className="size-6" />
            </span>
            <div>
              <p className="text-sm text-white/75">Lưu trên máy chủ</p>
              <h1 className="text-2xl font-semibold">Sao lưu hệ thống</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">Mỗi bản là một dump PostgreSQL kèm tệp đính kèm. Danh sách bên dưới là các bản đang nằm trên máy chủ.</p>
            </div>
          </div>
          <Button type="button" className="h-11 rounded-xl bg-white px-5 text-navy hover:bg-white/90" disabled={creating} onClick={() => void create()}>
            {creating ? "Đang dump..." : "Sao lưu ngay"}
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted">Số bản</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{rows.length}</p>
        </article>
        <article className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted">Dung lượng</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{sizeLabel(totalBytes)}</p>
        </article>
        <article className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm text-muted">Bản mới nhất</p>
          <p className="mt-1 text-lg font-semibold text-ink">{latest ? formatDateTime(new Date(latest.createdAt)) : "Chưa có"}</p>
        </article>
      </div>

      {message ? <p className="text-sm font-medium text-ink">{message}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Các bản đã lưu</h2>
        {rows.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-line bg-white px-4 py-12 text-center text-sm text-muted">Chưa có bản nào trên máy chủ. Bấm Sao lưu ngay để tạo dump đầu tiên.</p>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="rounded-[18px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">
                  <HardDrive className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{row.id}</p>
                  <p className="text-sm text-muted">{formatDateTime(new Date(row.createdAt))}{row.createdBy ? ` · ${row.createdBy}` : ""}</p>
                </div>
                <div className="text-sm text-muted lg:text-right">
                  <p>Dump {sizeLabel(row.dumpBytes)}</p>
                  <p>{row.fileCount} tệp đính kèm · {sizeLabel(row.fileBytes)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busyId === row.id} onClick={() => void download(row.id)}>
                    <Download className="size-4" /> Tải về
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={busyId === row.id} onClick={() => { setRestoreId(row.id); setConfirm(""); setError(""); }}>
                    <RotateCcw className="size-4" /> Khôi phục
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="text-danger" disabled={busyId === row.id} onClick={() => void remove(row.id)}>
                    <Trash2 className="size-4" /> Xóa
                  </Button>
                </div>
              </div>
              {restoreId === row.id ? (
                <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 p-4">
                  <p className="text-sm font-medium text-ink">Khôi phục sẽ ghi đè dữ liệu hiện tại bằng dump của bản {row.id}.</p>
                  <label className="mt-3 block text-sm font-medium text-ink">
                    Gõ {restorePhrase}
                    <input value={confirm} onChange={(event) => setConfirm(event.target.value)} className={`${inputClass} mt-1.5 max-w-xs`} autoComplete="off" />
                  </label>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="destructive" disabled={busyId === row.id || confirm.trim() !== restorePhrase} onClick={() => void restore(row.id)}>
                      {busyId === row.id ? "Đang khôi phục" : "Khôi phục bản này"}
                    </Button>
                    <Button type="button" variant="outline" disabled={busyId === row.id} onClick={() => setRestoreId("")}>Đóng</Button>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
