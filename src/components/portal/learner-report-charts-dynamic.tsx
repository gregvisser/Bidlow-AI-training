"use client";

import dynamic from "next/dynamic";

const chartLoading = () => (
  <div className="h-56 w-full animate-pulse rounded-xl bg-white/[0.04]" aria-hidden />
);

/** Recharts ResponsiveContainer is not SSR-safe; load charts only on the client. */
export const WeeklyActivityChart = dynamic(
  () => import("./learner-report-charts").then((m) => m.WeeklyActivityChart),
  { ssr: false, loading: chartLoading },
);

export const CourseBreakdownChart = dynamic(
  () => import("./learner-report-charts").then((m) => m.CourseBreakdownChart),
  { ssr: false, loading: chartLoading },
);

export const ProviderBreakdownChart = dynamic(
  () => import("./learner-report-charts").then((m) => m.ProviderBreakdownChart),
  { ssr: false, loading: chartLoading },
);
