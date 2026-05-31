export const phases = ['supplies', 'opening', 'service', 'brawl', 'collection'] as const

export const PLAYER_COUNT_MIN = 2
export const PLAYER_COUNT_MAX = 6
export const ROUNDS_MIN = 1
export const ROUNDS_MAX = 10

export const MINI_GAME_TARGET_START = 43
export const MINI_GAME_TARGET_END = 57
export const MINI_GAME_STEP = 4
export const MINI_GAME_INTERVAL_MS = 45

export type PhaseKey = (typeof phases)[number]
export type GameMode = 'pass-around' | 'multiplayer'
export type BeerMode = 'physical' | 'mini-game'
export type SessionStatus = 'setup' | 'active' | 'finished'
export type SyncState = 'idle' | 'connecting' | 'connected' | 'syncing' | 'offline' | 'unconfigured' | 'error'
export type MultiplayerRole = 'host' | 'participant'

export interface MultiplayerSyncState {
  state: SyncState
  detail: string
}

export interface GameConfig {
  mode: GameMode
  rounds: number
  beerMode: BeerMode
  epicVariant: boolean
  playerCount: number
  startingCopper: number
  startingSilver: number
  startingGold: number
  startingFame: number
  startingBrawl: number
}

export interface PlayerState {
  id: string
  name: string
  copper: number
  silver: number
  gold: number
  fame: number
  brawl: number
  tables: number
  barrels: number
  dancers: number
  acceptedGuests: number
  servedGuests: number
  pendingCounterThrows: number
  successfulThrows: number
  failedThrows: number
  notes: string
}

export interface SessionData {
  config: GameConfig
  players: PlayerState[]
  currentRound: number
  currentPhase: PhaseKey
  currentPlayerIndex: number
  roomCode: string
}

export interface SessionSnapshot {
  id: string
  label: string
  takenAt: string
  payload: SessionData
}

export interface GameSession extends SessionData {
  id: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
  history: SessionSnapshot[]
}

export interface SavedTemplate {
  config: GameConfig
  playerNames: string[]
}