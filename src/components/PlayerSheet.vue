<script setup lang="ts">
import { computed } from 'vue'
import { type PlayerState } from '../types'
import StatBars from './StatBars.vue'
import { t } from '../i18n'

const props = defineProps<{
  player: PlayerState
  totalNuggets: number
  brawlThreshold?: number
  readOnly?: boolean
  tableMax: number
  barrelMax: number
  dancerMax: number
  chartScaleMax: number
  cardMode: 'physical' | 'in-app-generated'
}>()

const emit = defineEmits<{
  purchaseAsset: [asset: 'table' | 'barrel' | 'dancer']
  sellAsset: [asset: 'table' | 'barrel' | 'dancer']
  generateServiceCards: []
  rejectServiceCard: [cardId: string]
}>()

const brawlAtLimit = computed(() => {
  const threshold = props.brawlThreshold ?? 6
  return props.player.brawl >= threshold
})

const tableAtMax = computed(() => props.player.tables >= props.tableMax)
const barrelAtMax = computed(() => props.player.barrels >= props.barrelMax)
const dancerAtMax = computed(() => props.player.dancers >= props.dancerMax)
</script>

<template>
  <article class="panel player-panel">
    <div class="section-head">
      <div>
        <p class="eyebrow">{{ t('player.sheet') }}</p>
        <h2>{{ player.name }}</h2>
      </div>
      <div class="totals">
        <span class="badge badge--accent">{{ t('player.totalNuggets', { value: totalNuggets }) }}</span>
      </div>
    </div>

    <StatBars :fame="player.fame" :brawl="player.brawl" :max="chartScaleMax" />

    <div class="field-grid field-grid--compact">
      <label>
        <span>{{ t('player.copper') }}</span>
        <input :value="player.copper" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.silver') }}</span>
        <input :value="player.silver" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.gold') }}</span>
        <input :value="player.gold" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.fame') }}</span>
        <input :value="player.fame" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span :class="{ 'brawl-alert': brawlAtLimit }">{{ t('player.brawl') }}{{ brawlAtLimit ? ` ⚠ ${t('player.brawlTrigger')}` : '' }}</span>
        <input :value="player.brawl" type="number" min="0" readonly disabled :class="{ 'input--alert': brawlAtLimit }" />
      </label>

      <label v-if="cardMode === 'in-app-generated'">
        <span>{{ t('player.cardPayout') }}</span>
        <input v-model.number="player.cardPayout" type="number" min="0" :disabled="readOnly" />
      </label>

      <div class="asset-field">
        <span>{{ t('player.tables') }} ({{ player.tables }}/{{ tableMax }})</span>
        <div class="asset-controls">
          <button class="button button--ghost" type="button" :disabled="readOnly || player.tables <= 0" @click="emit('sellAsset', 'table')">-</button>
          <button class="button button--secondary" type="button" :disabled="readOnly || tableAtMax || totalNuggets < 4" @click="emit('purchaseAsset', 'table')">+ (4)</button>
        </div>
      </div>

      <div class="asset-field">
        <span>{{ t('player.barrels') }} ({{ player.barrels }}/{{ barrelMax }})</span>
        <div class="asset-controls">
          <button class="button button--ghost" type="button" :disabled="readOnly || player.barrels <= 0" @click="emit('sellAsset', 'barrel')">-</button>
          <button class="button button--secondary" type="button" :disabled="readOnly || barrelAtMax || totalNuggets < 1" @click="emit('purchaseAsset', 'barrel')">+ (1)</button>
        </div>
      </div>

      <div class="asset-field">
        <span>{{ t('player.dancers') }} ({{ player.dancers }}/{{ dancerMax }})</span>
        <div class="asset-controls">
          <button class="button button--ghost" type="button" :disabled="readOnly || player.dancers <= 0" @click="emit('sellAsset', 'dancer')">-</button>
          <button class="button button--secondary" type="button" :disabled="readOnly || dancerAtMax || totalNuggets < 3" @click="emit('purchaseAsset', 'dancer')">+ (3)</button>
        </div>
      </div>

      <label>
        <span>{{ t('player.acceptedGuests') }}</span>
        <input :value="player.acceptedGuests" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.servedGuests') }}</span>
        <input :value="player.servedGuests" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.pendingThrows') }}</span>
        <input :value="player.pendingCounterThrows" type="number" min="0" readonly disabled />
      </label>
      <label>
        <span>{{ t('player.successfulThrows') }}</span>
        <input v-model.number="player.successfulThrows" type="number" min="0" :disabled="readOnly" />
      </label>
      <label>
        <span>{{ t('player.failedThrows') }}</span>
        <input v-model.number="player.failedThrows" type="number" min="0" :disabled="readOnly" />
      </label>
    </div>

    <section v-if="cardMode === 'in-app-generated'" class="dwarf-cards">
      <div class="section-head">
        <div>
          <p class="eyebrow">{{ t('cards.serviceTitle') }}</p>
          <h3>{{ t('cards.serviceSubtitle') }}</h3>
        </div>
        <button class="button button--secondary" type="button" :disabled="readOnly" @click="emit('generateServiceCards')">
          {{ t('cards.generate') }}
        </button>
      </div>

      <ul class="history-list">
        <li v-for="card in player.dwarfCards" :key="card.id">
          <div>
            <strong>{{ t('cards.dwarvesToServe', { value: card.dwarves }) }}</strong>
            <p class="hint" v-if="card.rejected">{{ t('cards.rejected') }}</p>
          </div>
          <button class="button button--ghost" type="button" :disabled="readOnly || card.rejected" @click="emit('rejectServiceCard', card.id)">
            {{ t('cards.rejectPlusRiot') }}
          </button>
        </li>
      </ul>
    </section>

    <label class="notes-field">
      <span>{{ t('player.notes') }}</span>
      <textarea v-model="player.notes" rows="5" :placeholder="t('player.notesPlaceholder')" :disabled="readOnly"></textarea>
    </label>
  </article>
</template>
