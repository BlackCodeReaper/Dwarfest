<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import BeerThrowPanel from './components/BeerThrowPanel.vue'
import CheckpointPanel from './components/CheckpointPanel.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import PlayerSheet from './components/PlayerSheet.vue'
import ScoreboardPanel from './components/ScoreboardPanel.vue'
import SetupScreen from './components/SetupScreen.vue'
import {
  MINI_GAME_INTERVAL_MS,
  MINI_GAME_STEP,
  MINI_GAME_TARGET_END,
  MINI_GAME_TARGET_START,
  phases,
  type GameMode,
} from './types'
import { createDefaultConfig, totalNuggetValue, useGameState } from './useGameState'

const {
  session,
  template,
  loadWarnings,
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
} = useGameState()

const setupConfig = reactive(createDefaultConfig())
const setupNames = ref<string[]>(Array.from({ length: setupConfig.playerCount }, (_, index) => `Player ${index + 1}`))
const setupError = ref('')
const multiplayerSetupRole = ref<'host' | 'join'>('host')
const roomCodeDraft = ref('')
const miniGameMeter = ref(0)
const miniGameActive = ref(false)
const miniGameResult = ref('')

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
const lastSnapshot = computed(() => session.value.history.at(-1) ?? null)
const scoreBoard = computed(() => {
  return [...session.value.players].sort((left, right) => totalNuggetValue(right) - totalNuggetValue(left))
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
    return 'Finish game'
  }

  if (isLastPlayer && isLastPhase) {
    return `Start round ${session.value.currentRound + 1}`
  }

  if (isLastPlayer) {
    return `Advance to ${labelForPhase(phases[phaseIndex.value + 1])}`
  }

  return `Pass to ${session.value.players[session.value.currentPlayerIndex + 1]?.name ?? 'next player'}`
})
const multiplayerStatusLine = computed(() => {
  if (session.value.config.mode !== 'multiplayer') {
    return ''
  }

  const stateLabel = syncStatus.value.state.charAt(0).toUpperCase() + syncStatus.value.state.slice(1)
  const queueSuffix = pendingSyncCount.value > 0 ? ` · queued ${pendingSyncCount.value}` : ''
  const roleLabel = activeMultiplayerRole.value === 'participant' ? 'Participant' : 'Host'

  if (syncStatus.value.detail) {
    return `${roleLabel} · ${stateLabel} - ${syncStatus.value.detail}${queueSuffix}`
  }

  return `${roleLabel} · ${stateLabel}${queueSuffix}`
})
const isParticipantView = computed(() => {
  return session.value.config.mode === 'multiplayer' && activeMultiplayerRole.value === 'participant'
})

function labelForPhase(phase: string) {
  return phase.charAt(0).toUpperCase() + phase.slice(1)
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
    return { names: trimmed, error: 'Player names must be unique.' }
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
      setupError.value = 'Enter a room code to join a multiplayer game.'
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

  restoreSnapshot(lastSnapshot.value.id)
}

function startMiniGame() {
  if (isParticipantView.value) {
    return
  }

  stopMiniGame()
  miniGameActive.value = true
  miniGameResult.value = 'Tap stop when the gem enters the bright lane.'
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
      miniGameResult.value = 'Served cleanly. Adjust fame manually if this throw seated a dwarf.'
    } else {
      currentPlayer.value.failedThrows += 1
      currentPlayer.value.brawl += 2
      miniGameResult.value = 'Beer spilled. The app added +2 brawl for the wasted beer.'
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
  } else {
    currentPlayer.value.failedThrows += 1
    currentPlayer.value.brawl += 2
  }
}

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
  ],
  () => {
    setupConfig.playerCount = clamp(setupConfig.playerCount, 2, 6)
    setupConfig.rounds = clamp(setupConfig.rounds, 1, 10)
    setupConfig.startingCopper = clamp(setupConfig.startingCopper, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingSilver = clamp(setupConfig.startingSilver, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingGold = clamp(setupConfig.startingGold, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingFame = clamp(setupConfig.startingFame, 0, Number.MAX_SAFE_INTEGER)
    setupConfig.startingBrawl = clamp(setupConfig.startingBrawl, 0, Number.MAX_SAFE_INTEGER)
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-shell">
    <header class="masthead">
      <div>
        <p class="eyebrow">Dwarfest Companion</p>
        <h1>Track the tavern, not the arithmetic.</h1>
        <p class="lede">
          This first implementation covers setup, local saves, turn flow, checkpoints, export, and the beer-throw toggle.
        </p>
      </div>

      <div class="masthead__badges">
        <span class="badge">Safari-ready</span>
        <span class="badge">Installable next</span>
        <span class="badge badge--accent">{{ session.config.mode === 'multiplayer' ? 'Multiplayer groundwork' : 'Pass-around ready' }}</span>
      </div>

      <div v-if="loadWarnings.length" class="warning-list">
        <p v-for="(warning, index) in loadWarnings" :key="index" class="hint hint--error">{{ warning }}</p>
      </div>
    </header>

    <main v-if="session.status === 'setup'" class="layout layout--setup">
      <SetupScreen
        :setup-config="setupConfig"
        :setup-names="setupNames"
        :setup-error="setupError"
        :has-template="Boolean(template)"
        :multiplayer-role="multiplayerSetupRole"
        :room-code-draft="roomCodeDraft"
        @set-mode="setMode"
        @set-multiplayer-role="setMultiplayerRole"
        @set-room-code-draft="setRoomCodeDraft"
        @apply-template="applyTemplateToSetup"
        @quick-start="quickStartFromTemplate"
        @save-template="saveDraftTemplate"
        @start-game="startFromDraft"
      />
    </main>

    <main v-else class="layout layout--play">
      <section class="panel status-grid">
        <article>
          <p class="eyebrow">Mode</p>
          <strong>{{ session.config.mode === 'multiplayer' ? 'Multiplayer prototype' : 'Pass-around' }}</strong>
          <p class="hint" v-if="session.config.mode === 'multiplayer'">Room {{ session.roomCode }}</p>
          <p class="hint" v-if="multiplayerStatusLine">{{ multiplayerStatusLine }}</p>
        </article>
        <article>
          <p class="eyebrow">Round</p>
          <strong>{{ session.currentRound }} / {{ session.config.rounds }}</strong>
        </article>
        <article>
          <p class="eyebrow">Phase</p>
          <strong>{{ labelForPhase(session.currentPhase) }}</strong>
        </article>
        <article>
          <p class="eyebrow">Current player</p>
          <strong>{{ currentPlayer?.name }}</strong>
        </article>
      </section>

      <section class="phase-strip panel">
        <button
          v-for="phase in phases"
          :key="phase"
          class="phase-pill"
          :class="{ 'phase-pill--active': phase === session.currentPhase }"
          type="button"
        >
          {{ labelForPhase(phase) }}
        </button>
      </section>

      <section class="play-grid" v-if="currentPlayer">
        <PlayerSheet :player="currentPlayer" :total-nuggets="totalNuggetValue(currentPlayer)" :read-only="isParticipantView" />

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
            @reset-session="resetSession"
          />
        </aside>
      </section>

      <section class="play-grid play-grid--secondary">
        <ScoreboardPanel :players="scoreBoard" />
        <HistoryPanel :history="session.history" :can-restore="!isParticipantView" @restore="restoreSnapshot" />
      </section>
    </main>
  </div>
</template>
