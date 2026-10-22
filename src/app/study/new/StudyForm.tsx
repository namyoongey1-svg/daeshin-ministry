"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { STUDY_LANGS } from "@/lib/study";
import { createStudy, type StudyResult } from "../actions";

const LABEL = "block text-sm font-medium";
const FIELD =
  "mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none";

export function StudyForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: StudyResult, formData: FormData) => {
      const result = await createStudy(formData);
      if (result.id) router.push(`/study/${result.id}`);
      return result;
    },
    {}
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-6">
      <label className={LABEL} htmlFor="title">
        제목
        <input id="title" name="title" required className={FIELD} placeholder="10월 셋째 주 — 말씀이 육신이 되어" />
      </label>

      <label className={LABEL} htmlFor="lang">
        언어
        <select id="lang" name="lang" defaultValue="grc" className={`${FIELD} cursor-pointer`}>
          {STUDY_LANGS.map((l) => (
            <option key={l.value} value={l.value}>{l.label} — {l.note}</option>
          ))}
        </select>
      </label>

      <label className={LABEL} htmlFor="passage">
        본문
        <span className="ml-2 text-xs font-normal text-faint">한 번에 40절까지. 우리 성경 번호로 적으세요. 라틴어 시편은 불가타 번호로 자동으로 맞춥니다.</span>
        <input id="passage" name="passage" required className={FIELD} placeholder="요 1:1-5" />
      </label>

      <label className={LABEL} htmlFor="notes">
        인도자 메모
        <span className="ml-2 text-xs font-normal text-faint">빈 줄로 문단을 나눕니다. 비워도 됩니다.</span>
        <textarea
          id="notes"
          name="notes"
          rows={8}
          className={FIELD}
          placeholder={"이번 주에 눈여겨볼 낱말, 문법, 모임에서 나온 질문…"}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL} htmlFor="count">
          퀴즈 문제 수
          <select id="count" name="count" defaultValue="10" className={`${FIELD} cursor-pointer`}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n}문제</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
          <input type="checkbox" name="published" value="on" defaultChecked className="h-4 w-4 rounded border-line" />
          누구나 볼 수 있게 공개
        </label>
      </div>

      <p className="rounded-card border border-line bg-sunken px-4 py-3 text-xs leading-relaxed text-muted">
        퀴즈는 본문의 낱말에서 자동으로 만듭니다 — 동사의 시제·태·법, 명사의 격·수·성,
        사전형, 뜻. 오답은 정답에서 한 가지만 바꿔 만들어, 찍어서는 맞히기 어렵습니다.
        채점은 서버에서 하고 풀이는 다 푼 뒤에 보입니다.
      </p>

      {state.error && (
        <p className="rounded-card border border-line bg-sunken px-4 py-3 text-sm">{state.error}</p>
      )}

      <div>
        <button
          disabled={pending}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "본문을 읽고 문제를 만드는 중…" : "스터디 올리기"}
        </button>
      </div>
    </form>
  );
}
