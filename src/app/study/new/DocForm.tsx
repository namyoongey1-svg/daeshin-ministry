"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createStudyFromDoc, type StudyResult } from "../actions";

/*
  워드 문서로 올리기.

  인도자가 이미 매주 쓰는 문서를 그대로 받는다. 양식을 새로 배우게 하지 않는다.
  문서 안의 구절·언어·낱말·뜻·연상 팁을 읽어 화면과 퀴즈를 만든다.
*/

const LABEL = "block text-sm font-medium";
const FIELD =
  "mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none";

export function DocForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: StudyResult, formData: FormData) => {
      const result = await createStudyFromDoc(formData);
      if (result.id) router.push(`/study/${result.id}`);
      return result;
    },
    {}
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className={LABEL} htmlFor="file">
        스터디 문서 (.docx)
        <input id="file" name="file" type="file" accept=".docx" required className={`${FIELD} cursor-pointer file:mr-3 file:rounded-pill file:border-0 file:bg-sunken file:px-3 file:py-1 file:text-xs`} />
      </label>

      <p className="rounded-card border border-line bg-sunken px-4 py-3 text-xs leading-relaxed text-muted">
        매주 쓰시는 문서 그대로면 됩니다 — 「본문: 창세기 1장 1절」, 「1. 히브리어 (…)」 머리말,
        「• 낱말 (읽기) : 뜻」, 「💡 연상 팁: …」. 본문이 둘이어도 됩니다. 퀴즈는 여기 적힌
        뜻과 연상 팁에서 냅니다.
      </p>

      <label className={LABEL} htmlFor="doc_title">
        제목
        <span className="ml-2 text-xs font-normal text-faint">비우면 문서 제목을 씁니다</span>
        <input id="doc_title" name="title" className={FIELD} placeholder="4주차 — 말씀이 육신이 되어" />
      </label>

      <label className={LABEL} htmlFor="doc_notes">
        덧붙일 말
        <span className="ml-2 text-xs font-normal text-faint">비워도 됩니다</span>
        <textarea id="doc_notes" name="notes" rows={3} className={FIELD} placeholder="모임에서 나온 질문, 다음 주 안내…" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={LABEL} htmlFor="doc_count">
          퀴즈 문제 수
          <select id="doc_count" name="count" defaultValue="10" className={`${FIELD} cursor-pointer`}>
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

      {state.error && <p className="rounded-card border border-line bg-sunken px-4 py-3 text-sm">{state.error}</p>}

      <div>
        <button
          disabled={pending}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "문서를 읽고 문제를 만드는 중…" : "문서로 올리기"}
        </button>
      </div>
    </form>
  );
}
