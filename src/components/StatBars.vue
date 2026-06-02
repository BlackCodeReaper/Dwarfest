<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../i18n'

const props = withDefaults(
  defineProps<{
    fame: number
    brawl: number
    max: number
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const normalizedMax = computed(() => Math.max(1, Math.trunc(props.max)))
const famePercent = computed(() => Math.min(100, (Math.max(0, props.fame) / normalizedMax.value) * 100))
const brawlPercent = computed(() => Math.min(100, (Math.max(0, props.brawl) / normalizedMax.value) * 100))
</script>

<template>
  <div class="stat-bars" :class="{ 'stat-bars--compact': compact }">
    <div class="stat-row">
      <span>{{ t('player.stat.fame') }}</span>
      <strong>{{ fame }}</strong>
    </div>
    <div class="stat-track">
      <div class="stat-fill stat-fill--fame" :style="{ width: `${famePercent}%` }"></div>
    </div>

    <div class="stat-row">
      <span>{{ t('player.stat.brawl') }}</span>
      <strong>{{ brawl }}</strong>
    </div>
    <div class="stat-track">
      <div class="stat-fill stat-fill--brawl" :style="{ width: `${brawlPercent}%` }"></div>
    </div>
  </div>
</template>
