<script setup lang="ts">
import { t } from '../i18n'

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
        <p class="eyebrow">{{ t('checkpoint.flow') }}</p>
        <h2>{{ nextActionLabel }}</h2>
      </div>
    </div>
    <div class="action-column">
      <button class="button" @click="emit('advance')" :disabled="disabled">{{ t('checkpoint.saveContinue') }}</button>
      <button class="button button--secondary" @click="emit('restoreLast')" :disabled="disabled || !hasLastSnapshot">{{ t('checkpoint.undo') }}</button>
      <button class="button button--secondary" @click="emit('exportGame')">{{ t('checkpoint.export') }}</button>
      <button class="button button--ghost" @click="emit('resetSession')" :disabled="disabled">{{ t('checkpoint.exit') }}</button>
    </div>
  </article>
</template>
