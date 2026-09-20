import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 원어 본문·사전 JSON은 런타임에 fs로 읽으므로 번들 추적에 명시해야
  // 서버리스 배포에서도 함께 올라간다.
  outputFileTracingIncludes: {
    "/tools/original": ["./src/data/**/*.json"],
    "/tools/original/lemma": ["./src/data/**/*.json"],
    "/": ["./src/data/scraped/*.json"],
    "/jobs": ["./src/data/scraped/*.json"],
  },
};

export default nextConfig;
