<script setup lang="ts">
import { type PlayerState } from '../types'
import { finalScore, totalCardPayout } from '../services/gameUtils'
import StatBars from './StatBars.vue'
import { t } from '../i18n'

const props = defineProps<{
  players: PlayerState[]
  chartScaleMax: number
  cardMode: 'physical' | 'in-app-generated'
}>()
</script>

<template>
  <article class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">{{ t('scoreboard.title') }}</p>
        <h2>{{ t('scoreboard.current') }}</h2>
      </div>
    </div>
    <ol class="scoreboard">
      <li v-for="player in players" :key="player.id">
        <div>
          <span>{{ player.name }}</span>
          <p v-if="cardMode === 'in-app-generated'" class="hint">{{ t('scoreboard.cardBonus', { value: totalCardPayout(player) }) }}</p>
        </div>
        <div class="rank-detail">
          <strong>{{ t('scoreboard.score', { value: finalScore(player, props.cardMode) }) }}</strong>
          <StatBars :fame="player.fame" :brawl="player.brawl" :max="chartScaleMax" compact />
        </div>
      </li>
    </ol>
  </article>
</template>
