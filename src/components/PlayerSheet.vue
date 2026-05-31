<script setup lang="ts">
import { computed } from 'vue'
import { type PlayerState } from '../types'

const props = defineProps<{
  player: PlayerState
  totalNuggets: number
  brawlThreshold?: number
  readOnly?: boolean
}>()

const brawlAtLimit = computed(() => {
  const threshold = props.brawlThreshold ?? 6
  return props.player.brawl >= threshold
})
</script>

<template>
  <article class="panel player-panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">Player Sheet</p>
        <h2>{{ player.name }}</h2>
      </div>
      <div class="totals">
        <span class="badge badge--accent">{{ totalNuggets }} total nuggets</span>
      </div>
    </div>

    <div class="field-grid field-grid--compact">
      <label>
        <span>Copper</span>
        <input v-model.number="player.copper" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Silver</span>
        <input v-model.number="player.silver" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Gold</span>
        <input v-model.number="player.gold" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Fame</span>
        <input v-model.number="player.fame" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span :class="{ 'brawl-alert': brawlAtLimit }">Brawl{{ brawlAtLimit ? ' ⚠ trigger!' : '' }}</span>
        <input v-model.number="player.brawl" type="number" min="0" :disabled="readOnly" :class="{ 'input--alert': brawlAtLimit }" />
      </label>
      <label>
        <span>Tables</span>
        <input v-model.number="player.tables" type="number" min="0" max="10" :disabled="readOnly" />
      </label>
      <label>
        <span>Barrels</span>
        <input v-model.number="player.barrels" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Dancers</span>
        <input v-model.number="player.dancers" type="number" min="0" max="3" :disabled="readOnly" />
      </label>
      <label>
        <span>Accepted guests</span>
        <input v-model.number="player.acceptedGuests" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Served guests</span>
        <input v-model.number="player.servedGuests" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Counter throws pending</span>
        <input v-model.number="player.pendingCounterThrows" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Successful throws</span>
        <input v-model.number="player.successfulThrows" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>Failed throws</span>
        <input v-model.number="player.failedThrows" type="number" min="0" :disabled="readOnly" />
      </label>
    </div>

    <label class="notes-field">
      <span>Card effects and notes</span>
      <textarea v-model="player.notes" rows="5" placeholder="Example: +2 fame from dancer, -1 brawl from event card" :disabled="readOnly"></textarea>
    </label>
  </article>
</template>
