// src/components/placements-charts.tsx — Recharts wrappers for Placements dashboard

"use client";

import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ── Color Palette ────────────────────────────────────────────────────────────
const COLORS = ["#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#06b6d4", "#10b981", "#ec4899", "#6366f1"];

// ── Shared Tooltip Styles ─────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
};

// ── Area Chart ───────────────────────────────────────────────────────────────
export function ApexAreaChart({ data, dataKey, xKey = "year", color = "#8b5cf6" }: {
  data: object[];
  dataKey: string;
  xKey?: string;
  color?: string;
}) {
  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#e2e8f0" }} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#grad-${dataKey})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Bar Chart ────────────────────────────────────────────────────────────────
export function ApexBarChart({ data, dataKey, xKey = "name", color = "#8b5cf6", horizontal = false }: {
  data: object[];
  dataKey: string;
  xKey?: string;
  color?: string;
  horizontal?: boolean;
}) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 10, right: 10, left: horizontal ? 60 : -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <YAxis dataKey={xKey} type="category" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={65} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(139, 92, 246, 0.04)" }} />
          <Bar dataKey={dataKey} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Multi-Line Chart ──────────────────────────────────────────────────────────
export function ApexLineChart({ data, lines, xKey = "year" }: {
  data: object[];
  lines: { key: string; label: string; color?: string }[];
  xKey?: string;
}) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b", paddingTop: "10px" }} />
          {lines.map((l, i) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color ?? COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pie/Donut Chart ──────────────────────────────────────────────────────────
export function ApexPieChart({ data, nameKey = "name", valueKey = "value" }: {
  data: object[];
  nameKey?: string;
  valueKey?: string;
}) {
  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            dataKey={valueKey}
            nameKey={nameKey}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
