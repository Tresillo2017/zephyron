import { useState, useEffect, useRef } from 'react'
import { joinListeners, heartbeatListener, leaveListeners, fetchListenerCount } from '../lib/api'

const HEARTBEAT_INTERVAL = 30_000 // 30 seconds

/**
 * Hook that tracks live listener count for a set.
 * When the current user is playing this set, it auto-joins and heartbeats.
 * Returns the live listener count.
 */
export function useListeners(setId: string | undefined, isListening: boolean): number {
  const [count, setCount] = useState(0)
  const listenerIdRef = useRef<string>('')

  // Get or create a stable listener ID
  useEffect(() => {
    let id = localStorage.getItem('zephyron_anonymous_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('zephyron_anonymous_id', id)
    }
    listenerIdRef.current = id
  }, [])

  // Join / leave based on listening state
  useEffect(() => {
    if (!setId || !listenerIdRef.current) return

    if (!isListening) {
      // Just fetch count passively
      fetchListenerCount(setId)
        .then((res) => setCount(res.data.listeners))
        .catch(() => {})
      return
    }

    // Join
    joinListeners(setId, listenerIdRef.current)
      .then((res) => setCount(res.data.listeners))
      .catch(() => {})

    // Heartbeat interval
    const interval = setInterval(() => {
      heartbeatListener(setId, listenerIdRef.current)
        .then((res) => setCount(res.data.listeners))
        .catch(() => {})
    }, HEARTBEAT_INTERVAL)

    // Leave on cleanup
    return () => {
      clearInterval(interval)
      leaveListeners(setId, listenerIdRef.current).catch(() => {})
    }
  }, [setId, isListening])

  return count
}
