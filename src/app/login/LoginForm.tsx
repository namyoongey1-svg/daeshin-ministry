"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { callbackWithNext, getSiteUrl } from "@/lib/site-url";
import { explainAuthError } from "@/lib/auth-errors";
import { SocialLogin } from "@/components/SocialLogin";

/**
 * 메일에 6자리 코드가 함께 오는가.
 *
 * Supabase 기본 메일은 링크만 보낸다. 코드를 넣으려면 메일 템플릿에
 * {{ .Token }} 을 넣어야 하는데, 템플릿 편집은 custom SMTP를 붙여야 열린다.
 * SMTP를 붙인 뒤 NEXT_PUBLIC_EMAIL_OTP=1 로 켠다.
 */
const CODE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_EMAIL_OTP === "1";

type Stage = "form" | "sent";

export default function LoginForm({
  initialError,
  next,
}: {
  initialError?: string;
  next?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const explained = explainAuthError(error);
  const isLocal = getSiteUrl().includes("localhost");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackWithNext(next) },
      });
      if (error) throw error;
      setStage("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.replace(/\D/g, ""),
        type: "email",
      });
      if (error) throw error;
      router.push(next ?? "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-bold">로그인</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        비밀번호는 쓰지 않습니다. 처음이면 그대로 가입이 됩니다.
      </p>

      <div className="mt-6">
        <SocialLogin next={next} />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />
        메일로 들어오기
        <span className="h-px flex-1 bg-line" />
      </div>

      {explained && (
        <div className="mt-4 rounded border border-highlight px-3 py-2 text-xs leading-relaxed">
          {explained.message}
        </div>
      )}

      {stage === "form" ? (
        <form onSubmit={send} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="메일 주소"
            className={field}
          />
          <button
            disabled={busy}
            className="w-full rounded bg-accent px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            {busy ? "보내는 중…" : explained?.resend ? "메일 다시 받기" : "로그인 메일 받기"}
          </button>
        </form>
      ) : (
        <>
          <div className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm leading-relaxed">
            <b>{email}</b> 으로 메일을 보냈습니다.
            <br />
            <b className="text-highlight">5분 안에</b> 메일 안의 링크를 눌러 주세요.
            <button
              onClick={() => { setStage("form"); setCode(""); setError(null); }}
              className="ml-2 text-xs text-muted underline hover:text-accent"
            >
              주소 고치기
            </button>
          </div>

          {isLocal && (
            <p className="mt-3 rounded border border-line px-3 py-2 text-xs leading-relaxed text-muted">
              <b>지금은 이 컴퓨터에서만 열립니다.</b> 링크가 <code>localhost</code>로
              돌아오기 때문에, 휴대폰이나 메일 앱 안에서 누르면 그 기기의 localhost를
              찾다가 실패합니다. 배포하면 어느 기기에서든 열립니다.
            </p>
          )}

          {CODE_LOGIN_ENABLED && (
            <form onSubmit={verify} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">
                  메일에 적힌 6자리 숫자를 넣어도 됩니다
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className={`${field} text-center text-lg tracking-[0.4em]`}
                />
              </label>
              <button
                disabled={busy || code.replace(/\D/g, "").length < 6}
                className="w-full rounded bg-accent px-4 py-2 text-sm text-background disabled:opacity-60"
              >
                {busy ? "확인 중…" : "코드로 들어가기"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
