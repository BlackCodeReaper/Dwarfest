<script setup lang="ts">
import { computed } from 'vue'
import { type SessionSnapshot } from '../types'
import { t } from '../i18n'

const props = defineProps<{
  history: SessionSnapshot[]
  canRestore?: boolean
}>()

const emit = defineEmits<{
  restore: [snapshotId: string]
}>()

const reversedHistory = computed(() => [...props.history].reverse())
</script>

<template>
  <article class="panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">{{ t('history.title') }}</p>
        <h2>{{ t('history.last') }}</h2>
      </div>
    </div>
    <ul class="history-list">
      <li v-for="snapshot in reversedHistory" :key="snapshot.id">
        <div>
          <strong>{{ snapshot.label }}</strong>
          <p class="hint">{{ new Date(snapshot.takenAt).toLocaleTimeString() }}</p>
        </div>
        <button class="button button--ghost" @click="emit('restore', snapshot.id)" :disabled="canRestore === false">{{ t('history.restore') }}</button>
      </li>
    </ul>
  </article>
</template>
