"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, ExternalLink, FileText, Globe, Mail, MapPin, Phone, Trash2, Upload } from "lucide-react";
import { callApi } from "@/shared/client/api";
import { Button } from "@/shared/components/ui/button";
import { routes } from "@/shared/config/routes";
import { cn } from "@/shared/lib/cn";
import type { DiemBanDo, HoSoCongTy, TaiKhoanNganHang, TepNangLuc } from "@/modules/settings/company-profile";

const o = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none focus:border-primary";

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

function khungBanDo(lat: string, lon: string) {
  const vi = Number(lat);
  const kinh = Number(lon);
  const lech = 0.008;
  const bbox = `${kinh - lech},${vi - lech},${kinh + lech},${vi + lech}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${vi},${kinh}`)}`;
}

export function CompanyProfileScreen({ initial }: { initial: HoSoCongTy }) {
  const [hoSo, setHoSo] = useState(initial);
  const [banks, setBanks] = useState<NganHang[]>(initial.banks.map((item) => ({ ...item, key: item.id })));
  const [files, setFiles] = useState<TepNangLuc[]>(initial.files);
  const [logo, setLogo] = useState(initial.hasLogo ? 1 : 0);
  const [loi, setLoi] = useState("");
  const [bao, setBao] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [dangLogo, setDangLogo] = useState(false);
  const [dangTep, setDangTep] = useState(false);
  const [tim, setTim] = useState(initial.contactAddress || initial.address);
  const [diem, setDiem] = useState<DiemBanDo[]>([]);
  const [dangTim, setDangTim] = useState(false);

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
          latitude: hoSo.latitude,
          longitude: hoSo.longitude,
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

  async function timBanDo() {
    const q = tim.trim() || hoSo.contactAddress || hoSo.address;
    setDangTim(true);
    setLoi("");
    setDiem([]);
    try {
      const data = await callApi<DiemBanDo[]>(`/api/cai-dat/ho-so-cong-ty/ban-do?q=${encodeURIComponent(q)}`);
      setDiem(data);
      if (data[0]) {
        sua("latitude", data[0].lat);
        sua("longitude", data[0].lon);
      }
    } catch (caught) {
      setLoi(caught instanceof Error ? caught.message : "Không tìm được vị trí.");
    } finally {
      setDangTim(false);
    }
  }

  const diaLienLac = hoSo.contactAddress || hoSo.address;
  const coBanDo = hoSo.latitude !== "" && hoSo.longitude !== "";

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
          <div className="h-24 bg-gradient-to-r from-[#1d4ed8] via-[#1e40af] to-[#0f172a]" />
          <div className="px-5 pb-5 sm:px-6">
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                {logo ? (
                  <img src={`/api/cai-dat/ho-so-cong-ty/logo?v=${logo}`} alt="Logo Liên Việt Door" className="size-24 rounded-2xl border-4 border-white bg-white object-contain shadow-[var(--shadow-card)]" />
                ) : (
                  <div className="grid size-24 place-items-center rounded-2xl border-4 border-white bg-[#1d4ed8] text-lg font-semibold tracking-wide text-white shadow-[var(--shadow-card)]">LVD</div>
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
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink">Vị trí trên OpenStreetMap</h2>
            {coBanDo ? (
              <a className="inline-flex items-center gap-1 text-xs font-medium text-primary" href={`https://www.openstreetmap.org/?mlat=${hoSo.latitude}&mlon=${hoSo.longitude}#map=17/${hoSo.latitude}/${hoSo.longitude}`} target="_blank" rel="noreferrer">
                Mở rộng <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
          {coBanDo ? (
            <iframe title="Bản đồ trụ sở Liên Việt Door" className="min-h-64 w-full flex-1 border-0" src={khungBanDo(hoSo.latitude, hoSo.longitude)} />
          ) : (
            <div className="grid min-h-64 flex-1 place-items-center bg-soft px-6 text-center">
              <div>
                <MapPin className="mx-auto size-6 text-primary" />
                <p className="mt-2 text-sm text-muted">Chưa gắn vị trí. Tìm theo địa chỉ rồi lưu hồ sơ.</p>
              </div>
            </div>
          )}
          <div className="space-y-2 border-t border-line px-5 py-3">
            <div className="flex gap-2">
              <input value={tim} onChange={(event) => setTim(event.target.value)} placeholder="Địa chỉ cần tìm" className={o} />
              <Button type="button" variant="outline" disabled={dangTim} onClick={() => void timBanDo()}>{dangTim ? "Đang tìm" : "Tìm"}</Button>
            </div>
            {diem.length > 0 ? (
              <div className="max-h-28 space-y-1 overflow-auto">
                {diem.map((item) => (
                  <button
                    key={`${item.lat}-${item.lon}`}
                    type="button"
                    className="block w-full rounded-lg px-2 py-1 text-left text-xs text-muted hover:bg-soft hover:text-ink"
                    onClick={() => { sua("latitude", item.lat); sua("longitude", item.lon); }}
                  >
                    {item.nhan}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <input value={hoSo.latitude} onChange={(event) => sua("latitude", event.target.value)} placeholder="Vĩ độ" className={o} />
              <input value={hoSo.longitude} onChange={(event) => sua("longitude", event.target.value)} placeholder="Kinh độ" className={o} />
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {khoi("Liên lạc", "Số và địa chỉ khách, đối tác dùng khi cần gặp công ty. Báo giá đang in điện thoại liên lạc.", (
          <div className="grid gap-3 sm:grid-cols-2">
            <O nhan="Điện thoại liên lạc"><input value={hoSo.phone} onChange={(event) => sua("phone", event.target.value)} className={o} /></O>
            <O nhan="Điện thoại khác"><input value={hoSo.officePhone} onChange={(event) => sua("officePhone", event.target.value)} className={o} /></O>
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
              <O nhan="Mã số thuế"><input value={hoSo.taxCode} onChange={(event) => sua("taxCode", event.target.value)} className={o} /></O>
              <O nhan="Thuế suất mặc định (%)"><input value={hoSo.taxPercent} onChange={(event) => sua("taxPercent", event.target.value)} inputMode="decimal" className={o} /></O>
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

      <p className="flex items-center gap-2 text-xs text-muted"><Globe className="size-3.5" />Bản đồ dùng OpenStreetMap. Vị trí chỉ được ghi khi bấm Lưu hồ sơ.</p>
    </div>
  );
}
