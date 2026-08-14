import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { connectPresence } from '@/lib/presence-service'
import type { OnlinePresence } from '@/types/social'
import { PresenceContext } from './presence-context'

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { authenticated, user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlinePresence[]>([])

  useEffect(() => {
    if (!authenticated || !user?.username) {
      return
    }

    return connectPresence(
      {
        userId: user.id,
        username: user.username,
        status: 'online',
      },
      {
        onConnectionChange: setConnected,
        onPresenceChange: setOnlineUsers,
      },
    )
  }, [authenticated, user?.id, user?.username])

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers.map((presence) => presence.userId)),
    [onlineUsers],
  )
  const isUserOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds],
  )
  const value = useMemo(
    () => ({ connected, onlineUsers, isUserOnline }),
    [connected, isUserOnline, onlineUsers],
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}
