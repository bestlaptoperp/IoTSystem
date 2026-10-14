'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatMs, formatVolt } from '@/utils/format'
import type { Reading } from '@/types/reading'

const BADGE = {
  SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
} as const

const PAGE_SIZES = [10, 50, 100] as const
type PageSize = (typeof PAGE_SIZES)[number]

export default function ReadingsTable({ readings }: { readings: Reading[] }) {
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Urutkan data terbaru di paling atas
  const sortedReadings = useMemo(() => [...readings].reverse(), [readings])

  const totalItems = sortedReadings.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Pastikan halaman aktif valid jika total data/pageSize berubah
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return sortedReadings.slice(start, start + pageSize)
  }, [sortedReadings, safeCurrentPage, pageSize])

  const fromItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const toItem = Math.min(safeCurrentPage * pageSize, totalItems)

  const handlePageSizeChange = (newSize: PageSize) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Container Tabel dengan Scroll Horizontal jika layar kecil */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="p-3.5 pl-5">Waktu</th>
              <th className="p-3.5">Vcap</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5">Prediksi</th>
              <th className="p-3.5">Tidur</th>
              <th className="p-3.5">Reset</th>
              <th className="p-3.5">WiFi</th>
              <th className="p-3.5 pr-5">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Belum ada data.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/50 transition-colors text-slate-700 font-medium">
                  <td className="p-3.5 pl-5 font-mono text-slate-600">
                    {formatDateTime(r.receivedAt)}
                    {r.wifiSsid && (
                      <span className="block text-[10px] text-slate-400 font-sans mt-0.5">
                        SSID: {r.wifiSsid}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900">{formatVolt(r.vcap)}</td>
                  <td className="p-3.5 text-center">
                    <Badge variant="outline" className={`text-[10px] ${BADGE[r.status]}`}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-slate-600">{formatVolt(r.predictedV)}</td>
                  <td className="p-3.5 text-slate-600">
                    {r.sleepS != null ? `${Math.round(r.sleepS / 60)} mnt` : '-'}
                  </td>
                  <td className="p-3.5 text-slate-600 font-mono text-[11px]">{r.resetReason ?? '-'}</td>
                  <td className="p-3.5 text-slate-600">{formatMs(r.wifiMs)}</td>
                  <td className="p-3.5 pr-5 text-slate-600">{formatMs(r.activeMs)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination Kontrol */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-600">
        {/* Kiri: Selector Baris per Halaman & Info Item */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Tampilkan:</span>
            <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <span className="text-slate-500 font-medium">data</span>
          </div>

          <div className="text-slate-500">
            Menampilkan <span className="font-semibold text-slate-800">{fromItem}</span>–
            <span className="font-semibold text-slate-800">{toItem}</span> dari{' '}
            <span className="font-semibold text-slate-800">{totalItems}</span> data
          </div>
        </div>

        {/* Kanan: Navigasi Tombol Pagination */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
            title="Halaman Pertama"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="px-3 py-1 text-xs font-medium text-slate-600 select-none">
            Halaman <strong className="font-bold text-slate-800">{safeCurrentPage}</strong> dari{' '}
            <strong className="font-bold text-slate-800">{totalPages}</strong>
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
            title="Halaman Terakhir"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
