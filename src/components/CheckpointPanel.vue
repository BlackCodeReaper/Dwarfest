<script setup lang="ts">
defineProps<{
  nextActionLabel: string
  hasLastSnapshot: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  advance: []
  restoreLast: []
  exportGame: []
  resetSession: []
}>()
</script>

<template>
  <article class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">Checkpoint Flow</p>
        <h2>{{ nextActionLabel }}</h2>
      </div>
    </div>
    <div class="action-column">
      <button class="button" @click="emit('advance')" :disabled="disabled">Save checkpoint and continue</button>
      <button class="button button--secondary" @click="emit('restoreLast')" :disabled="disabled || !hasLastSnapshot">Undo to latest checkpoint</button>
      <button class="button button--secondary" @click="emit('exportGame')">Export game JSON</button>
      <button class="button button--ghost" @click="emit('resetSession')" :disabled="disabled">Exit game</button>
    </div>
  </article>
</template>
