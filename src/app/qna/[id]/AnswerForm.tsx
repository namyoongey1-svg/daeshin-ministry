"use client";

import { useRef, useState, useTransition } from "react";
import { answerQuestion } from "../actions";

export default function AnswerForm({ questionId }: { questionId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await answerQuestion(questionId, formData);
      if (result.error) setError(result.error);
      else formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="mt-6">
      <textarea
        name="body"
        required
        placeholder="겪어 보신 일이나 도움이 될 말을 적어 주세요."
        className="h-28 w-full rounded-card border border-line bg-surface px-4 py-2.5 text-sm leading-relaxed"
      />
      <button
        disabled={pending}
        className="mt-2 rounded-pill bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "올리는 중…" : "답변 남기기"}
      </button>
      {error && (
        <p className="mt-3 rounded-card border border-highlight px-4 py-2 text-xs text-highlight">
          {error}
        </p>
      )}
    </form>
  );
}
