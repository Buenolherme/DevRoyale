import { supabase } from '@/lib/supabase'
import type { RoomInviteRealtimeEvent, RoomRealtimeEvent } from '@/types'

const OFFLINE_GRACE_PERIOD_MS = 5_000

type RoomPresenceMetadata = {
  userId: string
  username: string
  connectedAt: string
  [key: string]: unknown
}

export interface RoomRealtimeCallbacks {
  onRoomChange: (event: RoomRealtimeEvent) => void
  onPresenceChange: (connectedUserIds: Set<string>) => void
  onConnectionChange: (connected: boolean) => void
}

export function subscribeRoom(
  roomId: string,
  user: { id: string; username: string },
  callbacks: RoomRealtimeCallbacks,
): () => void {
  const channel = supabase.channel(`room:${roomId}`, {
    config: {
      private: true,
      presence: { key: user.id },
    },
  })
  const connectedUserIds = new Set<string>()
  const offlineTimers = new Map<string, number>()
  let closed = false

  const emitPresence = () => {
    if (!closed) callbacks.onPresenceChange(new Set(connectedUserIds))
  }

  const syncPresence = () => {
    if (closed) return
    const state = channel.presenceState<RoomPresenceMetadata>()
    const nextUserIds = new Set(
      Object.values(state)
        .flat()
        .map((presence) => presence.userId)
        .filter((userId): userId is string => typeof userId === 'string'),
    )

    nextUserIds.forEach((userId) => {
      const timerId = offlineTimers.get(userId)
      if (timerId !== undefined) window.clearTimeout(timerId)
      offlineTimers.delete(userId)
      connectedUserIds.add(userId)
    })

    connectedUserIds.forEach((userId) => {
      if (nextUserIds.has(userId) || offlineTimers.has(userId)) return
      const timerId = window.setTimeout(() => {
        offlineTimers.delete(userId)
        connectedUserIds.delete(userId)
        emitPresence()
      }, OFFLINE_GRACE_PERIOD_MS)
      offlineTimers.set(userId, timerId)
    })

    emitPresence()
  }

  channel
    .on('broadcast', { event: 'room_changed' }, ({ payload }) => {
      if (!closed) callbacks.onRoomChange(payload as RoomRealtimeEvent)
    })
    .on('presence', { event: 'sync' }, syncPresence)
    .subscribe((status) => {
      if (closed) return

      if (status === 'SUBSCRIBED') {
        callbacks.onConnectionChange(true)
        void channel.track({
          userId: user.id,
          username: user.username,
          connectedAt: new Date().toISOString(),
        } satisfies RoomPresenceMetadata)
        return
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        callbacks.onConnectionChange(false)
      }
    })

  return () => {
    if (closed) return
    closed = true
    callbacks.onConnectionChange(false)
    offlineTimers.forEach((timerId) => window.clearTimeout(timerId))
    offlineTimers.clear()
    connectedUserIds.clear()
    void channel
      .untrack()
      .catch(() => undefined)
      .finally(() => {
        void supabase.removeChannel(channel)
      })
  }
}

export function subscribeRoomInvites(
  userId: string,
  onChange: (event: RoomInviteRealtimeEvent) => void,
): () => void {
  const channel = supabase.channel(`user:${userId}:room-invites`, {
    config: { private: true },
  })

  channel
    .on('broadcast', { event: 'room_invite_changed' }, ({ payload }) => {
      onChange(payload as RoomInviteRealtimeEvent)
    })
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
