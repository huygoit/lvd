"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, FileText, Mail, MapPin, Phone, Trash2, Upload } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import type { HoSoCongTy, TaiKhoanNganHang, TepNangLuc } from "@/modules/settings/company-profile";

const o = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";

function chiSo(value: string, dai: number) {
  return value.replace(/\D/g, "").slice(0, dai);
}

function chiThue(value: string) {
  const so = value.replace(/\D/g, "").replace(/^0+/, "");
  if (so && Number(so) > 100) return null;
  return so;
}

function chanKyTuLe(event: FormEvent<HTMLInputElement>) {
  const goc = event.nativeEvent;
  if (!(goc instanceof InputEvent) || !goc.data || goc.inputType.startsWith("insertFrom")) return;
  if (/\D/.test(goc.data)) event.preventDefault();
}

function chanThue(event: FormEvent<HTMLInputElement>) {
  const goc = event.nativeEvent;
  if (!(goc instanceof InputEvent) || !goc.data || goc.inputType.startsWith("insertFrom")) return;
  if (/\D/.test(goc.data)) {
    event.preventDefault();
    return;
  }
  const oNhap = event.currentTarget;
  const dau = oNhap.selectionStart ?? oNhap.value.length;
  const cuoi = oNhap.selectionEnd ?? dau;
  const sau = `${oNhap.value.slice(0, dau)}${goc.data}${oNhap.value.slice(cuoi)}`.replace(/\D/g, "").replace(/^0+/, "");
  if (!sau || Number(sau) > 100) event.preventDefault();
}

type NganHang = TaiKhoanNganHang & { key: string };

function O({ nhan, children, rong }: { nhan: string; children: ReactNode; rong?: boolean }) {
  return (
    <label className={rong ? "block sm:col-span-2" : "block"}>
      <span className="text-xs font-medium text-muted">{nhan}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function khoi(title: string, moTa: string, children: ReactNode) {
  return (
    <section className="rounded-[18px] border border-line bg-white px-5 py-5 shadow-[var(--shadow-card)] sm:px-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{moTa}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function dungLuong(byte: number) {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`;
  return `${(byte / 1024 / 1024).toFixed(1)} MB`;
}

const NHUNG_MAC_DINH = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3834.810849778053!2d108.20004407465562!3d16.02335904066522!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314219004da321df%3A0x8cd130a4f1166f16!2zTGnDqm4gVmnhu4d0IERvb3I!5e0!3m2!1sen!2s!4v1792904258214!5m2!1sen!2s";

function srcNhung(value: string) {
  const raw = value.trim();
  const cat = raw.startsWith("<") ? (/src=["']([^"']+)["']/i.exec(raw)?.[1] ?? "") : raw;
  try {
    const url = new URL(cat);
    if (url.protocol === "https:" && url.hostname === "www.google.com" && url.pathname === "/maps/embed") return url.toString();
  } catch {
    return "";
  }
  return "";
}

export function CompanyProfileScreen({ initial }: { initial: HoSoCongTy }) {
  const [hoSo, setHoSo] = useState({ ...initial, mapEmbed: initial.mapEmbed || NHUNG_MAC_DINH });
  const [banks, setBanks] = useState<NganHang[]>(initial.banks.map((item) => ({ ...item, key: item.id })));
  const [files, setFiles] = useState<TepNangLuc[]>(initial.files);
  const [logo, setLogo] = useState(initial.hasLogo ? 1 : 0);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [dangLogo, setDangLogo] = useState(false);
  const [dangTep, setDangTep] = useState(false);

  function sua<K extends keyof HoSoCongTy>(key: K, value: HoSoCongTy[K]) {
    setHoSo((current) => ({ ...current, [key]: value }));
  }

  function suaNgan(key: string, partial: Partial<NganHang>) {
    setBanks((current) => current.map((item) => item.key === key ? { ...item, ...partial } : item));
  }

  async function luu() {
    setDangLuu(true);
    setLoi("");
    setBao("");
    try {
      const data = await callApi<HoSoCongTy>("/api/cai-dat/ho-so-cong-ty", {
        method: "PATCH",
        body: JSON.stringify({
          name: hoSo.name,
          taxCode: hoSo.taxCode,
          address: hoSo.address,
          phone: hoSo.phone,
          email: hoSo.email,
          website: hoSo.website,
          officePhone: hoSo.officePhone,
          contactAddress: hoSo.contactAddress,
          representativeName: hoSo.representativeName,
          representativeTitle: hoSo.representativeTitle,
          fieldLine: hoSo.fieldLine,
          about: hoSo.about,
          taxPercent: hoSo.taxPercent,
          incomeTaxPercent: hoSo.incomeTaxPercent,
          latitude: hoSo.latitude,
          longitude: hoSo.longitude,
          mapEmbed: hoSo.mapEmbed,
          banks: banks.map(({ bankName, branch, accountNumber, accountName }) => ({ bankName, branch, accountNumber, accountName })),
        }),
      });
      setHoSo(data);
      setBanks(data.banks.map((item) => ({ ...item, key: item.id })));
      setFiles(data.files);
      setBao("Đã lưu hồ sơ công ty.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không lưu được hồ sơ.");
    } finally {
      setDangLuu(false);
    }
  }

  async function doiLogo(file: File | undefined) {
    if (!file) return;
    setDangLogo(true);
    setLoi("");
    try {
      const body = new FormData();
      body.set("tep", file);
      await callApi("/api/cai-dat/ho-so-cong-ty/logo", { method: "POST", body });
      setLogo(Date.now());
      setBao("Đã cập nhật logo.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không tải được logo.");
    } finally {
      setDangLogo(false);
    }
  }

  async function goLogo() {
    setDangLogo(true);
    setLoi("");
    try {
      await callApi("/api/cai-dat/ho-so-cong-ty/logo", { method: "DELETE" });
      setLogo(0);
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không gỡ được logo.");
    } finally {
      setDangLogo(false);
    }
  }

  async function themTep(file: File | undefined) {
    if (!file) return;
    setDangTep(true);
    setLoi("");
    try {
      const body = new FormData();
      body.set("tep", file);
      const row = await callApi<TepNangLuc>("/api/cai-dat/ho-so-cong-ty/nang-luc", { method: "POST", body });
      setFiles((current) => [row, ...current]);
      setBao("Đã thêm file hồ sơ năng lực.");
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không tải được file.");
    } finally {
      setDangTep(false);
    }
  }

  async function xoaTep(id: string) {
    setLoi("");
    try {
      await callApi(`/api/cai-dat/ho-so-cong-ty/nang-luc/${id}`, { method: "DELETE" });
      setFiles((current) => current.filter((item) => item.id !== id));
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không xóa được file.");
    }
  }

  const diaLienLac = hoSo.contactAddress || hoSo.address;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={routes.settings} className="text-sm font-medium text-primary">← Cài đặt</Link>
        <Button type="button" disabled={dangLuu} onClick={() => void luu()}>{dangLuu ? "Đang lưu" : "Lưu hồ sơ"}</Button>
      </div>
      {loi ? <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{loi}</p> : null}
      {bao ? <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">{bao}</p> : null}

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="bg-brand h-24" />
          <div className="px-5 pb-5 sm:px-6">
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                {logo ? (
                  <img src={`/api/cai-dat/ho-so-cong-ty/logo?v=${logo}`} alt="Logo Liên Việt Door" className="size-24 rounded-2xl border-4 border-white bg-white object-contain shadow-[var(--shadow-card)]" />
                ) : (
                  <div className="bg-brand grid size-24 place-items-center rounded-2xl border-4 border-white text-lg font-semibold tracking-wide text-white shadow-[var(--shadow-card)]">LVD</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pb-1">
                <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink">
                  <Upload className="size-3.5" />
                  {dangLogo ? "Đang tải" : logo ? "Đổi logo" : "Tải logo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={dangLogo} onChange={(event) => { void doiLogo(event.target.files?.[0]); event.target.value = ""; }} />
                </label>
                {logo ? <Button type="button" size="sm" variant="ghost" className="text-danger" disabled={dangLogo} onClick={() => void goLogo()}>Gỡ</Button> : null}
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Hồ sơ công ty</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{hoSo.name || "Chưa có tên công ty"}</h1>
            <p className="mt-1 text-sm text-muted">{hoSo.fieldLine || "Chưa có dòng lĩnh vực."}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1"><Phone className="size-3.5 text-primary" />{hoSo.phone || "Chưa có điện thoại"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1"><Mail className="size-3.5 text-primary" />{hoSo.email || "Chưa có email"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1"><BadgeCheck className="size-3.5 text-primary" />MST {hoSo.taxCode || "—"}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1"><MapPin className="size-3.5 text-primary" />{diaLienLac || "Chưa có địa chỉ"}</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Vị trí trên Google Maps</h2>
            <p className="mt-0.5 text-xs text-muted">Iframe nhúng, không cần API key.</p>
          </div>
          {srcNhung(hoSo.mapEmbed) ? (
            <iframe
              title="Bản đồ trụ sở Liên Việt Door"
              className="min-h-72 w-full flex-1 border-0"
              src={srcNhung(hoSo.mapEmbed)}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="grid min-h-64 flex-1 place-items-center bg-soft px-6 text-center">
              <p className="text-sm text-muted">Chưa có bản đồ. Dán iframe từ Google Maps rồi lưu hồ sơ.</p>
            </div>
          )}
          <details className="border-t border-line px-5 py-3">
            <summary className="cursor-pointer text-xs font-medium text-muted">Đổi đường nhúng</summary>
            <textarea
              value={hoSo.mapEmbed}
              onChange={(event) => sua("mapEmbed", event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-primary"
            />
          </details>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {khoi("Liên lạc", "Số và địa chỉ khách, đối tác dùng khi cần gặp công ty. Báo giá đang in điện thoại liên lạc.", (
          <div className="grid gap-3 sm:grid-cols-2">
            <O nhan="Điện thoại liên lạc"><input value={hoSo.phone} onBeforeInput={chanKyTuLe} onChange={(event) => sua("phone", chiSo(event.target.value, 40))} inputMode="numeric" className={o} /></O>
            <O nhan="Điện thoại khác"><input value={hoSo.officePhone} onBeforeInput={chanKyTuLe} onChange={(event) => sua("officePhone", chiSo(event.target.value, 40))} inputMode="numeric" className={o} /></O>
            <O nhan="Email"><input value={hoSo.email} onChange={(event) => sua("email", event.target.value)} className={o} /></O>
            <O nhan="Website"><input value={hoSo.website} onChange={(event) => sua("website", event.target.value)} placeholder="https://" className={o} /></O>
            <O nhan="Địa chỉ liên lạc" rong><input value={hoSo.contactAddress} onChange={(event) => sua("contactAddress", event.target.value)} placeholder="Để trống nếu trùng địa chỉ đăng ký" className={o} /></O>
            <O nhan="Lĩnh vực" rong><input value={hoSo.fieldLine} onChange={(event) => sua("fieldLine", event.target.value)} placeholder="Cung cấp, thi công lắp đặt cửa..." className={o} /></O>
          </div>
        ))}

        {khoi("Hóa đơn và hợp đồng", "Tên pháp lý, mã số thuế và địa chỉ đăng ký in trên báo giá, hóa đơn, hợp đồng.", (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <O nhan="Tên công ty" rong><input value={hoSo.name} onChange={(event) => sua("name", event.target.value)} className={o} /></O>
              <O nhan="Mã số thuế"><input value={hoSo.taxCode} onBeforeInput={chanKyTuLe} onChange={(event) => sua("taxCode", chiSo(event.target.value, 20))} inputMode="numeric" className={o} /></O>
              <O nhan="Thuế GTGT mặc định (%)">
                <input value={hoSo.taxPercent} onBeforeInput={chanThue} onChange={(event) => { const so = chiThue(event.target.value); if (so !== null) sua("taxPercent", so); }} inputMode="numeric" className={o} />
                <span className="mt-1 block text-xs text-muted">Số nguyên từ 1 đến 100. Mỗi công trình vẫn giữ suất riêng.</span>
              </O>
              <O nhan="Thuế thu nhập doanh nghiệp (%)">
                <input value={hoSo.incomeTaxPercent} onBeforeInput={chanThue} onChange={(event) => { const so = chiThue(event.target.value); if (so !== null) sua("incomeTaxPercent", so); }} inputMode="numeric" placeholder="Chưa chốt" className={o} />
                <span className="mt-1 block text-xs text-muted">Số nguyên từ 1 đến 100, một suất cho cả công ty.</span>
              </O>
              <O nhan="Địa chỉ đăng ký" rong><input value={hoSo.address} onChange={(event) => sua("address", event.target.value)} className={o} /></O>
              <O nhan="Người đại diện"><input value={hoSo.representativeName} onChange={(event) => sua("representativeName", event.target.value)} className={o} /></O>
              <O nhan="Chức vụ"><input value={hoSo.representativeTitle} onChange={(event) => sua("representativeTitle", event.target.value)} placeholder="Giám đốc" className={o} /></O>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink">Tài khoản nhận tiền</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setBanks((current) => [...current, { key: `moi-${Date.now()}`, id: "", bankName: "", branch: "", accountNumber: "", accountName: "" }])}>Thêm</Button>
              </div>
              {banks.length === 0 ? <p className="text-sm text-muted">Chưa có tài khoản. Hãy ghi số thật của công ty, không dùng số mẫu.</p> : null}
              <div className="space-y-2">
                {banks.map((item) => (
                  <div key={item.key} className="grid gap-2 rounded-xl bg-soft p-3 sm:grid-cols-2">
                    <input value={item.bankName} onChange={(event) => suaNgan(item.key, { bankName: event.target.value })} placeholder="Ngân hàng" className={o} />
                    <input value={item.branch} onChange={(event) => suaNgan(item.key, { branch: event.target.value })} placeholder="Chi nhánh" className={o} />
                    <input value={item.accountNumber} onChange={(event) => suaNgan(item.key, { accountNumber: event.target.value })} placeholder="Số tài khoản" className={o} />
                    <div className="flex gap-2">
                      <input value={item.accountName} onChange={(event) => suaNgan(item.key, { accountName: event.target.value })} placeholder="Chủ tài khoản" className={cn(o, "min-w-0")} />
                      <Button type="button" size="icon" variant="ghost" className="shrink-0 text-danger" onClick={() => setBanks((current) => current.filter((dong) => dong.key !== item.key))}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {khoi("Hồ sơ năng lực", `File giới thiệu công ty. ${hoSo.noiLuu}. PDF hoặc ảnh, tối đa 12 file.`, (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted">Giới thiệu ngắn</span>
            <textarea value={hoSo.about} onChange={(event) => sua("about", event.target.value)} rows={4} placeholder="Vài dòng về năng lực thi công, xưởng và phạm vi cung cấp." className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm text-muted"><Building2 className="size-4 text-primary" />{files.length} file</p>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink">
              <FileText className="size-3.5" />
              {dangTep ? "Đang tải" : "Thêm file"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={dangTep} onChange={(event) => { void themTep(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
          </div>
          {files.length === 0 ? <p className="rounded-xl bg-soft px-3 py-6 text-center text-sm text-muted">Chưa có hồ sơ năng lực.</p> : null}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {files.map((item) => (
              <li key={item.id} className="flex items-center gap-3 bg-white px-3 py-2">
                <FileText className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.fileName}</p>
                  <p className="text-xs text-muted">{item.nhan} · {dungLuong(item.size)}</p>
                </div>
                <a className="text-sm font-medium text-primary" href={`/api/cai-dat/ho-so-cong-ty/nang-luc/${item.id}`}>Tải về</a>
                <Button type="button" size="sm" variant="ghost" className="text-danger" onClick={() => void xoaTep(item.id)}>Xóa</Button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-xs text-muted">Bản đồ lấy từ iframe Google Maps. Bấm Lưu hồ sơ để ghi đường nhúng.</p>
    </div>
  );
}
