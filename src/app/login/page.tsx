"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCallbackUrl } from "@/lib/site-url";

type State = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getCallbackUrl() },
      });
      if (error) throw error;
      setState({ kind: "sent" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-bold">로그인</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        비밀번호 없이 메일로 받은 링크로 들어옵니다. 처음이면 그대로 가입이 됩니다.
      </p>

      {state.kind === "sent" ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm leading-relaxed">
          <b>{email}</b> 으로 링크를 보냈습니다.
          <br />
          메일함을 확인해 주세요. 링크는 한 시간 동안 유효합니다.
        </div>
      ) : (
        <form onSubmit={send} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="메일 주소"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm"
          />
          <button
            disabled={state.kind === "sending"}
            className="w-full rounded bg-accent px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            {state.kind === "sending" ? "보내는 중…" : "로그인 링크 받기"}
          </button>
          {state.kind === "error" && (
            <p className="rounded border border-highlight px-3 py-2 text-xs leading-relaxed text-highlight">
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
