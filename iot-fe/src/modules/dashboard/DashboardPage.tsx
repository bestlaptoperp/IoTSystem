'use client'

import { useMemo, useState } from 'react'
import { Activity, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useGetMeQuery, useLogoutMutation } from '@/services/auth'
import { useGetDevicesQuery } from '@/services/device'
import { useGetReadingsQuery, useGetStatusStatsQuery, useGetSummaryQuery } from '@/services/reading'
import { useCurrentTime } from '@/utils/use-current-time'
import { exportReadingsToSimpleCsv } from '@/utils/export-csv'
import DeviceStatusCards from './components/DeviceStatusCards'
import EnergyMetricsCards from './components/EnergyMetricsCards'
import VoltageLineChart from './components/VoltageLineChart'
import StatusPieChart from './components/StatusPieChart'
import ReadingsTable from './components/ReadingsTable'
import ResetDeviceDialog from './components/ResetDeviceDialog'
import WifiConfigDialog from './components/WifiConfigDialog'

const RANGES = [
  { label: '1 hari', days: 1 },
  { label: '3 hari', days: 3 },
  { label: '7 hari', days: 7 },
]

export default function DashboardPage() {
  const [rangeDays, setRangeDays] = useState(3)
  const now = useCurrentTime()
  const { data: me } = useGetMeQuery()
  const [logout] = useLogoutMutation()

  const from = useMemo(() => {
    if (!now) return undefined
    const rounded = Math.floor(now / 60_000) * 60_000
    return new Date(rounded - rangeDays * 86_400_000).toISOString()
  }, [now, rangeDays])

  const { data: devicesRes } = useGetDevicesQuery(undefined, { pollingInterval: 60_000 })
  const device = devicesRes?.data?.[0]

  const { data: readingsRes } = useGetReadingsQuery(
    { deviceId: device?.id, from, limit: 1000 },
    { skip: !device || !from, pollingInterval: 60_000 },
  )
  const { data: statusRes } = useGetStatusStatsQuery(
    { deviceId: device?.id, from },
    { skip: !device || !from, pollingInterval: 60_000 },
  )
  const { data: summaryRes, isLoading: isSummaryLoading } = useGetSummaryQuery(
    { deviceId: device?.id, from },
    { skip: !device || !from, pollingInterval: 60_000 },
  )

  const readings = readingsRes?.data ?? []

  const handleExportCsv = () => {
    if (readings.length === 0) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    const success = exportReadingsToSimpleCsv(readings, device?.code ?? 'esp32c3-01')
    if (success) {
      toast.success(`Berhasil mengunduh ${readings.length} data telemetri!`)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans max-w-7xl mx-auto">
      {/* Header dengan Signature Icon Wrapper */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-linear-to-br from-red-600 to-red-900 text-white rounded-2xl shadow-md shadow-red-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Monitoring IoT Supercap</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {device ? `${device.name} (${device.code})` : 'Memuat perangkat...'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className={`h-9 px-4 text-xs rounded-xl cursor-pointer ${rangeDays === r.days
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
            >
              {r.label}
            </Button>
          ))}
          {me?.data.role === 'ADMIN' && device && (
            <>
              <WifiConfigDialog
                deviceId={device.id}
                deviceName={device.name}
                currentSsid={device.wifiSsid}
              />
              <ResetDeviceDialog deviceId={device.id} deviceName={device.name} />
            </>
          )}
          <Button
            onClick={() => logout()}
            className="h-9 px-4 text-xs rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
          >
            Keluar
          </Button>
        </div>
      </div>

      <DeviceStatusCards device={device} />

      <EnergyMetricsCards summary={summaryRes?.data} isLoading={isSummaryLoading} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Tegangan Supercap</h2>
          <VoltageLineChart readings={readings} />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Proporsi Status</h2>
          <StatusPieChart data={statusRes?.data ?? []} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Data Terbaru</h2>
            <p className="text-xs text-slate-500">Log telemetri siklus bangun dan kondisi superkapasitor</p>
          </div>
          <Button
            type="button"
            onClick={handleExportCsv}
            disabled={readings.length === 0}
            className="self-start sm:self-auto h-9 px-4 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white gap-2 cursor-pointer shadow-xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV ({readings.length})
          </Button>
        </div>
        <ReadingsTable readings={readings} />
      </div>
    </div>
  )
}
