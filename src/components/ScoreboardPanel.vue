<script setup lang="ts">
import { type PlayerState } from '../types'

defineProps<{
  players: PlayerState[]
}>()

function totalNuggetValue(player: PlayerState) {
  return player.copper + player.silver * 4 + player.gold * 10
}
</script>

<template>
  <article class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">Scoreboard</p>
        <h2>Current standings</h2>
      </div>
    </div>
    <ol class="scoreboard">
      <li v-for="player in players" :key="player.id">
        <span>{{ player.name }}</span>
        <strong>{{ totalNuggetValue(player) }} nuggets</strong>
      </li>
    </ol>
  </article>
</template>
