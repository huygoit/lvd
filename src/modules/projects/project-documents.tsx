"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

type Tep = {
  id: string;
  fileName: string;
  kindLabel: string;
  size: number;
  uploadedByName: string;
  createdAt: string;
};

type DanhSach = {
  nhanNoiLuu: string;
  tep: Tep[];
};

const gioiHan = 20 * 1024 * 1024;

function dungLuong(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    const text = kb >= 10 ? String(Math.round(kb)) : kb.toFixed(1).replace(".", ",");
    return `${text} KB`;
  }
  const mb = bytes / (1024 * 1024);
  const text = mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1).replace(".", ",");
  return `${text} MB`;
}

function ngayGio(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function loiMang(error: unknown) {
  return error instanceof Error ? error.message : "Không thực hiện được.";
}

export function ProjectDocuments({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Tep[]>([]);
  const [nhan, setNhan] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Tep | null>(null);
  const [sua, setSua] = useState<{ id: string; name: string; saving: boolean; error: string } | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    callApi<DanhSach>(`/api/cong-trinh/${projectId}/tai-lieu`)
      .then((data) => {
        if (!live) return;
        setRows(data.tep);
        setNhan(data.nhanNoiLuu);
      })
      .catch((err: unknown) => {
        if (live) setError(loiMang(err));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  async function taiLen(list: FileList | null) {
    const files = list ? [...list] : [];
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;
    if (files.length > 10) {
      setError("Mỗi lần chỉ tải tối đa 10 file.");
      return;
    }
    const qua = files.find((file) => file.size > gioiHan);
    if (qua) {
      setError(`File "${qua.name}" lớn hơn 20 MB.`);
      return;
    }
    const trong = files.find((file) => file.size <= 0);
    if (trong) {
      setError(`File "${trong.name}" đang trống.`);
      return;
    }
    const form = new FormData();
    for (const file of files) form.append("tep", file);
    setUploading(true);
    setError("");
    try {
      const data = await callApi<DanhSach>(`/api/cong-trinh/${projectId}/tai-lieu`, { method: "POST", body: form });
      setRows(data.tep);
      setNhan(data.nhanNoiLuu);
    } catch (err) {
      setError(loiMang(err));
    } finally {
      setUploading(false);
    }
  }

  async function taiXuong(row: Tep) {
    setError("");
    try {
      const response = await fetch(`/api/cong-trinh/${projectId}/tai-lieu/${row.id}`);
      if (response.status === 401) throw new Error("Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.");
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message || "Không tải xuống được.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = row.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(loiMang(err));
    }
  }

  async function luuTen(row: Tep) {
    if (!sua || sua.id !== row.id) return;
    setSua({ ...sua, saving: true, error: "" });
    try {
      const data = await callApi<{ fileName: string }>(`/api/cong-trinh/${projectId}/tai-lieu/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fileName: sua.name }),
      });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, fileName: data.fileName } : item));
      setSua(null);
    } catch (err) {
      setSua({ id: row.id, name: sua.name, saving: false, error: loiMang(err) });
    }
  }

  async function xoa() {
    if (!pending) return;
    setDeleting(true);
    setError("");
    try {
      await callApi(`/api/cong-trinh/${projectId}/tai-lieu/${pending.id}`, { method: "DELETE" });
      setRows((current) => current.filter((row) => row.id !== pending.id));
      setPending(null);
    } catch (err) {
      setError(loiMang(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Tài liệu công trình</h2>
          <p className="mt-1 text-sm text-muted">PDF, JPG, PNG, WebP, Word, Excel, CSV, TXT. Tối đa 20 MB mỗi file, 10 file mỗi lần.</p>
          {nhan ? <p className="mt-1 text-xs text-muted">{nhan}</p> : null}
        </div>
        {canEdit ? (
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain,text/csv"
              className="sr-only"
              onChange={(event) => void taiLen(event.target.files)}
            />
            <Button type="button" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <Upload />
              {uploading ? "Đang tải lên" : "Tải lên"}
            </Button>
          </div>
        ) : null}
      </div>
      {error ? (
        <p className="rounded-[12px] border border-danger/30 bg-white px-3 py-2 text-sm text-danger" role="alert">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted">Đang tải danh sách...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line bg-white px-4 py-14 text-center">
          <p className="text-sm font-medium text-ink">Chưa có tài liệu</p>
          <p className="mt-1 text-sm text-muted">Hãy tải hợp đồng, bản vẽ hoặc biên bản của công trình này.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-line bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-soft hover:bg-soft">
                <TableHead>Tên</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Dung lượng</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Người tải</TableHead>
                <TableHead className="w-[1%]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[280px]">
                    {canEdit && sua?.id === row.id ? (
                      <>
                        <input
                          value={sua.name}
                          onChange={(event) => setSua({ ...sua, name: event.target.value, error: "" })}
                          className="h-9 w-full bg-transparent text-sm font-medium text-ink outline-none"
                        />
                        {sua.error ? <p className="mt-1 text-xs text-danger">{sua.error}</p> : null}
                      </>
                    ) : (
                      <span className="block truncate font-medium text-ink" title={row.fileName}>{row.fileName}</span>
                    )}
                  </TableCell>
                  <TableCell>{row.kindLabel}</TableCell>
                  <TableCell>{dungLuong(row.size)}</TableCell>
                  <TableCell className="whitespace-nowrap">{ngayGio(row.createdAt)}</TableCell>
                  <TableCell>{row.uploadedByName}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {canEdit ? (
                        sua?.id === row.id ? (
                          <Button type="button" size="sm" variant="ghost" disabled={sua.saving} onClick={() => void luuTen(row)}>{sua.saving ? "Đang lưu" : "Lưu"}</Button>
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setSua({ id: row.id, name: row.fileName, saving: false, error: "" })}>Sửa</Button>
                        )
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" onClick={() => void taiXuong(row)}>
                        <Download />
                        Tải xuống
                      </Button>
                      {canEdit ? (
                        <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => setPending(row)}>
                          <Trash2 />
                          Xóa
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !deleting) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài liệu</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? `"${pending.fileName}" sẽ bị xóa khỏi công trình.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setPending(null)}>Đóng</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void xoa()}>{deleting ? "Đang xóa" : "Xóa"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
