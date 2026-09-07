import { supabase } from '@/lib/supabase'
import type { MultiplayerBattleRealtimeEvent } from '@/types'

interface MatchPresenceMetadata {
  userId: string
  connectedAt: string
  [key: string]: unknown
}

export interface MultiplayerBattleRealtimeCallbacks {
  onEvent: (event: MultiplayerBattleRealtimeEvent) => void
  onPresenceChange: (connectedUserIds: Set<string>) => void
  onConnectionChange: (connected: boolean) => void
}

const EVENTS: MultiplayerBattleRealtimeEvent['type'][] = [
  'match_started',
  'round_started',
  'player_submitted',
  'submission_finished',
  'round_finished',
  'score_changed',
  'match_finished',
  'player_connection',
  'match_cancelled',
]

export function subscribeToMultiplayerBattle(
  matchId: string,
  userId: string,
  callbacks: MultiplayerBattleRealtimeCallbacks,
) {
  const channel = supabase.channel(`match:${matchId}`, {
    config: { private: true, presence: { key: userId } },
  })

  EVENTS.forEach((eventName) => {
    channel.on('broadcast', { event: eventName }, ({ payload }) => {
      callbacks.onEvent(payload as MultiplayerBattleRealtimeEvent)
    })
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<MatchPresenceMetadata>()
      callbacks.onPresenceChange(new Set(
        Object.values(state)
          .flat()
          .map((presence) => presence.userId)
          .filter((id): id is string => typeof id === 'string'),
      ))
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        callbacks.onConnectionChange(true)
        void channel.track({ userId, connectedAt: new Date().toISOString() })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        callbacks.onConnectionChange(false)
      }
    })

  return () => {
    callbacks.onConnectionChange(false)
    void channel.untrack().finally(() => {
      void supabase.removeChannel(channel)
    })
  }
}
