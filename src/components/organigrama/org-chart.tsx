"use client"

import dynamic from "next/dynamic"

export const OrgChart = dynamic(
  () => import("./org-chart-inner").then((m) => m.OrgChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="py-16 text-center text-sm text-fg-subtle">Cargando organigrama…</div>
    ),
  }
)
