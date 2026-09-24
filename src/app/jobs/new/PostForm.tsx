"use client";

import Link from "next/link";
import { useActionState } from "react";
import { DENOMINATIONS } from "@/lib/denomination";
import { EMPLOYMENT, POSITIONS } from "@/lib/jobs";
import { SIDO } from "@/lib/region";
import { createJobPost, type PostResult } from "./actions";

/*
  청빙공고를 직접 올리는 폼.

  수집한 공고는 게시판마다 적는 칸이 달라 교단도 사례비도 대부분 비어 있다.
  여기서는 처음부터 받는다. 특히 교단은 반드시 받는다 — 교회가 같은 교단
  사람만 뽑는 일이 많아, 없으면 구직자가 헛걸음한다.

  사례비도 반드시 남기게 한다. 범위를 적든지, 비공개면 그 까닭을 적든지
  둘 중 하나다. 사례비를 알 수 없는 공고는 지원할지 말지 판단할 수가 없다.
*/

const LABEL = "block text-sm font-medium";
const FIELD =
  "mt-1.5 w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none";

function Field({
  name, label, note, children, required = true,
}: {
  name: string; label: string; note?: string; children?: React.ReactNode; required?: boolean;
}) {
  return (
    <label className={LABEL} htmlFor={name}>
      {label}
      {required && <span className="ml-1 text-accent">*</span>}
      {note && <span className="ml-2 text-xs font-normal text-faint">{note}</span>}
      {children}
    </label>
  );
}

function Select({ name, options, placeholder }: { name: string; options: readonly string[]; placeholder: string }) {
  return (
    <select id={name} name={name} className={`${FIELD} cursor-pointer`} defaultValue="">
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

export function PostForm() {
  const [state, action, pending] = useActionState(
    async (_prev: PostResult, formData: FormData) => createJobPost(formData),
    {}
  );

  if (state.ok) {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-bold">공고를 올렸습니다.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          목록에 바로 올라갑니다. 연락처는 승인 회원에게만 보입니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/jobs" className="rounded-pill bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85">
            목록에서 보기
          </Link>
          <Link href="/jobs/new" className="rounded-pill border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-line-strong">
            하나 더 올리기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold">교회</h2>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          이미 등록한 교회면 같은 이름·지역으로 적어 주세요. 새로 만들지 않고 그대로 씁니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="church_name" label="교회 이름">
            <input id="church_name" name="church_name" required className={FIELD} placeholder="대로교회" />
          </Field>

          <Field name="denomination" label="교단" note="가장 중요합니다">
            <Select name="denomination" options={DENOMINATIONS} placeholder="교단을 고르세요" />
          </Field>

          <Field name="region" label="지역">
            <Select name="region" options={SIDO.filter((s) => s !== "해외")} placeholder="시·도를 고르세요" />
          </Field>

          <Field name="address" label="주소" required={false} note="지도에 표시됩니다">
            <input id="address" name="address" className={FIELD} placeholder="서울 강남구 …" />
          </Field>

          <Field name="pastor" label="담임목사" required={false}>
            <input id="pastor" name="pastor" className={FIELD} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">공고</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field name="title" label="제목">
              <input id="title" name="title" required className={FIELD} placeholder="중고등부 전임 전도사님을 모십니다" />
            </Field>
          </div>

          <Field name="position" label="직분">
            <Select name="position" options={POSITIONS} placeholder="직분을 고르세요" />
          </Field>

          <Field name="employment" label="근무 형태">
            <Select name="employment" options={EMPLOYMENT} placeholder="근무 형태를 고르세요" />
          </Field>

          <Field name="department" label="부서" required={false}>
            <input id="department" name="department" className={FIELD} placeholder="중고등부" />
          </Field>

          <Field name="deadline" label="마감일" required={false} note="비우면 채용 시까지">
            <input id="deadline" name="deadline" type="date" className={FIELD} />
          </Field>

          <div className="sm:col-span-2">
            <Field name="duties" label="사역 내용">
              <textarea id="duties" name="duties" required rows={5} className={FIELD} placeholder="맡으실 사역, 근무 요일과 시간, 바라는 점을 적어 주세요." />
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">사례비</h2>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          범위를 적어 주시거나, 비공개면 그 까닭을 적어 주세요. 사례비를 알 수 없는
          공고는 지원할지 판단할 수가 없어 둘 중 하나는 받습니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="pay_min" label="월 사례비 최소" required={false} note="만원">
            <input id="pay_min" name="pay_min" type="number" min={0} step={10} className={FIELD} placeholder="180" />
          </Field>
          <Field name="pay_max" label="월 사례비 최대" required={false} note="만원">
            <input id="pay_max" name="pay_max" type="number" min={0} step={10} className={FIELD} placeholder="220" />
          </Field>
          <div className="sm:col-span-2">
            <Field name="pay_note" label="비공개 사유 또는 덧붙일 말" required={false}>
              <input id="pay_note" name="pay_note" className={FIELD} placeholder="면접 후 협의합니다" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="housing" className="h-4 w-4 rounded border-line" />
            사택을 드립니다
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold">연락처</h2>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          승인 회원에게만 보입니다. 목록과 검색엔진에는 나가지 않습니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="contact_name" label="담당자">
            <input id="contact_name" name="contact_name" required className={FIELD} />
          </Field>
          <Field name="contact_phone" label="연락처">
            <input id="contact_phone" name="contact_phone" required className={FIELD} placeholder="010-0000-0000" />
          </Field>
        </div>
      </section>

      {state.error && (
        <p className="rounded-card border border-line bg-sunken px-4 py-3 text-sm text-foreground">
          {state.error}
        </p>
      )}

      <div>
        <button
          disabled={pending}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "올리는 중…" : "공고 올리기"}
        </button>
      </div>
    </form>
  );
}
