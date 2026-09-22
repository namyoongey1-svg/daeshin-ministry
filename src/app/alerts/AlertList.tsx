"use client";

import { useState, useTransition } from "react";
import { EMPLOYMENT, POSITIONS, REGIONS } from "@/lib/jobs";
import { addAlert, removeAlert, toggleAlert } from "./actions";

export interface AlertRow {
  id: string;
  label: string;
  active: boolean;
  /** 지금 올라와 있는 공고 중 이 조건에 드는 수 */
  matching: number;
}

const field =
  "rounded-pill border border-line bg-surface px-4 py-2 text-sm text-foreground";

export default function AlertList({
  alerts,
  email,
}: {
  alerts: AlertRow[];
  /** 카카오로 들어왔고 이메일 동의를 안 했으면 없다. */
  email: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-8">
      <form
        action={(formData) => run(() => addAlert(formData))}
        className="rounded-card border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-bold">조건 추가</h2>
        <p className="mt-1 text-xs text-muted">
          비워 두면 전체입니다. 셋 다 비우면 올라오는 모든 공고를 받습니다.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select name="region" className={field} defaultValue="">
            <option value="">지역 전체</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select name="position" className={field} defaultValue="">
            <option value="">직분 전체</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select name="employment" className={field} defaultValue="">
            <option value="">근무 형태 전체</option>
            {EMPLOYMENT.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <button
            disabled={pending}
            className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            추가
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-card border border-highlight px-4 py-2 text-xs text-highlight">
          {error}
        </p>
      )}

      <h2 className="mt-10 text-sm font-bold">
        받고 있는 알림 {alerts.length > 0 && `(${alerts.length})`}
      </h2>

      {alerts.length === 0 ? (
        <p className="mt-3 rounded-card border border-dashed border-line py-10 text-center text-sm text-muted">
          아직 없습니다. 위에서 조건을 정해 주세요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${alert.active ? "" : "text-faint line-through"}`}>
                  {alert.label}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  지금 올라와 있는 공고 중 {alert.matching.toLocaleString()}건이 이 조건에 듭니다
                </p>
              </div>

              <button
                onClick={() => run(() => toggleAlert(alert.id, !alert.active))}
                disabled={pending}
                className="rounded-pill border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong disabled:opacity-60"
              >
                {alert.active ? "잠시 멈춤" : "다시 받기"}
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${alert.label}" 알림을 지울까요?`)) {
                    run(() => removeAlert(alert.id));
                  }
                }}
                disabled={pending}
                className="text-xs text-muted transition-colors hover:text-highlight disabled:opacity-60"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {email ? (
        <p className="mt-6 text-xs leading-relaxed text-faint">
          알림은 <b>{email}</b> 으로 갑니다. 주소를 바꾸시려면 그 주소로 다시 로그인하세요.
        </p>
      ) : (
        /* 메일 주소가 없으면 조건을 아무리 잡아도 아무것도 오지 않는다. */
        <p className="mt-6 rounded border border-highlight px-3 py-2 text-xs leading-relaxed">
          <b>이 계정에는 메일 주소가 없습니다.</b> 카카오는 메일 주소를 선택 동의로
          받기 때문입니다. 조건은 저장되지만 메일은 가지 않습니다 — 메일 주소로
          한 번 더 로그인하시면 그때부터 받으십니다.
        </p>
      )}
    </div>
  );
}
