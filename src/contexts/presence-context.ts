import { createContext } from 'react'
import type { OnlinePresence } from '@/types/social'

export interface PresenceContextValue {
  connected: boolean
  onlineUsers: OnlinePresence[]
  isUserOnline: (userId: string) => boolean
}

export const PresenceContext = createContext<PresenceContextValue | null>(null)
