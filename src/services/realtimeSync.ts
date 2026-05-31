import type { RealtimeChannel } from '@supabase/supabase-js'
import type { GameSession, MultiplayerRole, MultiplayerSyncState } from '../types'
import { getSupabaseClient } from './supabase'

interface RealtimeSyncOptions {
  roomCode: string
  role: MultiplayerRole
  onRemoteSession: (session: GameSession) => void
  onStatus: (status: MultiplayerSyncState) => void
}

export interface RealtimeSyncHandle {
  publish: (session: GameSession) => Promise<boolean>
  pullLatest: () => Promise<GameSession | null>
  stop: () => Promise<void>
}

function createClientId() {
  return `client-${Math.random().toString(36).slice(2, 10)}`
}

function nextStatus(state: MultiplayerSyncState['state'], detail = ''): MultiplayerSyncState {
  return { state, detail }
}

async function upsertParticipant(roomCode: string, clientId: string, role: MultiplayerRole) {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return
  }

  await supabase.from('participants').upsert(
    {
      room_code: roomCode,
      client_id: clientId,
      role,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'room_code,client_id' },
  )
}

async function logAction(roomCode: string, clientId: string, actionType: string, payload: unknown) {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return
  }

  await supabase.from('game_actions').insert({
    room_code: roomCode,
    client_id: clientId,
    action_type: actionType,
    payload,
    created_at: new Date().toISOString(),
  })
}

async function fetchRoomState(roomCode: string) {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.from('games').select('state_json').eq('room_code', roomCode).maybeSingle()

  if (error) {
    return null
  }

  return (data?.state_json as GameSession | undefined) ?? null
}

export function createRealtimeSync(options: RealtimeSyncOptions): RealtimeSyncHandle {
  const supabase = getSupabaseClient()
  const clientId = createClientId()
  let channel: RealtimeChannel | null = null

  if (!supabase) {
    options.onStatus(nextStatus('unconfigured', 'Set Supabase env vars to enable live sync.'))
    return {
      publish: async () => false,
      pullLatest: async () => null,
      stop: async () => {},
    }
  }

  options.onStatus(nextStatus('connecting', 'Connecting to realtime channel...'))
  void upsertParticipant(options.roomCode, clientId, options.role)

  channel = supabase
    .channel(`dwarfest:${options.roomCode}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'games',
      },
      (payload) => {
        const incoming = payload.new as { room_code?: string; state_json?: GameSession; source_client?: string } | undefined

        if (
          !incoming ||
          incoming.room_code !== options.roomCode ||
          incoming.source_client === clientId ||
          !incoming.state_json
        ) {
          return
        }

        options.onRemoteSession(incoming.state_json)
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
      },
      (payload) => {
        const incoming = payload.new as { room_code?: string; state_json?: GameSession; source_client?: string } | undefined

        if (
          !incoming ||
          incoming.room_code !== options.roomCode ||
          incoming.source_client === clientId ||
          !incoming.state_json
        ) {
          return
        }

        options.onRemoteSession(incoming.state_json)
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        options.onStatus(nextStatus('connected', 'Realtime sync active.'))

        if (options.role === 'participant') {
          void fetchRoomState(options.roomCode).then((session) => {
            if (session) {
              options.onRemoteSession(session)
            }
          })
        }

        return
      }

      if (status === 'CHANNEL_ERROR') {
        options.onStatus(nextStatus('error', 'Realtime channel error. Check Supabase table/policies.'))
        return
      }

      if (status === 'TIMED_OUT' || status === 'CLOSED') {
        options.onStatus(nextStatus('offline', 'Realtime disconnected. Waiting to reconnect.'))
      }
    })

  return {
    publish: async (session) => {
      if (options.role !== 'host') {
        return true
      }

      const { error } = await supabase.from('games').upsert(
        {
          room_code: options.roomCode,
          state_json: session,
          source_client: clientId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_code' },
      )

      if (error) {
        options.onStatus(nextStatus('error', `Sync write failed: ${error.message}`))
        return false
      }

      void upsertParticipant(options.roomCode, clientId, options.role)
      void logAction(options.roomCode, clientId, 'state_update', {
        currentRound: session.currentRound,
        currentPhase: session.currentPhase,
        currentPlayerIndex: session.currentPlayerIndex,
        status: session.status,
      })

      options.onStatus(nextStatus('syncing', 'Synced latest host update.'))
      return true
    },
    pullLatest: async () => {
      return fetchRoomState(options.roomCode)
    },
    stop: async () => {
      if (channel) {
        await supabase.removeChannel(channel)
      }

      await supabase.from('participants').delete().eq('room_code', options.roomCode).eq('client_id', clientId)
      void logAction(options.roomCode, clientId, 'disconnect', { role: options.role })
      options.onStatus(nextStatus('idle'))
    },
  }
}
