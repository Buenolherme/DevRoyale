import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { MatchmakingRealtimeEvent } from '@/types'

export function subscribeToMatchmaking(
  userId: string,
  onEvent: (event: MatchmakingRealtimeEvent) => void,
  onStatus?: (status: string) => void,
): RealtimeChannel {
  const channel = supabase.channel(`matchmaking:${userId}`, { config: { private: true } })

  const forwardEvent = ({ payload }: { payload: unknown }) => {
      onEvent(payload as MatchmakingRealtimeEvent)
  }

  channel
    .on('broadcast', { event: 'match_found' }, forwardEvent)
    .on('broadcast', { event: 'queue_changed' }, forwardEvent)
    .on('broadcast', { event: 'queue_cancelled' }, forwardEvent)
    .subscribe((status) => onStatus?.(status))

  return channel
}

export async function unsubscribeFromMatchmaking(channel: RealtimeChannel | null) {
  if (!channel) return
  await supabase.removeChannel(channel)
}
