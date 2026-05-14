import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/engines", "bcryptjs"],
  outputFileTracingRoot: path.join(__dirname),
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
