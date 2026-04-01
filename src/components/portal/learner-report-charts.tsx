"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ContentProvider } from "@/generated/prisma";
import { providerLabel } from "@/lib/labels";

type WeeklyPoint = { week: string; label: string; events: number };

export function WeeklyActivityChart({ data }: { data: WeeklyPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="wFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c6cff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c6cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#9498b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#9498b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(14,16,38,0.95)",
              border: "1px solid rgba(120,140,255,0.2)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "#f4f5ff" }}
          />
          <Area type="monotone" dataKey="events" stroke="#7c6cff" fill="url(#wFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CourseBreakdownChart({
  courses,
}: {
  courses: { title: string; percent: number }[];
}) {
  const data = courses.map((c) => ({ name: c.title.slice(0, 24), full: c.title, pct: c.percent }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9498b8", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "#9498b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(14,16,38,0.95)",
              border: "1px solid rgba(120,140,255,0.2)",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="pct" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProviderBreakdownChart({
  providers,
}: {
  providers: { provider: ContentProvider; completed: number; total: number }[];
}) {
  const data = providers.map((p) => ({
    label: providerLabel(p.provider),
    pct: p.total > 0 ? Math.round((p.completed / p.total) * 1000) / 10 : 0,
    meta: `${p.completed} / ${p.total} lessons`,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#9498b8", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: "#9498b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(14,16,38,0.95)",
              border: "1px solid rgba(120,140,255,0.2)",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="pct" fill="#7c6cff" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
