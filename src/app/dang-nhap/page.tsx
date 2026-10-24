import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";
import { LoginForm } from "@/app/dang-nhap/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Body />
    </Suspense>
  );
}

async function Body() {
  const current = await readUser();
  if (current) redirect(routes.home);
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between" style={{ background: "var(--gradient-brand)" }}>
        <div className="pointer-events-none absolute -top-24 -left-16 size-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-[-4rem] bottom-[-3rem] size-96 rounded-full bg-sky/25" />
        <div className="pointer-events-none absolute top-1/2 right-16 hidden -translate-y-1/2 xl:block">
          <div className="relative h-[420px] w-56 rounded-[36px] border border-white/25 bg-white/10 p-4 shadow-[0_30px_80px_rgba(2,8,23,0.28)]">
            <div className="absolute top-1/2 left-4 size-3 -translate-y-1/2 rounded-full bg-white/80" />
            <div className="h-full rounded-[26px] border border-white/20 bg-gradient-to-b from-white/15 to-white/5" />
          </div>
        </div>
        <div className="relative px-12 pt-12">
          <p className="text-xs font-medium tracking-[0.22em] text-white/80">LIÊN VIỆT DOOR</p>
        </div>
        <div className="relative max-w-xl px-12 pb-16">
          <h1 className="text-4xl font-semibold leading-tight">Cửa nhôm kính cho từng công trình</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-white/80">
            Khách hàng, báo giá, hợp đồng, kho và thi công nằm chung một chỗ. Quyền vào việc theo vai trò được gán.
          </p>
          <p className="mt-10 text-sm text-white/70">07 Phước Hòa 2, P. Cẩm Lệ, TP. Đà Nẵng</p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-page px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 overflow-hidden rounded-[18px] text-white lg:hidden" style={{ background: "var(--gradient-brand)" }}>
            <div className="px-5 py-4">
              <p className="text-xs tracking-[0.18em] text-white/80">LIÊN VIỆT DOOR</p>
              <p className="mt-1 text-lg font-semibold">Cửa nhôm kính cho từng công trình</p>
            </div>
          </div>
          <p className="text-sm font-medium text-primary">Nội bộ</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Đăng nhập</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Nhập tên đăng nhập và mật khẩu. Quyền gắn theo vai trò, không theo chức danh.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
