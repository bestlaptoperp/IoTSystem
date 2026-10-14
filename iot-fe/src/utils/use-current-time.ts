'use client'

import { useSyncExternalStore } from 'react'

let cachedNow = Date.now()
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  setInterval(() => {
    cachedNow = Date.now()
    listeners.forEach((listener) => listener())
  }, 10_000)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return cachedNow
}

function getServerSnapshot() {
  return 0
}

export function useCurrentTime() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
