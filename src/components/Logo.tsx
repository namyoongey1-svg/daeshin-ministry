/**
 * 사역자톡방 마크.
 *
 * 말풍선(톡방)에 십자가를 파냈다. 파낸 자리로 배경이 비치므로 밝은 곳이든
 * 어두운 곳이든 한 벌로 쓴다. 20px까지 줄여도 형태가 뭉개지지 않도록
 * 획을 굵게 두고 장식을 넣지 않았다.
 */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" role="presentation">
      <mask id="daeshin-logo-mask">
        {/* 흰 곳이 남고 검은 곳이 뚫린다 */}
        <rect width="24" height="24" fill="black" />
        <rect x="2" y="2.6" width="20" height="14.4" rx="5" fill="white" />
        <path d="M7 15.5h5l-4.6 5.9a.75.75 0 0 1-1.34-.46V15.5z" fill="white" />
        {/* 십자가 */}
        <rect x="10.85" y="5.1" width="2.3" height="9.4" rx="1.15" fill="black" />
        <rect x="7.5" y="8.65" width="9" height="2.3" rx="1.15" fill="black" />
      </mask>
      <rect width="24" height="24" fill="currentColor" mask="url(#daeshin-logo-mask)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-7 w-7 text-accent" />
      <span className="text-[0.95rem] font-bold tracking-tight">
        대신 교역자 <span className="text-accent">사역자톡방</span>
      </span>
    </span>
  );
}
