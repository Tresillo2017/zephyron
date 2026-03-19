import { nanoid } from 'nanoid'
import { useState } from 'react'

const STORAGE_KEY = 'zephyron_anonymous_id'

function getOrCreateAnonymousId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = nanoid(16)
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

export function useAnonymousId(): string {
  const [id] = useState(getOrCreateAnonymousId)
  return id
}

/**
 * Initialize anonymous ID on app startup.
 * Call this once in the root component.
 */
export function initAnonymousId(): void {
  getOrCreateAnonymousId()
}
