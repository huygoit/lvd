import { Suspense } from "react";
import { requireUser } from "@/shared/auth/session";
import { initials } from "@/shared/auth/users";
import { showPlannedModules } from "@/shared/config/env";
import { buildNavigation } from "@/shared/config/navigation";
import { AppChrome } from "@/shared/components/app-chrome";
import { loadAttention } from "@/modules/dashboard/services/load";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-full bg-page" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const attention = await loadAttention(user);
  const groups = buildNavigation(user, showPlannedModules());
  return (
    <div className="min-h-full bg-page text-ink">
      <a className="skip-link" href="#noi-dung">
        Đi tới nội dung
      </a>
      <AppChrome
        account={{ name: user.name, roleLabel: user.roleLabel, initials: initials(user.name) }}
        attention={attention}
        groups={groups}
      />
      <main id="noi-dung" className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
