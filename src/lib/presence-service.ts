import { supabase } from '@/lib/supabase'
import type { OnlinePresence, PresenceStatus } from '@/types/social'

const PRESENCE_CHANNEL_NAME = 'devroyale:online'

type PresenceMetadata = OnlinePresence & {
  onlineAt: string
  [key: string]: unknown
}

const STATUS_PRIORITY: Record<PresenceStatus, number> = {
  online: 1,
  spectating: 2,
  in_battle: 3,
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
  return value === 'online' || value === 'in_battle' || value === 'spectating'
}

function readPresenceState(
  state: Record<string, PresenceMetadata[]>,
): OnlinePresence[] {
  const usersById = new Map<string, OnlinePresence>()

  Object.values(state).forEach((presences) => {
    presences.forEach((presence) => {
      if (
        typeof presence.userId !== 'string' ||
        typeof presence.username !== 'string' ||
        !isPresenceStatus(presence.status)
      ) {
        return
      }

      const current = usersById.get(presence.userId)
      if (!current || STATUS_PRIORITY[presence.status] > STATUS_PRIORITY[current.status]) {
        usersById.set(presence.userId, {
          userId: presence.userId,
          username: presence.username,
          status: presence.status,
        })
      }
    })
  })

  return [...usersById.values()].sort((first, second) =>
    first.username.localeCompare(second.username),
  )
}

export interface PresenceConnectionInput {
  userId: string
  username: string
  status?: PresenceStatus
}

export interface PresenceConnectionCallbacks {
  onConnectionChange: (connected: boolean) => void
  onPresenceChange: (onlineUsers: OnlinePresence[]) => void
}

export function connectPresence(
  input: PresenceConnectionInput,
  callbacks: PresenceConnectionCallbacks,
): () => void {
  const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
    config: {
      private: true,
      presence: { key: input.userId },
    },
  })
  let closed = false

  const syncPresence = () => {
    if (closed) return
    const state = channel.presenceState<PresenceMetadata>()
    callbacks.onPresenceChange(readPresenceState(state))
  }

  channel
    .on('presence', { event: 'sync' }, syncPresence)
    .subscribe((subscriptionStatus) => {
      if (closed) return

      if (subscriptionStatus === 'SUBSCRIBED') {
        void channel
          .track({
            userId: input.userId,
            username: input.username,
            status: input.status ?? 'online',
            onlineAt: new Date().toISOString(),
          } satisfies PresenceMetadata)
          .then((trackStatus) => {
            if (!closed) callbacks.onConnectionChange(trackStatus === 'ok')
          })
          .catch(() => {
            if (!closed) callbacks.onConnectionChange(false)
          })
        return
      }

      if (
        subscriptionStatus === 'CHANNEL_ERROR' ||
        subscriptionStatus === 'TIMED_OUT' ||
        subscriptionStatus === 'CLOSED'
      ) {
        callbacks.onConnectionChange(false)
      }
    })

  return () => {
    if (closed) return
    closed = true
    callbacks.onConnectionChange(false)
    callbacks.onPresenceChange([])

    void channel
      .untrack()
      .catch(() => undefined)
      .finally(() => {
        void supabase.removeChannel(channel)
      })
  }
}
