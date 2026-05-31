<script setup lang="ts">
import { computed } from 'vue'
import { type GameSession } from '../types'
import { totalNuggetValue } from '../services/gameUtils'

const props = defineProps<{
  session: GameSession
}>()

const emit = defineEmits<{
  export: []
  newGame: []
}>()

const ranked = computed(() => {
  return [...props.session.players]
    .map((player) => ({ player, nuggets: totalNuggetValue(player) }))
    .sort((a, b) => b.nuggets - a.nuggets)
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
      <p class="eyebrow">Game over</p>
      <h2 class="winner-name">{{ winner?.player.name }} wins!</h2>
      <p class="winner-nuggets">{{ winner?.nuggets }} nuggets</p>
      <p class="hint">{{ session.config.rounds }} rounds · {{ session.players.length }} players · {{ durationMinutes }} min</p>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Final standings</p>
          <h2>Scoreboard</h2>
        </div>
      </div>
      <ol class="scoreboard finished-scoreboard">
        <li v-for="({ player, nuggets }, index) in ranked" :key="player.id">
          <span class="rank-medal">{{ medals[index] ?? index + 1 }}</span>
          <span class="rank-name">{{ player.name }}</span>
          <span class="rank-detail">
            {{ nuggets }} nuggets
            <span class="hint rank-breakdown">
              {{ player.copper }}c · {{ player.silver }}s · {{ player.gold }}g
            </span>
          </span>
        </li>
      </ol>
    </section>

    <section class="panel panel--footer">
      <p class="hint">Export a full game log or start a new session.</p>
      <div class="action-row">
        <button class="button button--secondary" type="button" @click="emit('export')">Export game log</button>
        <button class="button" type="button" @click="emit('newGame')">New game</button>
      </div>
    </section>
  </main>
</template>
