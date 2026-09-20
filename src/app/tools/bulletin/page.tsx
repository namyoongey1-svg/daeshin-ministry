"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore, newId } from "@/lib/local-store";
import {
  SERVICE_NAMES,
  buildOrder,
  emptyBulletin,
  formatKoreanDate,
  tidyReference,
  type Bulletin,
  type Notice,
  type OrderItem,
  type ScheduleItem,
} from "@/lib/bulletin";

const store = createLocalStore<Bulletin>("daeshin.bulletin", emptyBulletin(), (raw) => ({
  ...emptyBulletin(),
  ...(raw as Partial<Bulletin>),
}));

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

export default function BulletinPage() {
  const bulletin = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  const patch = (changes: Partial<Bulletin>) =>
    store.update((current) => ({ ...current, ...changes }));

  function moveOrder(index: number, delta: number) {
    const next = [...bulletin.order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ order: next });
  }

  function patchOrder(id: string, changes: Partial<OrderItem>) {
    patch({
      order: bulletin.order.map((o) => (o.id === id ? { ...o, ...changes } : o)),
    });
  }

  function changeService(serviceName: string) {
    // 이미 손본 순서를 말없이 덮어쓰지 않는다.
    const replace =
      bulletin.order.length === 0 ||
      confirm(serviceName + " 기본 순서로 바꿀까요? 지금 적은 순서는 사라집니다.");
    patch(replace ? { serviceName, order: buildOrder(serviceName) } : { serviceName });
  }

  return (
    <div>
      <div className="no-print">
        <h1 className="text-xl font-bold">주보 · 예배 순서지</h1>
        <p className="mt-1 text-sm text-muted">
          예배 종류를 고르면 기본 순서가 채워집니다. 고친 내용은 이 브라우저에만 저장됩니다.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label>
            <span className={label}>예배</span>
            <select
              className={field}
              value={bulletin.serviceName}
              onChange={(e) => changeService(e.target.value)}
            >
              {SERVICE_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>날짜</span>
            <input
              type="date"
              className={field}
              value={bulletin.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </label>
          <button
            onClick={() => window.print()}
            className="rounded bg-accent px-4 py-2 text-sm text-background"
          >
            인쇄 / PDF 저장
          </button>
          <button
            onClick={() => {
              if (confirm("적은 내용을 모두 지울까요?")) store.set(emptyBulletin());
            }}
            className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
          >
            새로 시작
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <section className="no-print space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-bold">교회 정보</h2>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={label}>교회명</span>
                <input className={field} value={bulletin.churchName}
                  onChange={(e) => patch({ churchName: e.target.value })} />
              </label>
              <label>
                <span className={label}>담임목사</span>
                <input className={field} value={bulletin.pastor}
                  onChange={(e) => patch({ pastor: e.target.value })} />
              </label>
              <label>
                <span className={label}>주소</span>
                <input className={field} value={bulletin.address}
                  onChange={(e) => patch({ address: e.target.value })} />
              </label>
              <label>
                <span className={label}>전화</span>
                <input className={field} value={bulletin.phone}
                  onChange={(e) => patch({ phone: e.target.value })} />
              </label>
            </div>
            <label className="mt-2 block">
              <span className={label}>표어 · 주제 말씀</span>
              <input className={field} value={bulletin.theme}
                onChange={(e) => patch({ theme: e.target.value })} />
            </label>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold">예배 순서</h2>
            <ul className="space-y-2">
              {bulletin.order.map((item, i) => (
                <li key={item.id} className="rounded border border-line p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={field} placeholder="순서" value={item.title}
                      onChange={(e) => patchOrder(item.id, { title: e.target.value })} />
                    <input className={field} placeholder="담당" value={item.leader}
                      onChange={(e) => patchOrder(item.id, { leader: e.target.value })} />
                  </div>
                  <input
                    className={field + " mt-2"}
                    placeholder="비고 — 찬송가 21장 / 요 3:16 / 설교 제목"
                    value={item.note}
                    onChange={(e) => patchOrder(item.id, { note: e.target.value })}
                    onBlur={(e) => patchOrder(item.id, { note: tidyReference(e.target.value) })}
                  />
                  <div className="mt-1 flex gap-2 text-xs text-muted">
                    <button onClick={() => moveOrder(i, -1)} className="hover:text-accent">↑</button>
                    <button onClick={() => moveOrder(i, 1)} className="hover:text-accent">↓</button>
                    <button
                      onClick={() => patch({ order: bulletin.order.filter((o) => o.id !== item.id) })}
                      className="ml-auto hover:text-highlight"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              onClick={() =>
                patch({ order: [...bulletin.order, { id: newId(), title: "", leader: "", note: "" }] })
              }
              className="mt-2 text-xs text-accent hover:underline"
            >
              + 순서 추가
            </button>
          </div>

          <RepeatableSection<Notice>
            heading="광고 · 소식"
            items={bulletin.notices}
            onChange={(notices) => patch({ notices })}
            create={() => ({ id: newId(), title: "", body: "" })}
            addLabel="+ 광고 추가"
            render={(item, change) => (
              <>
                <input className={field} placeholder="제목" value={item.title}
                  onChange={(e) => change({ title: e.target.value })} />
                <textarea className={field + " mt-2 h-16"} placeholder="내용" value={item.body}
                  onChange={(e) => change({ body: e.target.value })} />
              </>
            )}
          />

          <RepeatableSection<ScheduleItem>
            heading="주간 일정"
            items={bulletin.schedule}
            onChange={(schedule) => patch({ schedule })}
            create={() => ({ id: newId(), when: "", what: "" })}
            addLabel="+ 일정 추가"
            render={(item, change) => (
              <div className="grid grid-cols-[8rem_1fr] gap-2">
                <input className={field} placeholder="수 19:30" value={item.when}
                  onChange={(e) => change({ when: e.target.value })} />
                <input className={field} placeholder="수요기도회" value={item.what}
                  onChange={(e) => change({ what: e.target.value })} />
              </div>
            )}
          />
        </section>

        <section className="print-sheet rounded-lg border border-line bg-surface p-8">
          <header className="border-b-2 border-foreground pb-3 text-center">
            <h2 className="text-2xl font-bold">{bulletin.churchName || "교회 이름"}</h2>
            {bulletin.theme && <p className="mt-1 text-sm">{bulletin.theme}</p>}
            <p className="mt-2 text-sm">
              {bulletin.serviceName} · {formatKoreanDate(bulletin.date)}
            </p>
          </header>

          <table className="mt-5 w-full border-collapse text-sm">
            <tbody>
              {bulletin.order.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="w-28 py-1.5 font-medium">{item.title}</td>
                  <td className="py-1.5">{item.note}</td>
                  <td className="w-28 py-1.5 text-right text-muted">{item.leader}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {bulletin.notices.length > 0 && (
            <section className="mt-6 border-t border-line pt-4">
              <h3 className="mb-2 font-bold">광고</h3>
              <ul className="space-y-2 text-sm">
                {bulletin.notices.map((n) => (
                  <li key={n.id}>
                    <b>{n.title}</b>
                    {n.body && <span className="ml-1 whitespace-pre-line">{n.body}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {bulletin.schedule.length > 0 && (
            <section className="mt-6 border-t border-line pt-4">
              <h3 className="mb-2 font-bold">이번 주 일정</h3>
              <ul className="space-y-1 text-sm">
                {bulletin.schedule.map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="w-24 shrink-0 text-muted">{s.when}</span>
                    <span>{s.what}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="mt-8 border-t border-line pt-3 text-center text-xs text-muted">
            {[bulletin.pastor && "담임 " + bulletin.pastor, bulletin.address, bulletin.phone]
              .filter(Boolean)
              .join(" · ")}
          </footer>
        </section>
      </div>
    </div>
  );
}

/** 광고·일정처럼 줄을 늘려 가며 적는 묶음 */
function RepeatableSection<T extends { id: string }>({
  heading,
  items,
  onChange,
  create,
  addLabel,
  render,
}: {
  heading: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  addLabel: string;
  render: (item: T, change: (changes: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">{heading}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded border border-line p-2">
            {render(item, (changes) =>
              onChange(items.map((i) => (i.id === item.id ? { ...i, ...changes } : i)))
            )}
            <button
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              className="mt-1 text-xs text-muted hover:text-highlight"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => onChange([...items, create()])}
        className="mt-2 text-xs text-accent hover:underline"
      >
        {addLabel}
      </button>
    </div>
  );
}
