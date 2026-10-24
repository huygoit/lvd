import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readUser } from "@/shared/auth/session";
import { routes } from "@/shared/config/routes";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const user = await readUser();
  redirect(user ? routes.home : routes.login);
  return null;
}
