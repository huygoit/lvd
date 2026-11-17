"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Download, FileSignature, Mail, MessageCircle } from "lucide-react";
import { callApi } from "@/shared/client/api";

type Props = {
  backHref: string;
  quotationId: string;
  versionId: string;
  revision: number;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName: string;
  internalStatus: string;
  customerStatus: string;
  /** Có quyền duyệt. */
  allowApprove: boolean;
  /** Người lập hoặc người có quyền gửi/duyệt — thấy nút gửi sau khi đã duyệt. */
  allowSend: boolean;
  /** Báo giá đã duyệt, chưa có HĐ — hiện Lập hợp đồng. */
  allowCreateContract: boolean;
};

/** Tách SĐT VN: dạng 0… (zalo.me) và 84… (deep link PC). */
function zaloPhones(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return { local: "", intl: "" };
  if (digits.startsWith("84") && digits.length >= 11) {
    return { local: `0${digits.slice(2)}`, intl: digits };
  }
  if (digits.startsWith("0")) {
    return { local: digits, intl: `84${digits.slice(1)}` };
  }
  // 9 số thiếu số 0 đầu → coi là di động VN.
  if (digits.length === 9) {
    return { local: `0${digits}`, intl: `84${digits}` };
  }
  return { local: digits, intl: digits };
}

/** Gọi protocol / URL bằng thẻ a (ổn định hơn window.open với zalo://). */
function clickHref(href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Mở hội thoại Zalo đúng SĐT trên app PC.
 * Một deep link rõ ràng + fallback zalo.me (tránh bắn nhiều link làm Zalo mở sai).
 */
function moZaloHoiThoai(phoneRaw: string): "ok" | "thieu_sdt" {
  const { local, intl } = zaloPhones(phoneRaw);
  if (!local && !intl) {
    clickHref("zalo://");
    return "thieu_sdt";
  }
  clickHref(`zalo://conversation?phone=${intl}`);
  window.setTimeout(() => {
    clickHref(`https://zalo.me/${local}`);
  }, 900);
  return "ok";
}

/** Chân trang cố định trang xem PDF: Quay lại, Duyệt / Gửi khách, Tải PDF. */
export function PrintFooter({
  backHref,
  quotationId,
  versionId,
  revision,
  code,
  customerName,
  customerEmail,
  customerPhone,
  recipientName,
  internalStatus,
  customerStatus,
  allowApprove,
  allowSend,
  allowCreateContract,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rev, setRev] = useState(revision);
  const [status, setStatus] = useState(internalStatus);

  const showApprove = status === "cho_duyet" && allowApprove;
  const showSend = status === "da_duyet" && allowSend;
  const showCreate = status === "da_duyet" && allowCreateContract && customerStatus !== "tu_choi";

  async function approve() {
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/bao-gia/${quotationId}/hanh-dong`, {
        method: "POST",
        body: JSON.stringify({ action: "duyet", versionId, revision: rev }),
      });
      setRev((value) => value + 1);
      setStatus("da_duyet");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không duyệt được.");
    } finally {
      setBusy(false);
    }
  }

  async function ghiDaGui(channel: "zalo" | "email") {
    try {
      await callApi(`/api/bao-gia/${quotationId}/hanh-dong`, {
        method: "POST",
        body: JSON.stringify({
          action: "gui-khach",
          versionId,
          recipientName: recipientName || customerName,
          channel,
        }),
      });
      router.refresh();
    } catch {
      // Mở kênh gửi vẫn được; ghi nhận có thể thất bại do thiếu quyền.
    }
  }

  function guiZalo() {
    const ketQua = moZaloHoiThoai(customerPhone);
    if (ketQua === "thieu_sdt") {
      setError("Báo giá chưa có số điện thoại — đã mở Zalo để tự chọn người.");
    } else {
      setError("");
    }
    void ghiDaGui("zalo");
  }

  function guiEmail() {
    const subject = encodeURIComponent(`Báo giá ${code} — ${customerName}`);
    const href = customerEmail.trim()
      ? `mailto:${customerEmail.trim()}?subject=${subject}`
      : `mailto:?subject=${subject}`;
    window.location.href = href;
    void ghiDaGui("email");
  }

  async function lapHopDong() {
    if (!window.confirm("Lập hợp đồng từ báo giá này? Hạng mục sẽ chuyển sang công trình.")) return;
    setBusy(true);
    setError("");
    try {
      await callApi(`/api/bao-gia/${quotationId}/hanh-dong`, {
        method: "POST",
        body: JSON.stringify({ action: "lap-hop-dong", versionId, revision: rev, kind: "thi_cong" }),
      });
      router.push("/hop-dong");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lập được hợp đồng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] flex-col gap-2 px-4 py-3 sm:px-8">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-white px-4 text-sm font-semibold text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> Quay lại
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showApprove ? (
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                onClick={approve}
              >
                <Check className="size-4" aria-hidden /> Duyệt
              </button>
            ) : null}
            {showSend ? (
              <>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-white px-4 text-sm font-semibold text-ink"
                  onClick={guiZalo}
                >
                  <MessageCircle className="size-4" aria-hidden /> Gửi Zalo khách hàng
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-white px-4 text-sm font-semibold text-ink"
                  onClick={guiEmail}
                >
                  <Mail className="size-4" aria-hidden /> Gửi email khách hàng
                </button>
              </>
            ) : null}
            {showCreate ? (
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void lapHopDong()}
              >
                <FileSignature className="size-4" aria-hidden /> Lập hợp đồng
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-primary px-4 text-sm font-semibold text-white"
              onClick={() => window.print()}
            >
              <Download className="size-4" aria-hidden /> Tải PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
