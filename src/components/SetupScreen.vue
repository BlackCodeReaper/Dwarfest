<script setup lang="ts">
import { type GameConfig, type GameMode } from '../types'

defineProps<{
  setupConfig: GameConfig
  setupNames: string[]
  setupError: string
  hasTemplate: boolean
  multiplayerRole: 'host' | 'join'
  roomCodeDraft: string
}>()

const emit = defineEmits<{
  setMode: [mode: GameMode]
  setMultiplayerRole: [role: 'host' | 'join']
  setRoomCodeDraft: [value: string]
  applyTemplate: []
  quickStart: []
  saveTemplate: []
  startGame: []
}>()
</script>

<template>
  <main class="layout layout--setup">
    <section class="panel panel--hero">
      <div class="hero-copy">
        <p class="eyebrow">Game Mode</p>
        <div class="mode-grid">
          <button class="mode-card" :class="{ 'mode-card--active': setupConfig.mode === 'pass-around' }" @click="emit('setMode', 'pass-around')">
            <strong>Pass Around</strong>
            <span>One phone on the table, fully offline.</span>
          </button>
          <button class="mode-card" :class="{ 'mode-card--active': setupConfig.mode === 'multiplayer' }" @click="emit('setMode', 'multiplayer')">
            <strong>Multiplayer</strong>
            <span>Own-phone mode with room code scaffolding ready for realtime sync.</span>
          </button>
        </div>
      </div>

      <div class="panel panel--nested quick-actions">
        <button class="button button--secondary" @click="emit('applyTemplate')" :disabled="!hasTemplate">Use saved template</button>
        <button class="button button--secondary" @click="emit('quickStart')" :disabled="!hasTemplate">Quick start last game</button>
        <button class="button button--secondary" @click="emit('saveTemplate')">Save this setup</button>
        <p class="hint">Templates store players, rounds, initial nugget values, and the throw mode.</p>
      </div>
    </section>

    <section class="panel config-grid">
      <div>
        <p class="eyebrow">Match Setup</p>
        <div class="field-grid">
          <label>
            <span>Players</span>
            <input v-model.number="setupConfig.playerCount" type="number" min="2" max="6" />
          </label>
          <label>
            <span>Rounds</span>
            <input v-model.number="setupConfig.rounds" type="number" min="1" max="10" />
          </label>
          <label>
            <span>Starting copper</span>
            <input v-model.number="setupConfig.startingCopper" type="number" min="0" />
          </label>
          <label>
            <span>Starting silver</span>
            <input v-model.number="setupConfig.startingSilver" type="number" min="0" />
          </label>
          <label>
            <span>Starting gold</span>
            <input v-model.number="setupConfig.startingGold" type="number" min="0" />
          </label>
          <label>
            <span>Starting fame</span>
            <input v-model.number="setupConfig.startingFame" type="number" min="0" />
          </label>
          <label>
            <span>Starting brawl</span>
            <input v-model.number="setupConfig.startingBrawl" type="number" min="0" />
          </label>
          <label>
            <span>Beer throws</span>
            <select v-model="setupConfig.beerMode">
              <option value="physical">Physical</option>
              <option value="mini-game">Mini-game</option>
            </select>
          </label>
        </div>

        <label class="toggle">
          <input v-model="setupConfig.epicVariant" type="checkbox" />
          <span>Epic variant: brawls trigger at 5 instead of 6.</span>
        </label>
      </div>

      <div>
        <p class="eyebrow">Players</p>
        <p v-if="setupError" class="hint hint--error">{{ setupError }}</p>

        <div v-if="setupConfig.mode === 'multiplayer'" class="multiplayer-setup">
          <p class="eyebrow">Multiplayer Session</p>
          <div class="mode-grid">
            <button
              class="mode-card"
              :class="{ 'mode-card--active': multiplayerRole === 'host' }"
              type="button"
              @click="emit('setMultiplayerRole', 'host')"
            >
              <strong>Host room</strong>
              <span>Create a fresh room code for everyone else to join.</span>
            </button>
            <button
              class="mode-card"
              :class="{ 'mode-card--active': multiplayerRole === 'join' }"
              type="button"
              @click="emit('setMultiplayerRole', 'join')"
            >
              <strong>Join room</strong>
              <span>Use an existing room code from the host.</span>
            </button>
          </div>

          <label v-if="multiplayerRole === 'join'">
            <span>Room code</span>
            <input
              :value="roomCodeDraft"
              type="text"
              maxlength="24"
              placeholder="DWF-AB12"
              @input="emit('setRoomCodeDraft', ($event.target as HTMLInputElement).value)"
            />
          </label>
        </div>

        <div class="player-list">
          <label v-for="(_, index) in setupNames" :key="index">
            <span>Seat {{ index + 1 }}</span>
            <input v-model="setupNames[index]" type="text" maxlength="24" />
          </label>
        </div>
      </div>
    </section>

    <section class="panel panel--footer">
      <div>
        <p class="eyebrow">What this build already does</p>
        <p class="hint">Saves locally, restores in-progress games, tracks player state, supports export, and stores checkpoints after each handoff.</p>
      </div>
      <button class="button" @click="emit('startGame')">Start game</button>
    </section>
  </main>
</template>
