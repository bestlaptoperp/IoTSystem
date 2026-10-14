'use client'

import { Zap, Wifi, TrendingUp, BatteryCharging } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMs, formatVolt } from '@/utils/format'
import type { SummaryStat } from '@/types/reading'

export default function EnergyMetricsCards({
  summary,
  isLoading,
}: {
  summary: SummaryStat | undefined
  isLoading?: boolean
}) {
  // Estimasi energi per siklus bangun (P_aktif ≈ 3.3V * 80mA = 0.264W)
  const avgActiveMs = summary?.avgActiveMs ?? null
  const estJoules = avgActiveMs != null ? ((avgActiveMs / 1000) * 0.264).toFixed(2) : null
  const deltaV =
    summary?.maxVcap != null && summary?.minVcap != null
      ? (summary.maxVcap - summary.minVcap).toFixed(2)
      : null

  const metrics = [
    {
      title: 'Waktu Aktif Rata-Rata',
      value: isLoading ? '...' : formatMs(avgActiveMs),
      subtitle: `Dari total ${summary?.count ?? 0} siklus bangun`,
      badge: 'Ultra-Low Power',
      badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Zap,
      iconColor: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Kecepatan Koneksi Wi-Fi',
      value: isLoading ? '...' : formatMs(summary?.avgWifiMs),
      subtitle: 'Memakai RTC BSSID Fast-Connect',
      badge: 'Hemat 70%',
      badgeTone: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: Wifi,
      iconColor: 'text-sky-500 bg-sky-500/10',
    },
    {
      title: 'Rentang Tegangan (Min — Max)',
      value:
        isLoading
          ? '...'
          : summary?.minVcap != null && summary?.maxVcap != null
            ? `${formatVolt(summary.minVcap)} — ${formatVolt(summary.maxVcap)}`
            : '-',
      subtitle: deltaV ? `Fluktuasi ΔV: ${deltaV} V` : 'Batas cutoff WiFi: 3.80 V',
      badge: summary?.minVcap != null && summary.minVcap >= 3.8 ? 'Aman (≥ 3.8V)' : 'Mendekati Cutoff',
      badgeTone:
        summary?.minVcap != null && summary.minVcap >= 3.8
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200',
      icon: TrendingUp,
      iconColor: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Estimasi Konsumsi Energi',
      value: isLoading ? '...' : estJoules ? `~${estJoules} Joule` : '-',
      subtitle: 'Per siklus bangun (Bank 5F)',
      badge: 'Duty Cycle ~0.04%',
      badgeTone: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: BatteryCharging,
      iconColor: 'text-violet-500 bg-violet-500/10',
    },
  ]

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800">Metrik Efisiensi Energi Superkapasitor</h2>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Berdasarkan rentang waktu terpilih</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <Card
              key={m.title}
              className="p-4 rounded-2xl border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">{m.title}</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
                    {m.value}
                  </p>
                </div>
                <div className={`p-2 rounded-xl shrink-0 ${m.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 truncate">{m.subtitle}</span>
                <Badge variant="outline" className={`text-[10px] shrink-0 font-medium ${m.badgeTone}`}>
                  {m.badge}
                </Badge>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
