<script setup lang="ts">
import { t } from '../i18n'

defineProps<{
  beerMode: 'physical' | 'mini-game'
  pendingThrows: number
  miniGameMeter: number
  miniGameActive: boolean
  miniGameResult: string
  miniGameTargetStyle: { left: string; width: string }
  disabled?: boolean
}>()

const emit = defineEmits<{
  physicalThrow: [success: boolean]
  startMiniGame: []
  resolveMiniGame: []
}>()
</script>

<template>
  <article class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">{{ t('throw.assistant') }}</p>
        <h2>{{ beerMode === 'mini-game' ? t('throw.minigame') : t('throw.physical') }}</h2>
      </div>
      <span class="badge">{{ t('throw.pending', { value: pendingThrows }) }}</span>
    </div>

    <template v-if="beerMode === 'physical'">
      <div class="action-row">
        <button class="button" @click="emit('physicalThrow', true)" :disabled="disabled">{{ t('throw.success') }}</button>
        <button class="button button--secondary" @click="emit('physicalThrow', false)" :disabled="disabled">{{ t('throw.spill') }}</button>
      </div>
      <p class="hint">{{ t('throw.spillHint') }}</p>
    </template>

    <template v-else>
      <div class="mini-game">
        <div class="meter">
          <div class="meter__target" :style="miniGameTargetStyle"></div>
          <div class="meter__gem" :style="{ left: `${miniGameMeter}%` }"></div>
        </div>
        <div class="action-row">
          <button v-if="!miniGameActive" class="button" @click="emit('startMiniGame')" :disabled="disabled">{{ t('throw.start') }}</button>
          <button v-else class="button" @click="emit('resolveMiniGame')" :disabled="disabled">{{ t('throw.stop') }}</button>
        </div>
        <p class="hint">{{ miniGameResult || t('throw.defaultHint') }}</p>
      </div>
    </template>
  </article>
</template>
