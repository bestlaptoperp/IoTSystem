'use client'

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateTime } from '@/utils/format'
import type { Reading } from '@/types/reading'

type Point = { t: number; vcap: number | null }
const GAP_MS = 2 * 60 * 60 * 1000 // Celah > 2 jam dianggap alat mati (malam), garis diputus

function withGaps(readings: Reading[]): Point[] {
  const out: Point[] = []
  readings.forEach((r, i) => {
    const t = new Date(r.receivedAt).getTime()
    const prev = out[out.length - 1]
    if (i > 0 && prev && t - prev.t > GAP_MS) out.push({ t: prev.t + 1, vcap: null })
    out.push({ t, vcap: r.vcap })
  })
  return out
}

export default function VoltageLineChart({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) {
    return <div className="h-72 flex items-center justify-center text-xs text-slate-400">Belum ada data.</div>
  }
  const data = withGaps(readings)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => formatDateTime(Number(v))}
            tick={{ fontSize: 11 }}
          />
          <YAxis domain={[3.4, 4.4]} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            labelFormatter={(v) => formatDateTime(Number(v))}
            formatter={(v) => `${Number(v).toFixed(2)} V`}
          />
          <ReferenceLine
            y={3.8}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: 'Batas WiFi 3.80 V', fontSize: 10, fill: '#ef4444', position: 'insideBottomRight' }}
          />
          <Line type="monotone" dataKey="vcap" name="Vcap" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
