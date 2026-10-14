'use client'

import { Suspense } from 'react'
import { PageGuard } from '@/components/auth/PageGuard'
import DashboardPage from '@/modules/dashboard/DashboardPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Memuat dashboard...</div>}>
      <PageGuard>
        <DashboardPage />
      </PageGuard>
    </Suspense>
  )
}
