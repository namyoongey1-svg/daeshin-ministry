"use client";

import { useState } from "react";
import { saveProfile } from "./actions";
import type { Profile } from "@/lib/auth";

const FIELDS = [
  { name: "name", label: "이름", required: true },
  { name: "church_name", label: "소속 교회", required: true },
  { name: "presbytery", label: "노회", required: true },
  { name: "position", label: "직분 (담임목사·부목사·전도사 등)", required: true },
  { name: "phone", label: "연락처 (선택)", required: false },
] as const;

export default function ProfileForm({ profile }: { profile?: Profile }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = await saveProfile(formData);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <form action={submit} className="mt-4 space-y-3">
      {FIELDS.map((field) => (
        <label key={field.name} className="block">
          <span className="mb-1 block text-xs text-muted">{field.label}</span>
          <input
            name={field.name}
            required={field.required}
            defaultValue={(profile?.[field.name as keyof Profile] as string) ?? ""}
            className="w-full rounded border border-line bg-surface px-3 py-2 text-sm"
          />
        </label>
      ))}
      <button
        disabled={saving}
        className="w-full rounded bg-accent px-4 py-2 text-sm text-background disabled:opacity-60"
      >
        {saving ? "저장 중…" : profile ? "고치기" : "가입 신청"}
      </button>
      {error && (
        <p className="rounded border border-highlight px-3 py-2 text-xs text-highlight">{error}</p>
      )}
    </form>
  );
}
