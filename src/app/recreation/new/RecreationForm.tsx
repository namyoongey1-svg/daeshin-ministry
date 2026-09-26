"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { AGE_GROUPS, CATEGORIES, PLACES } from "@/lib/recreation";
import { addRecreation, type ActionResult } from "../actions";

const LABEL = "block text-sm font-medium";
const FIELD =
  "mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none";

function Select({ name, options }: { name: string; options: readonly string[] }) {
  return (
    <select id={name} name={name} className={`${FIELD} cursor-pointer`} defaultValue={options[0]}>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function RecreationForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => addRecreation(formData),
    {}
  );

  useEffect(() => {
    if (state.id) router.push(`/recreation/${state.id}`);
  }, [state.id, router]);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <label className={LABEL} htmlFor="title">
        제목<span className="ml-1 text-accent">*</span>
        <input id="title" name="title" required className={FIELD} placeholder="이름표 빙고" />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL} htmlFor="category">
          갈래
          <Select name="category" options={CATEGORIES} />
        </label>
        <label className={LABEL} htmlFor="age_group">
          대상
          <Select name="age_group" options={AGE_GROUPS} />
        </label>
        <label className={LABEL} htmlFor="place">
          장소
          <Select name="place" options={PLACES} />
        </label>
        <label className={LABEL} htmlFor="minutes">
          걸리는 시간
          <span className="ml-2 text-xs font-normal text-faint">분</span>
          <input id="minutes" name="minutes" type="number" min={1} className={FIELD} placeholder="20" />
        </label>
        <label className={LABEL} htmlFor="min_people">
          최소 인원
          <span className="ml-2 text-xs font-normal text-faint">비우면 상관없음</span>
          <input id="min_people" name="min_people" type="number" min={1} className={FIELD} placeholder="10" />
        </label>
        <label className={LABEL} htmlFor="max_people">
          최대 인원
          <span className="ml-2 text-xs font-normal text-faint">비우면 상관없음</span>
          <input id="max_people" name="max_people" type="number" min={1} className={FIELD} placeholder="40" />
        </label>
      </div>

      <label className={LABEL} htmlFor="supplies">
        준비물
        <span className="ml-2 text-xs font-normal text-faint">없으면 비워 두세요</span>
        <input id="supplies" name="supplies" className={FIELD} placeholder="이름표, 볼펜, 호루라기" />
      </label>

      <label className={LABEL} htmlFor="body">
        진행 방법<span className="ml-1 text-accent">*</span>
        <span className="ml-2 text-xs font-normal text-faint">
          처음 해 보는 사람이 그대로 따라 할 수 있게 적어 주세요
        </span>
        <textarea
          id="body"
          name="body"
          required
          rows={10}
          className={FIELD}
          placeholder={"1. 모두에게 이름표와 볼펜을 나눠 줍니다.\n2. …\n\n해 보니 이런 점이 좋았다 / 이건 조심해야 한다 같은 것도 함께 적어 주시면 큰 도움이 됩니다."}
        />
      </label>

      {state.error && (
        <p className="rounded-card border border-line bg-sunken px-4 py-3 text-sm">{state.error}</p>
      )}

      <div>
        <button
          disabled={pending}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "올리는 중…" : "나누기"}
        </button>
      </div>
    </form>
  );
}
