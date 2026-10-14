'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLoginMutation } from '@/services/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [login, { isLoading }] = useLoginMutation()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password }).unwrap()
      router.replace('/')
    } catch {
      toast.error('Email atau password salah.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-linear-to-br from-red-600 to-red-900 text-white rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Masuk</h1>
            <p className="text-xs text-slate-500">Dashboard Monitoring IoT</p>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@iot.local"
            className="h-9 text-xs rounded-xl"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-9 text-xs rounded-xl"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer mt-2"
        >
          {isLoading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
    </div>
  )
}
