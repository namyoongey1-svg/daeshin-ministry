"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAnswer, deleteQuestion } from "../actions";

/** 본인 글에만 뜬다. 정책도 본인 것만 지우도록 막아 둔다. */
export default function DeleteButton({
  kind,
  id,
  questionId,
}: {
  kind: "question" | "answer";
  id: string;
  questionId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    const what = kind === "question" ? "질문" : "답변";
    if (!confirm(`이 ${what}을 지울까요? 되돌릴 수 없습니다.`)) return;

    startTransition(async () => {
      if (kind === "question") {
        await deleteQuestion(id);
        router.push("/qna");
      } else {
        await deleteAnswer(id, questionId ?? "");
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="text-xs text-muted transition-colors hover:text-highlight disabled:opacity-60"
    >
      {pending ? "지우는 중…" : "삭제"}
    </button>
  );
}
