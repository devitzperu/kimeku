import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "*": [
      "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/query_engine-*",
      "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/libquery_engine-*",
      "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/schema.prisma",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@esbuild/**",
      "node_modules/sharp/vendor/**",
      "CLAUDE.md",
      "CLAUDE.local.md",
      "AGENTS.md",
      "LICENSE_EE.md",
      "README.md",
      "tsconfig.tsbuildinfo",
      "scripts/**",
      "prisma/seed.ts",
      "pnpm-lock.yaml",
      ".next/cache/**",
    ],
  },
};

export default nextConfig;
