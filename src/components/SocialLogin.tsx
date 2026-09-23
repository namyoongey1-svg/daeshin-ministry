"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callbackWithNext } from "@/lib/site-url";

/**
 * 카카오·구글로 들어오기.
 *
 * 매직링크는 메일함을 열었다 와야 하고, 휴대폰에서는 그 사이에 창이 닫히기
 * 쉽다. 교역자는 대부분 카카오를 쓰므로 카카오를 먼저 둔다.
 *
 * 카카오는 기본으로 꺼 둔다. Supabase 가 인가 요청에 `account_email` 을 항상
 * 끼워 보내는데, 카카오에서 그 동의항목은 비즈 앱 심사를 통과해야 열린다.
 * 그 전에는 누르는 족족 KOE205 로 끝난다 — 누르면 반드시 실패하는 버튼을
 * 사이트에 두면, 들어오는 사람은 사이트가 고장 난 것으로 알게 된다.
 * 심사가 끝나면 NEXT_PUBLIC_KAKAO_LOGIN=1 로 켜면 된다.
 *
 * 켰을 때를 위해 카카오는 메일 주소를 주지 않을 수 있다는 점을 그대로 다뤄 둔다.
 * 콘티 저장에는 메일이 필요 없고, 메일 알림은 주소가 없으면 건너뛴다.
 */
const KAKAO_ENABLED = process.env.NEXT_PUBLIC_KAKAO_LOGIN === "1";
const PROVIDERS = [
  {
    id: "kakao" as const,
    label: "카카오로 계속하기",
    className: "bg-[#FEE500] text-[#191600] hover:brightness-95",
    icon: (
      // 카카오톡 말풍선
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
        <path d="M12 3C6.99 3 3 6.2 3 10.14c0 2.5 1.65 4.7 4.15 5.96l-.9 3.3c-.09.32.27.58.55.4l3.97-2.6c.4.04.81.06 1.23.06 5.01 0 9-3.2 9-7.12C21 6.2 17.01 3 12 3Z" />
      </svg>
    ),
  },
  {
    id: "google" as const,
    label: "구글로 계속하기",
    className: "border border-line bg-surface hover:border-line-strong",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
        <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.56-5.15 3.56-8.8Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.86-3c-1.07.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.29a12 12 0 0 0 0 10.74l3.98-3.1Z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
    ),
  },
];

export function SocialLogin({ next }: { next?: string }) {
  const providers = PROVIDERS.filter((p) => p.id !== "kakao" || KAKAO_ENABLED);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "kakao" | "google") {
    setBusy(provider);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        // 로그인하러 오기 전에 보던 화면으로 돌려보낸다.
        options: { redirectTo: callbackWithNext(next) },
      });
      if (error) throw error;
      // 성공하면 브라우저가 해당 서비스로 넘어가므로 여기로 돌아오지 않는다.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => signIn(p.id)}
          disabled={busy !== null}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${p.className}`}
        >
          {p.icon}
          {busy === p.id ? "넘어가는 중…" : p.label}
        </button>
      ))}

      {error && (
        <p className="rounded border border-highlight px-3 py-2 text-xs leading-relaxed">
          {error}
          <br />
          <span className="text-muted">
            Supabase 대시보드에서 해당 로그인이 켜져 있는지 확인해 주세요.
          </span>
        </p>
      )}
    </div>
  );
}
