'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { deriveDeviceState } from '@/utils/device-state'
import { formatDateTime, formatVolt } from '@/utils/format'
import { useCurrentTime } from '@/utils/use-current-time'
import type { Device } from '@/types/device'

export default function DeviceStatusCards({ device }: { device: Device | undefined }) {
  const now = useCurrentTime()
  const latest = device?.latestReading ?? null
  const state = deriveDeviceState(device?.lastSeenAt ?? null, latest?.sleepS ?? null, now || undefined)

  const items = [
    { label: 'Tegangan terakhir', value: formatVolt(latest?.vcap) },
    { label: 'Status penjadwalan', value: latest?.status ?? '-' },
    { label: 'Terakhir terlihat', value: device?.lastSeenAt ? formatDateTime(device.lastSeenAt) : '-' },
    {
      label: 'Boot ke / alasan reset',
      value: latest ? `${latest.bootCount ?? '-'} / ${latest.resetReason ?? '-'}` : '-',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4 rounded-2xl border-slate-200 bg-white shadow-xs">
          <p className="text-[11px] font-normal text-slate-400">{it.label}</p>
          <p className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{it.value}</p>
        </Card>
      ))}

      {/* Banner Kondisi Real-Time: Bangun / Deep Sleep / Hemat Daya */}
      <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            {state.isAwake ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </>
            ) : state.status === 'SLEEPING' ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
            ) : state.status === 'OVERDUE' ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Kondisi Perangkat Saat Ini: {state.label}
              </span>
            </div>
          </div>
        </div>

        {device?.wifiSsid && (
          <Badge
            variant="outline"
            className="text-xs bg-slate-50 text-slate-700 border-slate-200 px-3 py-1 font-mono font-medium"
          >
            Wi-Fi: {device.wifiSsid}
          </Badge>
        )}
      </div>
    </div>
  )
}
