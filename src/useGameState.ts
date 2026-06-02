import { ref, watch } from 'vue'
import { phases, type GameConfig, type GameMode, type GameSession, type MultiplayerRole, type MultiplayerSyncState, type PlayerState, type SavedTemplate, type SessionData, type SessionSnapshot } from './types'
import { advanceTurnPointer } from './services/gameFlow'
import { totalNuggetValue, applyAssetPurchase, applyAssetSale, acceptedGuestsFromCards, applyCardRejection, generateDwarfServiceCards } from './services/gameUtils'
import { createRealtimeSync, type RealtimeSyncHandle } from './services/realtimeSync'
import { t } from './i18n'

export { totalNuggetValue }

const SESSION_STORAGE_KEY = 'dwarfest.session.v1'
const TEMPLATE_STORAGE_KEY = 'dwarfest.template.v1'
const ROLE_STORAGE_KEY = 'dwarfest.role.v1'
const MAX_HISTORY = 10
const MAX_PENDING_SYNC = 20
const PARTICIPANT_PULL_RETRY_ATTEMPTS = 3
const PARTICIPANT_PULL_RETRY_DELAY_MS = 1200
const loadWarnings = ref<string[]>([])
const toast = ref<string>('')
let toastTimer: ReturnType<typeof window.setTimeout> | null = null
const syncStatus = ref<MultiplayerSyncState>({ state: 'idle', detail: '' })
const multiplayerRole = ref<MultiplayerRole>('host')
const pendingSyncCount = ref(0)
const isOnline = ref(window.navigator.onLine)
let realtimeSync: RealtimeSyncHandle | null = null
let applyingRemoteUpdate = false
let skipNextPublish = false
const pendingSyncQueue: GameSession[] = []

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createDefaultConfig(mode: GameMode = 'pass-around'): GameConfig {
  return {
    mode,
    rounds: 5,
    beerMode: 'physical',
    cardMode: 'physical',
    epicVariant: false,
    playerCount: 4,
    chartScaleMax: 20,
    startingCopper: 10,
    startingSilver: 0,
    startingGold: 0,
    startingFame: 1,
    startingBrawl: 1,
  }
}

function normalizeConfig(config: Partial<GameConfig>): GameConfig {
  const base = createDefaultConfig(config.mode === 'multiplayer' ? 'multiplayer' : 'pass-around')

  return {
    ...base,
    ...config,
    cardMode: config.cardMode === 'in-app-generated' ? 'in-app-generated' : 'physical',
    chartScaleMax: Number.isFinite(config.chartScaleMax) ? Math.max(1, Math.trunc(config.chartScaleMax as number)) : base.chartScaleMax,
  }
}

function normalizePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    cardPayout: Number.isFinite(player.cardPayout) ? Math.max(0, Math.trunc(player.cardPayout)) : 0,
    cards: Array.isArray(player.cards) ? player.cards : [],
    dwarfCards: Array.isArray(player.dwarfCards) ? player.dwarfCards : [],
  }
}

function createRoomCode(mode: GameMode) {
  if (mode === 'pass-around') {
    return 'LOCAL'
  }

  return `DWF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function createPlayer(name: string, config: GameConfig): PlayerState {
  return {
    id: createId('player'),
    name,
    copper: config.startingCopper,
    silver: config.startingSilver,
    gold: config.startingGold,
    fame: config.startingFame,
    brawl: config.startingBrawl,
    tables: 2,
    barrels: 2,
    dancers: 0,
    acceptedGuests: 0,
    servedGuests: 0,
    pendingCounterThrows: 0,
    successfulThrows: 0,
    failedThrows: 0,
    notes: '',
    cardPayout: 0,
    cards: [],
    dwarfCards: [],
  }
}

function createSetupSession(): GameSession {
  const config = createDefaultConfig()

  return {
    id: createId('session'),
    status: 'setup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config,
    players: [],
    currentRound: 1,
    currentPhase: phases[0],
    currentPlayerIndex: 0,
    roomCode: createRoomCode(config.mode),
    history: [],
  }
}

function resetPlayersForRound(players: PlayerState[]) {
  players.forEach((player) => {
    player.acceptedGuests = 0
    player.servedGuests = 0
    player.pendingCounterThrows = 0
    player.successfulThrows = 0
    player.failedThrows = 0
  })
}

function loadSession() {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!raw) {
    return createSetupSession()
  }

  try {
    const parsed = JSON.parse(raw) as GameSession
    return {
      ...parsed,
      config: normalizeConfig(parsed.config),
      players: Array.isArray(parsed.players) ? parsed.players.map((player) => normalizePlayer(player as PlayerState)) : [],
    }
  } catch {
    loadWarnings.value = [...loadWarnings.value, t('warning.sessionCorrupted')]
    return createSetupSession()
  }
}

function loadTemplate() {
  const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as SavedTemplate
    return {
      ...parsed,
      config: normalizeConfig(parsed.config),
    }
  } catch {
    loadWarnings.value = [...loadWarnings.value, t('warning.templateCorrupted')]
    window.localStorage.removeItem(TEMPLATE_STORAGE_KEY)
    return null
  }
}

function loadRole(): MultiplayerRole {
  const raw = window.localStorage.getItem(ROLE_STORAGE_KEY)

  if (raw === 'host' || raw === 'participant') {
    return raw
  }

  return 'host'
}

const session = ref<GameSession>(loadSession())
const template = ref<SavedTemplate | null>(loadTemplate())
multiplayerRole.value = loadRole()

watch(
  session,
  (value) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

watch(template, (value) => {
  if (value) {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(value))
    return
  }

  window.localStorage.removeItem(TEMPLATE_STORAGE_KEY)
})

watch(multiplayerRole, (value) => {
  window.localStorage.setItem(ROLE_STORAGE_KEY, value)
})

window.addEventListener('online', () => {
  isOnline.value = true
})

window.addEventListener('offline', () => {
  isOnline.value = false

  if (session.value.config.mode === 'multiplayer' && session.value.status === 'active') {
    syncStatus.value = { state: 'offline', detail: 'Connection lost. Local changes are queued.' }
  }
})

function enqueuePendingSync(nextSession: GameSession) {
  pendingSyncQueue.push(cloneData(nextSession))

  while (pendingSyncQueue.length > MAX_PENDING_SYNC) {
    pendingSyncQueue.shift()
  }

  pendingSyncCount.value = pendingSyncQueue.length
}

function applyRemoteSession(remoteSession: GameSession) {
  applyingRemoteUpdate = true
  skipNextPublish = true
  const cloned = cloneData(remoteSession)
  session.value = {
    ...cloned,
    config: normalizeConfig(cloned.config),
    players: cloned.players.map((player) => normalizePlayer(player)),
  }
  applyingRemoteUpdate = false
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function pullLatestParticipantSession(maxAttempts = PARTICIPANT_PULL_RETRY_ATTEMPTS) {
  if (!realtimeSync || multiplayerRole.value !== 'participant') {
    return null
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const latest = await realtimeSync.pullLatest()

    if (latest) {
      return latest
    }

    if (attempt < maxAttempts) {
      syncStatus.value = {
        state: 'connecting',
        detail: `Waiting for host state (${attempt}/${maxAttempts - 1})...`,
      }
      await delay(PARTICIPANT_PULL_RETRY_DELAY_MS * attempt)
    }
  }

  return null
}

async function flushPendingSyncQueue() {
  if (!realtimeSync || !isOnline.value || multiplayerRole.value !== 'host') {
    return
  }

  while (pendingSyncQueue.length > 0) {
    const snapshot = pendingSyncQueue[0]
    const didPublish = await realtimeSync.publish(snapshot)

    if (!didPublish) {
      pendingSyncCount.value = pendingSyncQueue.length
      return
    }

    pendingSyncQueue.shift()
  }

  pendingSyncCount.value = 0
}

async function publishOrQueue(nextSession: GameSession) {
  if (!realtimeSync || multiplayerRole.value !== 'host') {
    return
  }

  if (!isOnline.value) {
    enqueuePendingSync(nextSession)
    syncStatus.value = { state: 'offline', detail: 'Connection lost. Local changes are queued.' }
    return
  }

  const didPublish = await realtimeSync.publish(nextSession)

  if (!didPublish) {
    enqueuePendingSync(nextSession)
    return
  }

  await flushPendingSyncQueue()
}

watch(
  () => [session.value.id, session.value.status, session.value.config.mode, session.value.roomCode],
  async ([, status, mode, roomCode]) => {
    if (realtimeSync) {
      const current = realtimeSync
      realtimeSync = null
      await current.stop()
    }

    if (mode !== 'multiplayer' || status !== 'active') {
      syncStatus.value = { state: 'idle', detail: '' }
      return
    }

    realtimeSync = createRealtimeSync({
      roomCode,
      role: multiplayerRole.value,
      onStatus: (nextStatus) => {
        syncStatus.value = nextStatus

        if (nextStatus.state === 'connected') {
          void flushPendingSyncQueue()
        }
      },
      onRemoteSession: (remoteSession) => {
        applyRemoteSession(remoteSession)
      },
    })

    if (multiplayerRole.value === 'participant') {
      const latest = await pullLatestParticipantSession()

      if (latest) {
        applyRemoteSession(latest)
        syncStatus.value = { state: 'connected', detail: 'Room synced from host state.' }
      } else {
        syncStatus.value = {
          state: 'error',
          detail: `Room ${roomCode} not found yet. Ask host to start and sync first, then retry sync.`,
        }
      }
    }
  },
  { immediate: true },
)

watch([multiplayerRole, isOnline], () => {
  if (session.value.config.mode !== 'multiplayer' || session.value.status !== 'active') {
    return
  }

  if (!isOnline.value) {
    syncStatus.value = { state: 'offline', detail: 'Connection lost. Local changes are queued.' }
    return
  }

  if (realtimeSync && multiplayerRole.value === 'host') {
    void flushPendingSyncQueue()
  }
})

watch(
  session,
  (value) => {
    if (!realtimeSync || applyingRemoteUpdate) {
      return
    }

    if (skipNextPublish) {
      skipNextPublish = false
      return
    }

    if (value.config.mode !== 'multiplayer' || value.status !== 'active') {
      return
    }

    void publishOrQueue(cloneData(value))
  },
  { deep: true },
)

function purchaseAsset(playerId: string, asset: import('./types').PurchasableAsset) {
  if (!canMutateGameplay()) return false
  const player = session.value.players.find((p) => p.id === playerId)
  if (!player) return false

  const delta = applyAssetPurchase(player, asset)
  if (!delta) return false

  Object.assign(player, delta)
  session.value.updatedAt = new Date().toISOString()
  return true
}

function sellAsset(playerId: string, asset: import('./types').PurchasableAsset) {
  if (!canMutateGameplay()) return false
  const player = session.value.players.find((p) => p.id === playerId)
  if (!player) return false

  const delta = applyAssetSale(player, asset)
  if (!delta) return false

  Object.assign(player, delta)
  session.value.updatedAt = new Date().toISOString()
  return true
}

function generateServiceCards(playerId: string) {
  if (!canMutateGameplay()) return false
  const player = session.value.players.find((p) => p.id === playerId)
  if (!player) return false

  const cards = generateDwarfServiceCards(player.fame)
  const acceptedGuests = acceptedGuestsFromCards(cards)

  player.dwarfCards = cards
  player.acceptedGuests = acceptedGuests
  player.servedGuests = 0
  player.pendingCounterThrows = acceptedGuests
  session.value.updatedAt = new Date().toISOString()
  return true
}

function rejectServiceCard(playerId: string, cardId: string) {
  if (!canMutateGameplay()) return false
  const player = session.value.players.find((p) => p.id === playerId)
  if (!player) return false

  const nextCards = applyCardRejection(player.dwarfCards, cardId)
  if (!nextCards) return false

  player.dwarfCards = nextCards
  player.fame = Math.max(0, player.fame - 1)
  player.brawl += 1
  const acceptedGuests = acceptedGuestsFromCards(nextCards)
  player.acceptedGuests = acceptedGuests
  player.servedGuests = Math.min(player.servedGuests, acceptedGuests)
  player.pendingCounterThrows = Math.max(0, acceptedGuests - player.servedGuests)
  session.value.updatedAt = new Date().toISOString()
  return true
}

function createSnapshot(label: string): SessionSnapshot {
  const payload: SessionData = {
    config: cloneData(session.value.config),
    players: cloneData(session.value.players),
    currentRound: session.value.currentRound,
    currentPhase: session.value.currentPhase,
    currentPlayerIndex: session.value.currentPlayerIndex,
    roomCode: session.value.roomCode,
  }

  return {
    id: createId('snapshot'),
    label,
    takenAt: new Date().toISOString(),
    payload,
  }
}

function pushSnapshot(label: string) {
  session.value.history = [...session.value.history, createSnapshot(label)].slice(-MAX_HISTORY)
  session.value.updatedAt = new Date().toISOString()
}

function canMutateGameplay() {
  if (session.value.config.mode !== 'multiplayer') {
    return true
  }

  return multiplayerRole.value === 'host'
}

function startGame(config: GameConfig, playerNames: string[], options?: { roomCode?: string; role?: MultiplayerRole }) {
  const normalizedConfig = normalizeConfig(config)
  const filteredNames = playerNames
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, normalizedConfig.playerCount)

  while (filteredNames.length < normalizedConfig.playerCount) {
    filteredNames.push(`Player ${filteredNames.length + 1}`)
  }

  if (normalizedConfig.mode === 'multiplayer') {
    multiplayerRole.value = options?.role ?? 'host'
  } else {
    multiplayerRole.value = 'host'
  }

  session.value = {
    id: createId('session'),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: normalizedConfig,
    players: filteredNames.map((name) => createPlayer(name, normalizedConfig)),
    currentRound: 1,
    currentPhase: phases[0],
    currentPlayerIndex: 0,
    roomCode:
      normalizedConfig.mode === 'multiplayer' && options?.roomCode
        ? normalizeRoomCode(options.roomCode)
        : createRoomCode(normalizedConfig.mode),
    history: [],
  }

  pushSnapshot('Game started')
}

function restoreSnapshot(snapshotId: string) {
  if (!canMutateGameplay()) {
    return
  }

  const snapshotIndex = session.value.history.findIndex((entry) => entry.id === snapshotId)
  if (snapshotIndex === -1) {
    return
  }

  const snapshot = session.value.history[snapshotIndex]

  session.value = {
    ...session.value,
    ...cloneData(snapshot.payload),
    history: session.value.history.slice(0, snapshotIndex + 1),
    updatedAt: new Date().toISOString(),
  }
}

function advanceStep() {
  if (!canMutateGameplay()) {
    return
  }

  const currentPlayer = session.value.players[session.value.currentPlayerIndex]
  const phaseLabel = session.value.currentPhase.charAt(0).toUpperCase() + session.value.currentPhase.slice(1)

  pushSnapshot(`Round ${session.value.currentRound} · ${phaseLabel} · ${currentPlayer?.name ?? 'Player'}`)

  const nextTurn = advanceTurnPointer({
    currentRound: session.value.currentRound,
    currentPhase: session.value.currentPhase,
    currentPlayerIndex: session.value.currentPlayerIndex,
    rounds: session.value.config.rounds,
    playerCount: session.value.players.length,
  })

  if (nextTurn.isGameFinished) {
    session.value.status = 'finished'
    session.value.updatedAt = new Date().toISOString()
    return
  }

  session.value.currentRound = nextTurn.currentRound
  session.value.currentPhase = nextTurn.currentPhase
  session.value.currentPlayerIndex = nextTurn.currentPlayerIndex

  if (nextTurn.shouldResetRoundStats) {
    resetPlayersForRound(session.value.players)
  }

  session.value.updatedAt = new Date().toISOString()
}

function showToast(message: string, durationMs = 2800) {
  if (toastTimer !== null) {
    window.clearTimeout(toastTimer)
  }

  toast.value = message
  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = null
  }, durationMs)
}

function saveTemplate(config: GameConfig, playerNames: string[]) {
  const normalizedConfig = normalizeConfig(config)
  template.value = {
    config: normalizedConfig,
    playerNames: playerNames.slice(0, normalizedConfig.playerCount),
  }

  showToast(t('toast.templateSaved'))
}

function quickStartFromTemplate() {
  if (!template.value) {
    return
  }

  startGame(cloneData(template.value.config), cloneData(template.value.playerNames))
}

function exportGame() {
  const payload = {
    exportedAt: new Date().toISOString(),
    session: session.value,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dwarfest-${session.value.id}.json`
  link.click()
  window.URL.revokeObjectURL(url)
  showToast(t('toast.exported'))
}

function leaveMultiplayerGame() {
  if (session.value.config.mode !== 'multiplayer') {
    return
  }

  if (realtimeSync) {
    const current = realtimeSync
    realtimeSync = null
    void current.stop()
  }

  pendingSyncQueue.length = 0
  pendingSyncCount.value = 0
  syncStatus.value = { state: 'idle', detail: '' }
  multiplayerRole.value = 'host'
  session.value = createSetupSession()
  showToast(t('toast.leftRoom'))
}

function resetSession() {
  if (session.value.config.mode === 'multiplayer' && multiplayerRole.value === 'participant') {
    leaveMultiplayerGame()
    return
  }

  if (!canMutateGameplay()) {
    return
  }

  session.value = createSetupSession()
}

async function retryParticipantSync() {
  if (session.value.config.mode !== 'multiplayer' || session.value.status !== 'active') {
    return false
  }

  if (multiplayerRole.value !== 'participant' || !realtimeSync) {
    return false
  }

  syncStatus.value = { state: 'connecting', detail: 'Retrying room sync...' }
  const latest = await pullLatestParticipantSession()

  if (!latest) {
    syncStatus.value = {
      state: 'error',
      detail: `Room ${session.value.roomCode} not found yet. Ask host to sync first, then retry.`,
    }
    return false
  }

  applyRemoteSession(latest)
  syncStatus.value = { state: 'connected', detail: 'Room synced from host state.' }
  return true
}

export function useGameState() {
  return {
    session,
    template,
    loadWarnings,
    toast,
    syncStatus,
    multiplayerRole,
    pendingSyncCount,
    startGame,
    purchaseAsset,
    restoreSnapshot,
    advanceStep,
    saveTemplate,
    quickStartFromTemplate,
    exportGame,
    resetSession,
    leaveMultiplayerGame,
    retryParticipantSync,
    sellAsset,
    generateServiceCards,
    rejectServiceCard,
  }
}