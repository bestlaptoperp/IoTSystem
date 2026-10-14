'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PowerStatus, StatusStat } from '@/types/reading'

const COLORS: Record<PowerStatus, string> = {
  SAFE: '#10b981',
  MEDIUM: '#f59e0b',
  CRITICAL: '#ef4444',
}

const LABELS: Record<PowerStatus, string> = {
  SAFE: 'Safe',
  MEDIUM: 'Medium',
  CRITICAL: 'Critical',
}

export default function StatusPieChart({ data }: { data: StatusStat[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  if (total === 0) {
    return <div className="h-56 flex items-center justify-center text-xs text-slate-400">Belum ada data.</div>
  }

  const chartData = data.map((d) => ({
    name: LABELS[d.status],
    value: d.count,
    status: d.status,
  }))

  return (
    <div className="flex flex-row items-center justify-center gap-4 sm:gap-6 py-2">
      {/* Donut Chart proporsional agar memberi ruang lega ke legend */}
      <div className="h-44 w-44 sm:h-48 sm:w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
            >
              {chartData.map((d) => (
                <Cell key={d.status} fill={COLORS[d.status]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: unknown) => {
                const num = Number(val) || 0
                return [`${num} (${((num / total) * 100).toFixed(1)}%)`, 'Jumlah']
              }}
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend dengan jaminan 1 baris utuh (whitespace-nowrap) */}
      <ul className="space-y-2.5 text-xs">
        {chartData.map((d) => (
          <li key={d.status} className="flex items-center gap-2 whitespace-nowrap">
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: COLORS[d.status] }}
            />
            <span className="font-semibold text-slate-700 min-w-12.5">{d.name}</span>
            <span className="text-slate-500 font-medium">
              {d.value} <span className="text-slate-400">({((d.value / total) * 100).toFixed(1)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
