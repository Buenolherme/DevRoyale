import { useContext } from 'react'
import { PresenceContext } from '@/contexts/presence-context'

export function usePresence() {
  const context = useContext(PresenceContext)
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider')
  }
  return context
}
