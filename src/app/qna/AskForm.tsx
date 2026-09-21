"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TOPICS } from "@/lib/qna";
import { askQuestion } from "./actions";

export default function AskForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-8 w-full rounded-card border border-dashed border-line py-5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        + 익명으로 물어보기
      </button>
    );
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await askQuestion(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (result.id) router.push(`/qna/${result.id}`);
      else router.refresh();
    });
  }

  const field = "w-full rounded-card border border-line bg-surface px-4 py-2.5 text-sm";

  return (
    <form action={submit} className="mt-8 rounded-card border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">익명으로 물어보기</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-xs text-muted hover:text-foreground"
        >
          닫기
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        <select name="topic" className={field} defaultValue="목회 고민">
          {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input name="title" required placeholder="한 줄로 요약하면" className={field} />
        <textarea
          name="body"
          required
          placeholder="상황을 적어 주세요. 교회 이름이나 사람 이름은 빼 주시는 편이 안전합니다."
          className={`${field} h-36 leading-relaxed`}
        />
      </div>

      <button
        disabled={pending}
        className="mt-4 rounded-pill bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "올리는 중…" : "올리기"}
      </button>

      {error && (
        <p className="mt-3 rounded-card border border-highlight px-4 py-2 text-xs text-highlight">
          {error}
        </p>
      )}
    </form>
  );
}
