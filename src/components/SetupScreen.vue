<script setup lang="ts">
import { type GameConfig, type GameMode } from '../types'
import { type Locale, t } from '../i18n'

defineProps<{
  setupConfig: GameConfig
  setupNames: string[]
  setupError: string
  hasTemplate: boolean
  multiplayerRole: 'host' | 'join'
  roomCodeDraft: string
  locale: Locale
}>()

const emit = defineEmits<{
  setMode: [mode: GameMode]
  setLocale: [locale: Locale]
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
        <p class="eyebrow">{{ t('setup.gameMode') }}</p>
        <label>
          <span>{{ t('setup.language') }}</span>
          <select :value="locale" @change="emit('setLocale', ($event.target as HTMLSelectElement).value as Locale)">
            <option value="en">{{ t('setup.language.en') }}</option>
            <option value="it">{{ t('setup.language.it') }}</option>
          </select>
        </label>
        <div class="mode-grid">
          <button class="mode-card" :class="{ 'mode-card--active': setupConfig.mode === 'pass-around' }" @click="emit('setMode', 'pass-around')">
            <strong>{{ t('setup.passAround.title') }}</strong>
            <span>{{ t('setup.passAround.desc') }}</span>
          </button>
          <button class="mode-card" :class="{ 'mode-card--active': setupConfig.mode === 'multiplayer' }" @click="emit('setMode', 'multiplayer')">
            <strong>{{ t('setup.multiplayer.title') }}</strong>
            <span>{{ t('setup.multiplayer.desc') }}</span>
          </button>
        </div>
      </div>

      <div class="panel panel--nested quick-actions">
        <button class="button button--secondary" @click="emit('applyTemplate')" :disabled="!hasTemplate">{{ t('setup.template.use') }}</button>
        <button class="button button--secondary" @click="emit('quickStart')" :disabled="!hasTemplate">{{ t('setup.template.quick') }}</button>
        <button class="button button--secondary" @click="emit('saveTemplate')">{{ t('setup.template.save') }}</button>
        <p class="hint">{{ t('setup.template.hint') }}</p>
      </div>
    </section>

    <section class="panel config-grid">
      <div>
        <p class="eyebrow">{{ t('setup.match') }}</p>
        <div class="field-grid">
          <label>
            <span>{{ t('setup.players') }}</span>
            <input v-model.number="setupConfig.playerCount" type="number" min="2" max="6" />
          </label>
          <label>
            <span>{{ t('setup.rounds') }}</span>
            <input v-model.number="setupConfig.rounds" type="number" min="1" max="10" />
          </label>
          <label>
            <span>{{ t('setup.startingCopper') }}</span>
            <input v-model.number="setupConfig.startingCopper" type="number" min="0" />
          </label>
          <label>
            <span>{{ t('setup.startingSilver') }}</span>
            <input v-model.number="setupConfig.startingSilver" type="number" min="0" />
          </label>
          <label>
            <span>{{ t('setup.startingGold') }}</span>
            <input v-model.number="setupConfig.startingGold" type="number" min="0" />
          </label>
          <label>
            <span>{{ t('setup.startingFame') }}</span>
            <input v-model.number="setupConfig.startingFame" type="number" min="0" />
          </label>
          <label>
            <span>{{ t('setup.startingBrawl') }}</span>
            <input v-model.number="setupConfig.startingBrawl" type="number" min="0" />
          </label>
          <label>
            <span>{{ t('setup.chartScaleMax') }}</span>
            <input v-model.number="setupConfig.chartScaleMax" type="number" min="1" />
          </label>
          <label>
            <span>{{ t('setup.cardMode') }}</span>
            <select v-model="setupConfig.cardMode">
              <option value="physical">{{ t('setup.cardMode.physical') }}</option>
              <option value="in-app-generated">{{ t('setup.cardMode.generated') }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('setup.beerThrows') }}</span>
            <select v-model="setupConfig.beerMode">
              <option value="physical">{{ t('setup.beerMode.physical') }}</option>
              <option value="mini-game">{{ t('setup.beerMode.minigame') }}</option>
            </select>
          </label>
        </div>

        <label class="toggle">
          <input v-model="setupConfig.epicVariant" type="checkbox" />
          <span>{{ t('setup.epic') }}</span>
        </label>
      </div>

      <div>
        <p class="eyebrow">{{ t('setup.players') }}</p>
        <p v-if="setupError" class="hint hint--error">{{ setupError }}</p>

        <div v-if="setupConfig.mode === 'multiplayer'" class="multiplayer-setup">
          <p class="eyebrow">{{ t('setup.multiplayerSession') }}</p>
          <div class="mode-grid">
            <button
              class="mode-card"
              :class="{ 'mode-card--active': multiplayerRole === 'host' }"
              type="button"
              @click="emit('setMultiplayerRole', 'host')"
            >
              <strong>{{ t('setup.host') }}</strong>
              <span>{{ t('setup.host.desc') }}</span>
            </button>
            <button
              class="mode-card"
              :class="{ 'mode-card--active': multiplayerRole === 'join' }"
              type="button"
              @click="emit('setMultiplayerRole', 'join')"
            >
              <strong>{{ t('setup.join') }}</strong>
              <span>{{ t('setup.join.desc') }}</span>
            </button>
          </div>

          <label v-if="multiplayerRole === 'join'">
            <span>{{ t('setup.roomCode') }}</span>
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
            <span>{{ t('setup.seat', { index: index + 1 }) }}</span>
            <input v-model="setupNames[index]" type="text" maxlength="24" />
          </label>
        </div>
      </div>
    </section>

    <section class="panel panel--footer">
      <div>
        <p class="eyebrow">{{ t('setup.whatBuildDoes') }}</p>
        <p class="hint">{{ t('setup.whatBuildDoesHint') }}</p>
      </div>
      <button class="button" @click="emit('startGame')">{{ t('setup.startGame') }}</button>
    </section>
  </main>
</template>
