"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { routes } from "@/shared/config/routes";
import { inputClass } from "@/shared/components/controls";
import { cn, focusRing } from "@/shared/lib/cn";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const response = await fetch("/api/phien/dang-nhap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message || "Không đăng nhập được.");
      setPending(false);
      return;
    }
    window.location.href = routes.home;
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Tên đăng nhập</span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={cn(inputClass, "h-11")}
          placeholder="ten.dang.nhap"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Mật khẩu</span>
        <span className="relative block">
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(inputClass, "h-11 pr-11")}
            placeholder="Mật khẩu"
          />
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {message ? <p className="text-sm text-danger" role="alert">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className={cn("inline-flex h-11 w-full items-center justify-center rounded-[12px] bg-primary text-sm font-semibold text-white", focusRing)}
      >
        {pending ? "Đang vào" : "Đăng nhập"}
      </button>
    </form>
  );
}
