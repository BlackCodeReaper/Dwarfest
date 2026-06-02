<script setup lang="ts">
import { computed } from 'vue'
import { type GameSession } from '../types'
import { finalScore, totalCardPayout, totalNuggetValue } from '../services/gameUtils'
import StatBars from './StatBars.vue'
import { t } from '../i18n'

const props = defineProps<{
  session: GameSession
}>()

const emit = defineEmits<{
  export: []
  newGame: []
}>()

const ranked = computed(() => {
  return [...props.session.players]
    .map((player) => ({
      player,
      nuggets: totalNuggetValue(player),
      score: finalScore(player, props.session.config.cardMode),
      cardBonus: totalCardPayout(player),
    }))
    .sort((a, b) => b.score - a.score)
})

const winner = computed(() => ranked.value[0] ?? null)

const durationMinutes = computed(() => {
  const start = new Date(props.session.createdAt).getTime()
  const end = new Date(props.session.updatedAt).getTime()
  return Math.max(1, Math.round((end - start) / 60_000))
})

const medals = ['🥇', '🥈', '🥉']
</script>

<template>
  <main class="layout layout--finished">
    <section class="panel panel--winner">
      <p class="eyebrow">{{ t('finished.gameOver') }}</p>
      <h2 class="winner-name">{{ t('finished.wins', { name: winner?.player.name ?? '' }) }}</h2>
      <p class="winner-nuggets">{{ t('scoreboard.score', { value: winner?.score ?? 0 }) }}</p>
      <p class="hint">{{ t('finished.summary', { rounds: session.config.rounds, players: session.players.length, minutes: durationMinutes }) }}</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">{{ t('finished.standings') }}</p>
          <h2>{{ t('scoreboard.title') }}</h2>
        </div>
      </div>
      <ol class="scoreboard finished-scoreboard">
        <li v-for="({ player, nuggets, score, cardBonus }, index) in ranked" :key="player.id">
          <span class="rank-medal">{{ medals[index] ?? index + 1 }}</span>
          <span class="rank-name">{{ player.name }}</span>
          <span class="rank-detail">
            {{ t('scoreboard.score', { value: score }) }}
            <span class="hint rank-breakdown">
              {{ t('scoreboard.nuggets', { value: nuggets }) }} · {{ player.copper }}c · {{ player.silver }}s · {{ player.gold }}g
            </span>
            <span v-if="session.config.cardMode === 'in-app-generated'" class="hint rank-breakdown">{{ t('scoreboard.cardBonus', { value: cardBonus }) }}</span>
            <StatBars :fame="player.fame" :brawl="player.brawl" :max="session.config.chartScaleMax" compact />
          </span>
        </li>
      </ol>
    </section>

    <section class="panel panel--footer">
      <p class="hint">{{ t('finished.exportHint') }}</p>
      <div class="action-row">
        <button class="button button--secondary" type="button" @click="emit('export')">{{ t('finished.export') }}</button>
        <button class="button" type="button" @click="emit('newGame')">{{ t('finished.newGame') }}</button>
      </div>
    </section>
  </main>
</template>
