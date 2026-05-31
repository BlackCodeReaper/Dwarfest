<script setup lang="ts">
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
        <p class="eyebrow">Beer Throw Assistant</p>
        <h2>{{ beerMode === 'mini-game' ? 'Mini-game' : 'Physical throws' }}</h2>
      </div>
      <span class="badge">Pending {{ pendingThrows }}</span>
    </div>

    <template v-if="beerMode === 'physical'">
      <div class="action-row">
        <button class="button" @click="emit('physicalThrow', true)" :disabled="disabled">Mark success</button>
        <button class="button button--secondary" @click="emit('physicalThrow', false)" :disabled="disabled">Mark spill</button>
      </div>
      <p class="hint">Spills add +2 brawl automatically. Fame is still manual because free beers and served dwarves score differently.</p>
    </template>

    <template v-else>
      <div class="mini-game">
        <div class="meter">
          <div class="meter__target" :style="miniGameTargetStyle"></div>
          <div class="meter__gem" :style="{ left: `${miniGameMeter}%` }"></div>
        </div>
        <div class="action-row">
          <button v-if="!miniGameActive" class="button" @click="emit('startMiniGame')" :disabled="disabled">Start throw</button>
          <button v-else class="button" @click="emit('resolveMiniGame')" :disabled="disabled">Stop</button>
        </div>
        <p class="hint">{{ miniGameResult || 'Hit the center lane to count as a clean serve.' }}</p>
      </div>
    </template>
  </article>
</template>
