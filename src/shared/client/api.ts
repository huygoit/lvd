export function formDataOf(event: { currentTarget: HTMLFormElement; nativeEvent: Event }) {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  return new FormData(event.currentTarget, submitter instanceof HTMLElement ? submitter : null);
}

export async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(url, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as { message?: string; details?: unknown };
  if (response.status === 401) {
    throw new Error("Phiên đăng nhập không còn hiệu lực. Hãy đăng nhập lại.");
  }
  if (!response.ok) {
    const error = new Error(body.message || "Không thực hiện được.") as Error & { details?: unknown };
    error.details = body.details;
    throw error;
  }
  return body as T;
}
