"use server";

import { revalidatePath } from "next/cache";
import { makeCode, normalizeCode, type Graded } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

export interface QuizResult {
  error?: string;
  code?: string;
}

async function requireApproved() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." as const };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.status !== "승인") {
    return { error: "운영진 승인을 받은 뒤에 퀴즈를 만들 수 있습니다." as const };
  }
  return { supabase, userId: auth.user.id };
}

interface DraftQuestion {
  prompt: string;
  choices: string[];
  answer: number;
  note: string;
}

/** 폼에서 온 문제들을 읽는다. 빈 문제는 버린다 — 칸을 넉넉히 두고 받기 때문이다. */
function readQuestions(formData: FormData): DraftQuestion[] {
  const out: DraftQuestion[] = [];
  for (let i = 0; i < 30; i++) {
    const prompt = String(formData.get(`q${i}_prompt`) ?? "").trim();
    if (!prompt) continue;

    const choices: string[] = [];
    for (let c = 0; c < 5; c++) {
      const value = String(formData.get(`q${i}_c${c}`) ?? "").trim();
      if (value) choices.push(value);
    }
    const answer = Number(formData.get(`q${i}_answer`) ?? 0);
    out.push({
      prompt,
      choices,
      answer: Number.isInteger(answer) ? answer : 0,
      note: String(formData.get(`q${i}_note`) ?? "").trim(),
    });
  }
  return out;
}

export async function createQuiz(formData: FormData): Promise<QuizResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };
  const { supabase, userId } = gate;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "퀴즈 제목을 적어 주세요." };

  const questions = readQuestions(formData);
  if (questions.length === 0) return { error: "문제를 하나 이상 적어 주세요." };

  for (const [i, q] of questions.entries()) {
    if (q.choices.length < 2) {
      return { error: `${i + 1}번 문제의 보기를 둘 이상 적어 주세요.` };
    }
    if (q.answer < 0 || q.answer >= q.choices.length) {
      return { error: `${i + 1}번 문제의 정답을 골라 주세요.` };
    }
  }

  /*
    코드가 겹치면 다시 뽑는다.

    여섯 자리에 서른두 글자라 겹칠 일이 드물지만, 겹치면 남의 퀴즈에 답이
    들어가는 일이라 조용히 넘어갈 수 없다. 몇 번 시도해도 안 되면 알린다.
  */
  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = makeCode();
    const { data: taken } = await supabase
      .from("quizzes")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (!taken) {
      code = candidate;
      break;
    }
  }
  if (!code) return { error: "참여 코드를 만들지 못했습니다. 다시 시도해 주세요." };

  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      owner_id: userId,
      title,
      sermon: String(formData.get("sermon") ?? "").trim(),
      code,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: qError } = await supabase.from("quiz_questions").insert(
    questions.map((q, i) => ({
      quiz_id: quiz.id,
      position: i + 1,
      prompt: q.prompt,
      choices: q.choices,
      answer: q.answer,
      note: q.note,
    }))
  );

  if (qError) {
    // 문제 없는 퀴즈를 남겨 두면 참여자가 빈 화면을 만난다.
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    return { error: qError.message };
  }

  revalidatePath("/quiz");
  return { code };
}

/** 퀴즈를 닫거나 다시 연다. 닫으면 더 이상 답을 받지 않는다. */
export async function setQuizOpen(id: string, open: boolean): Promise<QuizResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };

  const { error } = await gate.supabase.from("quizzes").update({ open }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quiz");
  return {};
}

export async function removeQuiz(id: string): Promise<QuizResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };

  const { error } = await gate.supabase.from("quizzes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quiz");
  return {};
}

export interface GradeResult {
  error?: string;
  graded?: Graded;
}

/**
 * 답을 내고 점수를 받는다.
 *
 * 로그인하지 않은 사람도 부른다. 채점은 DB 함수가 하므로 정답이 브라우저로
 * 내려가지 않는다 — 내려보내면 개발자 도구를 열 줄 아는 학생이 30초 만에
 * 만점을 받는다.
 */
export async function submitQuiz(
  code: string,
  player: string,
  picked: (number | null)[]
): Promise<GradeResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const name = player.trim();
  if (!name) return { error: "이름을 적어 주세요." };

  const { data, error } = await supabase.rpc("grade_quiz", {
    quiz_code: normalizeCode(code),
    player_name: name,
    // 안 고른 문제는 -1 로 보낸다. null 을 넣으면 배열 길이가 어긋난다.
    picked: picked.map((p) => (p === null ? -1 : p)),
  });

  if (error) return { error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "채점하지 못했습니다." };

  return { graded: row as Graded };
}
