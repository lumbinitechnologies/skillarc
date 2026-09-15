"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
} from "recharts"
import { TrendingUp, Star } from "lucide-react"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 text-left">
        <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-sm font-bold text-slate-800">
            {p.name}: {p.value}{p.name === "Performance" ? "%" : " pts"}
          </p>
        ))}
      </div>
    )
  }
  return null
}

interface StudentReportCardChartsProps {
  summaryBar: Array<{ name: string; Performance: number; fill: string }>
  radarData: Array<{ subject: string; Performance: number }>
}

export default function StudentReportCardCharts({
  summaryBar,
  radarData,
}: StudentReportCardChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Subject Performance Summary</h3>
        </div>
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Performance" radius={[6, 6, 0, 0]}>
                {summaryBar.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Subject Radar Analysis</h3>
        </div>
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
              <Radar
                name="Performance"
                dataKey="Performance"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.15}
                dot={{ fill: "#4f46e5", r: 3 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
