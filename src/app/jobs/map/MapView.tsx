"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { distanceKm } from "@/lib/places";

/*
  카카오맵에 청빙공고를 핀으로 찍는다.

  지도는 무겁다. 공고 하나하나에 핀을 찍으면 한 교회가 다섯 건을 올렸을 때
  같은 자리에 핀 다섯 개가 겹친다. 그래서 핀은 교회 단위로 찍고, 누르면 그
  교회의 공고를 모두 보여 준다.

  카카오 SDK 는 타입이 없어 필요한 만큼만 여기에 적는다. 전역에 큰 타입을
  두면 실제로 쓰지 않는 API 까지 있는 것처럼 보인다.
*/

export interface MapPost {
  title: string;
  url: string;
  positions: string[];
  employment: string | null;
  departments: string[];
  postedAt: string | null;
  sourceLabel: string;
}

export interface MapPin {
  key: string;
  church: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  /** 어디까지 확인했는가. "구"가 가장 믿을 만하고, 뒤 둘은 같은 이름의 다른 교회일 수 있다. */
  matched: "구" | "시도" | "이름";
  posts: MapPost[];
}

interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}
interface KakaoMarker {
  setMap(map: unknown): void;
}
interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  /** 지도 칸 크기가 바뀐 뒤 다시 재게 한다. */
  relayout(): void;
}
interface Kakao {
  maps: {
    load(cb: () => void): void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => { extend(p: KakaoLatLng): void; isEmpty(): boolean };
    Map: new (el: HTMLElement, opts: { center: KakaoLatLng; level: number }) => KakaoMap & {
      setBounds(b: unknown): void;
    };
    Marker: new (opts: { position: KakaoLatLng; title?: string }) => KakaoMarker;
    MarkerClusterer: new (opts: {
      map: unknown;
      averageCenter: boolean;
      minLevel: number;
      disableClickZoom?: boolean;
    }) => { addMarkers(m: KakaoMarker[]): void; clear(): void };
    event: {
      addListener(target: unknown, type: string, cb: () => void): void;
    };
  };
}

declare global {
  interface Window {
    kakao?: Kakao;
  }
}

const SDK_ID = "kakao-maps-sdk";

/** 스크립트를 한 번만 붙인다. 페이지를 오갈 때마다 다시 받으면 느리다. */
function loadSdk(appKey: string): Promise<Kakao> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps?.Map) return resolve(window.kakao);

    const done = () => {
      const kakao = window.kakao;
      if (!kakao) return reject(new Error("카카오 지도를 불러오지 못했습니다."));
      kakao.maps.load(() => resolve(kakao));
    };

    const existing = document.getElementById(SDK_ID);
    if (existing) {
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("카카오 지도를 불러오지 못했습니다.")));
      return;
    }

    const script = document.createElement("script");
    script.id = SDK_ID;
    script.async = true;
    script.src =
      `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.addEventListener("load", done);
    script.addEventListener("error", () =>
      reject(new Error("카카오 지도를 불러오지 못했습니다. 카카오 개발자 사이트에 이 주소가 등록돼 있는지 확인하세요."))
    );
    document.head.appendChild(script);
  });
}

/** 남한 전체가 들어오는 자리. 핀이 하나도 없을 때 여기를 본다. */
const KOREA = { lat: 36.5, lng: 127.9, level: 13 };

export function MapView({ pins, appKey }: { pins: MapPin[]; appKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<MapPin | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let alive = true;
    let clusterer: { clear(): void } | null = null;
    let watching: ResizeObserver | null = null;
    /** 사람이 지도를 만졌는가. 만진 뒤에는 자동으로 자리를 바꾸지 않는다. */
    let touched = false;
    // 치울 때 ref 가 이미 바뀌어 있을 수 있어 지금 값을 붙잡아 둔다.
    const container = box.current;

    loadSdk(appKey)
      .then((kakao) => {
        if (!alive || !container) return;
        // 카카오는 지도를 칸 안에 제 DOM 으로 그리고 걷어내는 방법을 주지 않는다.
        // 리액트가 개발 모드에서 effect 를 두 번 돌면 같은 칸에 지도가 둘
        // 생기고, 먼저 만들어진 쪽이 위에 남아 범위를 못 받은 지도가 보인다.
        container.innerHTML = "";
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(KOREA.lat, KOREA.lng),
          level: KOREA.level,
        });

        const cluster = new kakao.maps.MarkerClusterer({
          map,
          averageCenter: true,
          minLevel: 7,
        });
        clusterer = cluster;

        const markers = pins.map((pin) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(pin.lat, pin.lng),
            title: `${pin.church} · 공고 ${pin.posts.length}건`,
          });
          kakao.maps.event.addListener(marker, "click", () => {
            setPicked(pin);
            map.setCenter(new kakao.maps.LatLng(pin.lat, pin.lng));
          });
          return marker;
        });
        cluster.addMarkers(markers);

        // 핀이 모두 들어오도록 지도를 맞춘다. 남한 한가운데를 고정으로 잡으면
        // 지도 칸의 가로세로 비에 따라 나라가 한쪽으로 밀리고 화면 절반이
        // 바다가 된다. 지역을 걸러 몇 곳만 남았을 때도 알아서 좁혀 준다.
        const bounds = new kakao.maps.LatLngBounds();
        for (const pin of pins) bounds.extend(new kakao.maps.LatLng(pin.lat, pin.lng));

        // 칸이 다 그려진 뒤에 맞춰야 한다. 카카오는 지도를 만들 때 잰 칸 크기를
        // 계속 쓰기 때문에, 그때 폭이 덜 잡혀 있으면 나중에 칸이 커져도 배율이
        // 그대로라 한국이 화면 한쪽으로 밀리고 절반이 바다가 된다. 한 번만
        // 맞추면 될 것 같지만, 칸 크기는 글꼴·이미지가 늦게 오면서 여러 번
        // 바뀐다. 그래서 칸이 바뀔 때마다 다시 맞춘다.
        const fit = () => {
          map.relayout();
          if (!bounds.isEmpty()) map.setBounds(bounds);
        };

        const watcher = new ResizeObserver(() => {
          // 사람이 지도를 움직이기 시작하면 더는 끼어들지 않는다.
          if (touched) return;
          fit();
        });
        watcher.observe(container);
        watching = watcher;

        // 끌거나 배율을 바꾸면 그때부터는 보는 사람 뜻대로 둔다.
        for (const type of ["dragstart", "zoom_start"])
          kakao.maps.event.addListener(map, type, () => {
            touched = true;
          });

        fit();
        setReady(true);
      })
      .catch((err: Error) => alive && setError(err.message));

    return () => {
      alive = false;
      clusterer?.clear();
      watching?.disconnect();
      if (container) container.innerHTML = "";
    };
  }, [pins, appKey]);

  /** 가까운 순서. 위치를 안 주면 공고가 많은 순서다. */
  const nearby = useMemo(() => {
    if (!me) return [...pins].sort((a, b) => b.posts.length - a.posts.length).slice(0, 12);
    return [...pins]
      .map((p) => ({ p, km: distanceKm(me, p) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 12)
      .map(({ p, km }) => ({ ...p, km }));
  }, [pins, me]);

  const askWhere = () => {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치를 알려주지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      // 위치를 막아도 지도는 그대로 쓸 수 있다. 조용히 넘어간다.
      () => setMe(null),
      { timeout: 8000 }
    );
  };

  if (error) {
    return (
      <p className="mt-6 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
        {error}
      </p>
    );
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="relative overflow-hidden rounded-card border border-line">
        <div ref={box} className="h-[58vh] min-h-[360px] w-full lg:h-[34rem]" />
        {!ready && (
          <p className="absolute inset-0 grid place-items-center bg-surface text-sm text-muted">
            지도를 불러오는 중입니다…
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-3">
        {picked ? (
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 text-lg font-bold">{picked.church}</h2>
              <button
                onClick={() => setPicked(null)}
                aria-label="닫기"
                className="h-9 w-9 shrink-0 rounded-pill text-muted transition-colors hover:bg-sunken"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-faint">{picked.address}</p>
            {picked.matched !== "구" && (
              // 어디까지 확인했는지 밝힌다. 같은 이름의 교회가 전국에 여럿 있다.
              <p className="mt-2 rounded-card bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
                {picked.matched === "시도"
                  ? "공고에 시·도까지만 적혀 있어 이름으로 찾은 자리입니다. 같은 이름의 다른 교회일 수 있으니 원문을 확인하세요."
                  : "공고에 지역이 없어 교회 이름으로 찾았습니다. 그 이름이 전국에 하나뿐이라 고른 자리지만, 원문에서 한 번 확인하세요."}
              </p>
            )}
            <ul className="mt-3 flex flex-col gap-3">
              {picked.posts.map((post) => (
                <li key={post.url} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm leading-relaxed underline-offset-4 hover:text-accent hover:underline"
                  >
                    {post.title}
                  </a>
                  <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-faint">
                    {[post.employment, ...post.positions, ...post.departments]
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag} className="rounded-pill bg-sunken px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                  </p>
                  <p className="mt-1.5 text-xs text-faint">
                    {post.sourceLabel}
                    {post.postedAt && ` · ${post.postedAt}`}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            핀을 누르면 그 교회의 공고가 여기 나옵니다.
          </div>
        )}

        <div className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">{me ? "내 위치에서 가까운 순" : "공고가 많은 교회"}</h3>
            {!me && (
              <button
                onClick={askWhere}
                className="rounded-pill border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong"
              >
                내 위치로
              </button>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {nearby.map((pin) => (
              <li key={pin.key}>
                <button
                  onClick={() => setPicked(pin)}
                  className="flex w-full items-baseline gap-2 rounded-card px-2 py-1.5 text-left text-sm transition-colors hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1 truncate">{pin.church}</span>
                  <span className="shrink-0 text-xs text-faint">
                    {"km" in pin ? `${(pin.km as number).toFixed(1)}km` : `${pin.posts.length}건`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
