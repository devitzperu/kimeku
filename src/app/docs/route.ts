import { ApiReference } from "@scalar/nextjs-api-reference"

export const GET = ApiReference({
  url: "/api/openapi.json",
  pageTitle: "doc-ia · API",
  theme: "default",
  layout: "modern",
  hideClientButton: false,
  customCss: `
    :root {
      --scalar-color-1: oklch(20% 0.01 60);
      --scalar-color-accent: oklch(64% 0.16 38);
      --scalar-background-1: oklch(98% 0.005 80);
      --scalar-background-2: oklch(95.5% 0.008 80);
      --scalar-border-color: oklch(89% 0.008 80);
      --scalar-font: var(--font-sans-loaded), ui-sans-serif, system-ui;
    }
    .dark, .scalar-app[data-theme="dark"] {
      --scalar-color-1: oklch(96% 0.005 80);
      --scalar-background-1: oklch(16% 0.008 60);
      --scalar-background-2: oklch(20% 0.008 60);
      --scalar-border-color: oklch(28% 0.008 60);
    }
  `,
})
