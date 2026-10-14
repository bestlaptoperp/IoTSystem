'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetMeQuery } from '@/services/auth'

export function PageGuard({ children, role }: { children: React.ReactNode; role?: 'ADMIN' }) {
  const router = useRouter()
  const { data, isLoading, isError } = useGetMeQuery()

  useEffect(() => {
    if (isError) router.replace('/login')
  }, [isError, router])

  if (isLoading) return <div className="p-8 text-xs text-slate-400">Memuat...</div>
  if (!data) return null
  if (role && data.data.role !== role) return <div className="p-8 text-xs text-red-600">Akses ditolak.</div>

  return <>{children}</>
}
