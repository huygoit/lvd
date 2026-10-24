import { forbidden, notFound } from "next/navigation";
import { isAppError } from "@/shared/errors";

export function rethrowPage(error: unknown): never {
  if (isAppError(error)) {
    if (error.status === 404) notFound();
    if (error.status === 403) forbidden();
  }
  throw error;
}
