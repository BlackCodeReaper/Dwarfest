<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BeerThrowPanel from './components/BeerThrowPanel.vue'
import CheckpointPanel from './components/CheckpointPanel.vue'
import GameFinishedScreen from './components/GameFinishedScreen.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import PlayerSheet from './components/PlayerSheet.vue'
import ScoreboardPanel from './components/ScoreboardPanel.vue'
import SetupScreen from './components/SetupScreen.vue'
import {
  BARREL_MAX,
  DANCER_MAX,
  TABLE_MAX,
  MINI_GAME_INTERVAL_MS,
  MINI_GAME_STEP,
  MINI_GAME_TARGET_END,
  MINI_GAME_TARGET_START,
  phases,
  type GameMode,
} from './types'
import { createDefaultConfig, totalNuggetValue, useGameState } from './useGameState'
import { locale, setLocale, t } from './i18n'
import { finalScore } from './services/gameUtils'
import { isSupabaseConfigured } from './services/supabase'

const {
  session,
  template,
  loadWarnings,
  toast,
  syncStatus,
  multiplayerRole: activeMultiplayerRole,
  pendingSyncCount,
  startGame,
  restoreSnapshot,
  advanceStep,
  saveTemplate,
  quickStartFromTemplate,
  exportGame,
  resetSession,
  leaveMultiplayerGame,
  retryParticipantSync,
  purchaseAsset,
  sellAsset,
  generateServiceCards,
  rejectServiceCard,
} = useGameState()

const setupConfig = reactive(createDefaultConfig())
const setupNames = ref<string[]>(Array.from({ length: setupConfig.playerCount }, (_, index) => `Player ${index + 1}`))
const setupError = ref('')
const multiplayerSetupRole = ref<'host' | 'join'>('host')
const roomCodeDraft = ref('')
const miniGameMeter = ref(0)
const miniGameActive = ref(false)
const miniGameResult = ref('')
const isRetryingSync = ref(false)
const installPromptEvent = ref<Event | null>(null)
const supabaseConfigured = isSupabaseConfigured()

const syncStatusClass = computed(() => {
  const s = syncStatus.value.state
  if (s === 'connected' || s === 'syncing') return 'sync--ok'
  if (s === 'offline') return 'sync--warn'
  if (s === 'error') return 'sync--error'
  return ''
})

let miniGameDirection = 1
let miniGameTimer: number | undefined

watch(
  () => setupConfig.playerCount,
  (count) => {
    const names = [...setupNames.value]

    while (names.length < count) {
      names.push(`Player ${names.length + 1}`)
    }

    setupNames.value = names.slice(0, count)
  },
  { immediate: true },
)

const currentPlayer = computed(() => session.value.players[session.value.currentPlayerIndex] ?? null)
const phaseIndex = computed(() => phases.indexOf(session.value.currentPhase))
const brawlThreshold = computed(() => session.value.config.epicVariant ? 5 : 6)
const lastSnapshot = computed(() => session.value.history.at(-1) ?? null)
const scoreBoard = computed(() => {
  return [...session.value.players].sort(
    (left, right) => finalScore(right, session.value.config.cardMode) - finalScore(left, session.value.config.cardMode),
  )
})
const miniGameTargetStyle = computed(() => ({
  left: `${MINI_GAME_TARGET_START}%`,
  width: `${MINI_GAME_TARGET_END - MINI_GAME_TARGET_START}%`,
}))
const nextActionLabel = computed(() => {
  const isLastPlayer = session.value.currentPlayerIndex === session.value.players.length - 1
  const isLastPhase = phaseIndex.value === phases.length - 1
  const isLastRound = session.value.currentRound === session.value.config.rounds

  if (isLastPlayer && isLastPhase && isLastRound) {
    return t('action.finishGame')
  }

  if (isLastPlayer && isLastPhase) {
    return t('action.startRound', { round: session.value.currentRound + 1 })
  }

  if (isLastPlayer) {
    return t('action.advancePhase', { phase: labelForPhase(phases[phaseIndex.value + 1]) })
  }

  return t('action.passTo', { name: session.value.players[session.value.currentPlayerIndex + 1]?.name ?? 'next player' })
})
const multiplayerStatusLine = computed(() => {
  if (session.value.config.mode !== 'multiplayer') {
    return ''
  }

  const stateLabel = syncStatus.value.state.charAt(0).toUpperCase() + syncStatus.value.state.slice(1)
  const queueSuffix = pendingSyncCount.value > 0 ? ` · queued ${pendingSyncCount.value}` : ''
  const roleLabel = activeMultiplayerRole.value === 'participant' ? t('role.participant') : t('role.host')

  if (syncStatus.value.detail) {
    return `${roleLabel} · ${stateLabel} - ${syncStatus.value.detail}${queueSuffix}`
  }

  return `${roleLabel} · ${stateLabel}${queueSuffix}`
})
const isParticipantView = computed(() => {
  return session.value.config.mode === 'multiplayer' && activeMultiplayerRole.value === 'participant'
})
const canRetryParticipantSync = computed(() => {
  if (!isParticipantView.value) {
    return false
  }

  return syncStatus.value.state === 'error' || syncStatus.value.state === 'offline'
})
const exitGameLabel = computed(() => {
  if (session.value.config.mode === 'multiplayer') {
    return activeMultiplayerRole.value === 'participant' ? t('status.leaveRoom') : t('status.exitRoom')
  }

  return t('status.exitGame')
})

function labelForPhase(phase: string) {
  return t(`phase.${phase}`)
}

function setAppLocale(nextLocale: 'en' | 'it') {
  setLocale(nextLocale)
}

function setMode(mode: GameMode) {
  setupConfig.mode = mode

  if (mode === 'pass-around') {
    multiplayerSetupRole.value = 'host'
    roomCodeDraft.value = ''
  }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function normalizePlayerName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, 24)
}

function validatedSetupNames() {
  const trimmed = setupNames.value
    .slice(0, setupConfig.playerCount)
    .map((name) => normalizePlayerName(name))

  const hasDuplicates = trimmed.some((name, index) => {
    if (!name) {
      return false
    }

    return trimmed.indexOf(name) !== index
  })

  if (hasDuplicates) {
    return { names: trimmed, error: t('msg.playerUnique') }
  }

  const withFallbacks = trimmed.map((name, index) => name || `Player ${index + 1}`)
  return { names: withFallbacks, error: '' }
}

function applyTemplateToSetup() {
  if (!template.value) {
    return
  }

  Object.assign(setupConfig, template.value.config)
  setupNames.value = [...template.value.playerNames]
}

function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function setMultiplayerRole(role: 'host' | 'join') {
  multiplayerSetupRole.value = role
}

function setRoomCodeDraft(value: string) {
  roomCodeDraft.value = normalizeRoomCode(value)
}

function startFromDraft() {
  const { names, error } = validatedSetupNames()
  setupError.value = error

  if (error) {
    return
  }

  if (setupConfig.mode === 'multiplayer' && multiplayerSetupRole.value === 'join') {
    if (!roomCodeDraft.value) {
      setupError.value = t('msg.enterRoomCode')
      return
    }
  }

  setupNames.value = [...names]
  startGame(
    { ...setupConfig },
    names,
    setupConfig.mode === 'multiplayer'
      ? {
          role: multiplayerSetupRole.value === 'join' ? 'participant' : 'host',
          roomCode: multiplayerSetupRole.value === 'join' ? roomCodeDraft.value : undefined,
        }
      : undefined,
  )
  stopMiniGame()
}

function saveDraftTemplate() {
  saveTemplate({ ...setupConfig }, setupNames.value)
}

function restoreLastCheckpoint() {
  if (!lastSnapshot.value) {
    return
  }

  if (!window.confirm(t('msg.restoreCheckpoint'))) {
    return
  }

  restoreSnapshot(lastSnapshot.value.id)
}

function confirmResetSession() {
  if (!window.confirm(t('msg.newGameConfirm'))) {
    return
  }

  resetSession()
}

function confirmExitGame() {
  if (session.value.config.mode === 'multiplayer') {
    const message =
      activeMultiplayerRole.value === 'participant'
        ? t('msg.leaveRoomConfirm')
        : t('msg.exitRoomConfirm')

    if (!window.confirm(message)) {
      return
    }

    leaveMultiplayerGame()
    return
  }

  if (!window.confirm(t('msg.exitGameConfirm'))) {
    return
  }

  resetSession()
}

function startMiniGame() {
  if (isParticipantView.value) {
    return
  }

  stopMiniGame()
  miniGameActive.value = true
  miniGameResult.value = t('throw.defaultHint')
  miniGameMeter.value = 0
  miniGameDirection = 1
  miniGameTimer = window.setInterval(() => {
    const nextValue = miniGameMeter.value + MINI_GAME_STEP * miniGameDirection

    if (nextValue >= 100) {
      miniGameMeter.value = 100
      miniGameDirection = -1
      return
    }

    if (nextValue <= 0) {
      miniGameMeter.value = 0
      miniGameDirection = 1
      return
    }

    miniGameMeter.value = nextValue
  }, MINI_GAME_INTERVAL_MS)
}

function stopMiniGame() {
  if (miniGameTimer !== undefined) {
    window.clearInterval(miniGameTimer)
    miniGameTimer = undefined
  }
  miniGameActive.value = false
}

function resolveMiniGame() {
  if (isParticipantView.value) {
    return
  }

  const success = miniGameMeter.value >= MINI_GAME_TARGET_START && miniGameMeter.value <= MINI_GAME_TARGET_END

  if (currentPlayer.value) {
    currentPlayer.value.pendingCounterThrows = Math.max(0, currentPlayer.value.pendingCounterThrows - 1)
    if (success) {
      currentPlayer.value.successfulThrows += 1
      if (currentPlayer.value.servedGuests < currentPlayer.value.acceptedGuests) {
        currentPlayer.value.servedGuests += 1
        currentPlayer.value.fame += 1
      }
      miniGameResult.value = t('msg.beerServed')
    } else {
      currentPlayer.value.failedThrows += 1
      currentPlayer.value.brawl += 2
      miniGameResult.value = t('msg.beerSpilled')
    }
  }

  stopMiniGame()
}

function recordPhysicalThrow(success: boolean) {
  if (isParticipantView.value) {
    return
  }

  if (!currentPlayer.value) {
    return
  }

  currentPlayer.value.pendingCounterThrows = Math.max(0, currentPlayer.value.pendingCounterThrows - 1)

  if (success) {
    currentPlayer.value.successfulThrows += 1
    if (currentPlayer.value.servedGuests < currentPlayer.value.acceptedGuests) {
      currentPlayer.value.servedGuests += 1
      currentPlayer.value.fame += 1
    }
  } else {
    currentPlayer.value.failedThrows += 1
    currentPlayer.value.brawl += 2
  }
}

function generateCurrentPlayerServiceCards() {
  if (!currentPlayer.value || isParticipantView.value) {
    return
  }

  const didGenerate = generateServiceCards(currentPlayer.value.id)
  miniGameResult.value = didGenerate ? t('cards.generated') : t('cards.generateFailed')
}

function rejectCurrentPlayerServiceCard(cardId: string) {
  if (!currentPlayer.value || isParticipantView.value) {
    return
  }

  const didReject = rejectServiceCard(currentPlayer.value.id, cardId)
  miniGameResult.value = didReject ? t('cards.rejectedWithRiot') : t('cards.rejectFailed')
}

function purchaseCurrentPlayerAsset(asset: 'table' | 'barrel' | 'dancer') {
  if (!currentPlayer.value || isParticipantView.value) {
    return
  }

  const purchased = purchaseAsset(currentPlayer.value.id, asset)
  miniGameResult.value = purchased
    ? t('msg.purchaseOk', { asset: t(`asset.${asset}`) })
    : t('msg.purchaseFail', { asset: t(`asset.${asset}`) })
}

function sellCurrentPlayerAsset(asset: 'table' | 'barrel' | 'dancer') {
  if (!currentPlayer.value || isParticipantView.value) {
    return
  }

  const sold = sellAsset(currentPlayer.value.id, asset)
  miniGameResult.value = sold
    ? t('msg.sellOk', { asset: t(`asset.${asset}`) })
    : t('msg.sellFail', { asset: t(`asset.${asset}`) })
}

async function promptInstall() {
  const prompt = installPromptEvent.value as (Event & { prompt: () => Promise<void> }) | null

  if (!prompt) {
    return
  }

  installPromptEvent.value = null
  await prompt.prompt()
}


async function retrySyncFromStatus() {
  if (isRetryingSync.value) {
    return
  }

  isRetryingSync.value = true

  try {
    await retryParticipantSync()
  } finally {
    isRetryingSync.value = false
  }
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installPromptEvent.value = e
  })
})

onBeforeUnmount(() => {
  stopMiniGame()
})

watch(
  () => [
    setupConfig.playerCount,
    setupConfig.rounds,
    setupConfig.startingCopper,
    setupConfig.startingSilver,
    setupConfig.startingGold,
    setupConfig.startingFame,
    setupConfig.startingBrawl,
    setupConfig.chartScaleMax,
  ],
  () => {
    setupConfig.playerCount = clamp(setupConfig.playerCount, 2, 6)
    setupConfig.rounds = clamp(setupConfig.rounds, 1, 10)
    setupConfig.startingCopper = clamp(setupConfig.startingCopper, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingSilver = clamp(setupConfig.startingSilver, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingGold = clamp(setupConfig.startingGold, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingFame = clamp(setupConfig.startingFame, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingBrawl = clamp(setupConfig.startingBrawl, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.chartScaleMax = clamp(setupConfig.chartScaleMax, 1, Number.MAX_SAFE_INTEGER)
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <header class="masthead">
      <div>
        <p class="eyebrow">{{ t('app.title') }}</p>
        <h1>{{ t('app.hero') }}</h1>
        <p class="lede">{{ t('app.lede') }}</p>
      </div>

      <div class="masthead__badges">
        <span class="badge">{{ t('app.badge.offline') }}</span>
        <button v-if="installPromptEvent" class="badge badge--install" type="button" @click="promptInstall">{{ t('app.badge.install') }}</button>
        <span class="badge badge--accent">{{ session.config.mode === 'multiplayer' ? t('app.mode.multiplayer') : t('app.mode.passAround') }}</span>
      </div>

      <div v-if="loadWarnings.length" class="warning-list">
        <p v-for="(warning, index) in loadWarnings" :key="index" class="hint hint--error">{{ warning }}</p>
      </div>

      <div v-if="session.config.mode === 'multiplayer' && !supabaseConfigured" class="warning-list">
        <p class="hint hint--error">{{ t('app.warning.supabase') }}</p>
      </div>
    </header>

    <GameFinishedScreen
      v-if="session.status === 'finished'"
      :session="session"
      @export="exportGame"
      @new-game="resetSession"
    />

    <main v-else-if="session.status === 'setup'" class="layout layout--setup">
      <SetupScreen
        :setup-config="setupConfig"
        :setup-names="setupNames"
        :setup-error="setupError"
        :has-template="Boolean(template)"
        :locale="locale"
        :multiplayer-role="multiplayerSetupRole"
        :room-code-draft="roomCodeDraft"
        @set-mode="setMode"
        @set-locale="setAppLocale"
        @set-multiplayer-role="setMultiplayerRole"
        @set-room-code-draft="setRoomCodeDraft"
        @apply-template="applyTemplateToSetup"
        @quick-start="quickStartFromTemplate"
        @save-template="saveDraftTemplate"
        @start-game="startFromDraft"
      />
    </main>

    <main v-else-if="session.status === 'active'" class="layout layout--play">
      <section class="panel status-grid">
        <article>
          <p class="eyebrow">{{ t('status.mode') }}</p>
          <strong>{{ session.config.mode === 'multiplayer' ? t('status.multiplayerPrototype') : t('app.mode.passAround') }}</strong>
          <p class="hint" v-if="session.config.mode === 'multiplayer'">Room {{ session.roomCode }}</p>
          <p class="hint" :class="syncStatusClass" v-if="multiplayerStatusLine">{{ multiplayerStatusLine }}</p>
          <button v-if="canRetryParticipantSync" class="button button--ghost" type="button" :disabled="isRetryingSync" @click="retrySyncFromStatus">
            {{ isRetryingSync ? t('status.retrying') : t('status.retrySync') }}
          </button>
          <button class="button button--ghost" type="button" @click="confirmExitGame">{{ exitGameLabel }}</button>
        </article>
        <article>
          <p class="eyebrow">{{ t('status.round') }}</p>
          <strong>{{ session.currentRound }} / {{ session.config.rounds }}</strong>
        </article>
        <article>
          <p class="eyebrow">{{ t('status.phase') }}</p>
          <strong>{{ labelForPhase(session.currentPhase) }}</strong>
        </article>
        <article>
          <p class="eyebrow">{{ t('status.currentPlayer') }}</p>
          <strong>{{ currentPlayer?.name }}</strong>
        </article>
      </section>

      <section class="phase-strip panel" aria-label="Phase progress">
        <span
          v-for="(phase, index) in phases"
          :key="phase"
          class="phase-pill"
          :class="{
            'phase-pill--active': phase === session.currentPhase,
            'phase-pill--done': index < phaseIndex,
          }"
        >
          {{ labelForPhase(phase) }}
        </span>
      </section>

      <section class="play-grid" v-if="currentPlayer">
        <PlayerSheet
          :player="currentPlayer"
          :total-nuggets="totalNuggetValue(currentPlayer)"
          :brawl-threshold="brawlThreshold"
          :read-only="isParticipantView"
          :table-max="TABLE_MAX"
          :barrel-max="BARREL_MAX"
          :dancer-max="DANCER_MAX"
          :chart-scale-max="session.config.chartScaleMax"
          :card-mode="session.config.cardMode"
          @purchase-asset="purchaseCurrentPlayerAsset"
          @sell-asset="sellCurrentPlayerAsset"
          @generate-service-cards="generateCurrentPlayerServiceCards"
          @reject-service-card="rejectCurrentPlayerServiceCard"
        />

        <aside class="stack">
          <BeerThrowPanel
            :beer-mode="session.config.beerMode"
            :pending-throws="currentPlayer.pendingCounterThrows"
            :mini-game-meter="miniGameMeter"
            :mini-game-active="miniGameActive"
            :mini-game-result="miniGameResult"
            :mini-game-target-style="miniGameTargetStyle"
            :disabled="isParticipantView"
            @physical-throw="recordPhysicalThrow"
            @start-mini-game="startMiniGame"
            @resolve-mini-game="resolveMiniGame"
          />

          <CheckpointPanel
            :next-action-label="nextActionLabel"
            :has-last-snapshot="Boolean(lastSnapshot)"
            :disabled="isParticipantView"
            @advance="advanceStep"
            @restore-last="restoreLastCheckpoint"
            @export-game="exportGame"
            @reset-session="confirmResetSession"
          />
        </aside>
      </section>

      <section class="play-grid play-grid--secondary">
        <ScoreboardPanel :players="scoreBoard" :chart-scale-max="session.config.chartScaleMax" :card-mode="session.config.cardMode" />
        <HistoryPanel :history="session.history" :can-restore="!isParticipantView" @restore="restoreSnapshot" />
      </section>
    </main>
  </div>

  <Transition name="toast">
    <div v-if="toast" class="toast" role="status" aria-live="polite">{{ toast }}</div>
  </Transition>
</template>
