"use server";

import { revalidatePath } from "next/cache";
import { getVerse } from "@/lib/bible/data";
import type { Verse } from "@/lib/bible/types";
import { makeCode } from "@/lib/quiz";
import { formatPassage, generateQuestions, parsePassage, type StudyLang } from "@/lib/study";
import { createClient } from "@/lib/supabase/server";

export interface StudyResult {
  error?: string;
  id?: string;
}

async function requireApproved() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." as const };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." as const };
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", auth.user.id).maybeSingle();
  if (profile?.status !== "승인") return { error: "운영진 승인을 받은 뒤에 스터디를 올릴 수 있습니다." as const };
  return { supabase, userId: auth.user.id };
}

/**
 * 스터디를 올리고 본문에서 퀴즈를 만든다.
 *
 * 퀴즈를 못 만들어도 스터디는 남긴다. 본문이 짧아 문제가 안 나오는 일이
 * 있는데, 그렇다고 본문까지 안 올라가면 안 된다.
 */
export async function createStudy(formData: FormData): Promise<StudyResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };
  const { supabase, userId } = gate;

  const title = String(formData.get("title") ?? "").trim();
  const passageText = String(formData.get("passage") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const count = Math.min(20, Math.max(3, Number(formData.get("count")) || 10));
  if (!title) return { error: "제목을 적어 주세요. 예: 10월 셋째 주 — 요한복음 1:1-5" };

  const passage = parsePassage(passageText);
  if (!passage) return { error: "본문을 알아보지 못했습니다. 「요 1:1-5」 처럼 적어 주세요. 한 번에 40절까지입니다." };

  // 언어와 본문이 맞아야 한다. 헬라어 본문은 신약뿐이고, 히브리어 본문은 구약뿐이다.
  const lang = String(formData.get("lang") ?? "") as StudyLang;
  const testament = passage.book.testament;
  if (lang === "grc" && testament !== "nt") return { error: "헬라어 본문은 신약만 있습니다. 구약은 히브리어나 라틴어를 골라 주세요." };
  if (lang === "hbo" && testament !== "ot") return { error: "히브리어 본문은 구약만 있습니다. 신약은 헬라어나 라틴어를 골라 주세요." };
  if (!["grc", "hbo", "lat"].includes(lang)) return { error: "언어를 골라 주세요." };

  const verses: Verse[] = [];
  for (let v = passage.from; v <= passage.to; v++) {
    const verse = await getVerse(passage.book.osis, passage.chapter, v);
    if (verse) verses.push(verse);
  }
  if (verses.length === 0) return { error: `${formatPassage(passage)} 본문을 찾지 못했습니다. 장·절을 확인해 주세요.` };

  const { data: study, error } = await supabase
    .from("studies")
    .insert({
      title,
      passage: formatPassage(passage),
      book: passage.book.osis,
      chapter: passage.chapter,
      verse_from: passage.from,
      verse_to: verses[verses.length - 1].verse,
      notes,
      lang,
      published: formData.get("published") !== "off",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // 씨앗을 날짜에서 뽑아, 같은 날 같은 본문이면 같은 문제가 나온다.
  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")) + verses[0].chapter;
  const questions = generateQuestions(verses, passage.book, count, seed);

  if (questions.length >= 2) {
    const code = await freeCode(supabase);
    if (code) {
      const { data: quiz } = await supabase
        .from("quizzes")
        .insert({ owner_id: userId, title: `원어 스터디 · ${title}`, sermon: formatPassage(passage), code })
        .select("id")
        .single();
      if (quiz) {
        const { error: qError } = await supabase.from("quiz_questions").insert(
          questions.map((q, i) => ({ quiz_id: quiz.id, position: i + 1, ...q }))
        );
        if (qError) await supabase.from("quizzes").delete().eq("id", quiz.id);
        else await supabase.from("studies").update({ quiz_code: code }).eq("id", study.id);
      }
    }
  }

  revalidatePath("/study");
  return { id: study.id as string };
}

async function freeCode(supabase: Awaited<ReturnType<typeof createClient>> & object): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = makeCode();
    const { data: taken } = await supabase.from("quizzes").select("id").eq("code", candidate).maybeSingle();
    if (!taken) return candidate;
  }
  return null;
}

export async function removeStudy(formData: FormData): Promise<void> {
  const gate = await requireApproved();
  if ("error" in gate) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { data: study } = await gate.supabase.from("studies").select("quiz_code").eq("id", id).maybeSingle();
  await gate.supabase.from("studies").delete().eq("id", id);
  // 퀴즈도 같이 거둔다. 스터디 없는 퀴즈가 코드로 열려 있을 이유가 없다.
  if (study?.quiz_code) await gate.supabase.from("quizzes").delete().eq("code", study.quiz_code);
  revalidatePath("/study");
}
