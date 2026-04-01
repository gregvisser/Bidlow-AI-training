"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AdminCourseChartRow = {
  name: string;
  full: string;
  enroll: number;
  avg: number;
};

export function AdminCourseCompletionChart({ data }: { data: AdminCourseChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#9498b8", fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: "#9498b8", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "rgba(14,16,38,0.95)",
            border: "1px solid rgba(120,140,255,0.2)",
            borderRadius: 12,
          }}
        />
        <Bar dataKey="avg" fill="#7c6cff" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
