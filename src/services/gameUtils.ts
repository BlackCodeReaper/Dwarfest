import type { CardMode, PlayerState, PurchasableAsset, WalletState } from '../types'
import { BARREL_COST, BARREL_MAX, DANCER_COST, DANCER_MAX, TABLE_COST, TABLE_MAX } from '../types'

export function totalNuggetValue(player: PlayerState): number {
  return player.copper + player.silver * 4 + player.gold * 10
}

export function totalCardPayout(player: PlayerState): number {
  return Math.max(0, Math.trunc(player.cardPayout ?? 0))
}

export function finalScore(player: PlayerState, cardMode: CardMode): number {
  const nuggets = totalNuggetValue(player)

  if (cardMode === 'physical') {
    return nuggets
  }

  return nuggets + totalCardPayout(player)
}

export function walletTotal(wallet: WalletState): number {
  return wallet.copper + wallet.silver * 4 + wallet.gold * 10
}

export function assetCost(asset: PurchasableAsset): number {
  if (asset === 'table') return TABLE_COST
  if (asset === 'barrel') return BARREL_COST
  return DANCER_COST
}

export function assetMax(asset: PurchasableAsset): number {
  if (asset === 'table') return TABLE_MAX
  if (asset === 'barrel') return BARREL_MAX
  return DANCER_MAX
}

function assetCount(player: PlayerState, asset: PurchasableAsset): number {
  if (asset === 'table') return player.tables
  if (asset === 'barrel') return player.barrels
  return player.dancers
}

export function normalizeWalletFromTotal(totalNuggets: number): WalletState {
  let remaining = Math.max(0, Math.trunc(totalNuggets))
  const gold = Math.floor(remaining / 10)
  remaining -= gold * 10
  const silver = Math.floor(remaining / 4)
  remaining -= silver * 4
  const copper = remaining

  return { copper, silver, gold }
}

export function canAfford(player: PlayerState, asset: PurchasableAsset): boolean {
  const current = assetCount(player, asset)
  if (current >= assetMax(asset)) return false
  return totalNuggetValue(player) >= assetCost(asset)
}

export function canSell(player: PlayerState, asset: PurchasableAsset): boolean {
  return assetCount(player, asset) > 0
}

export function deductNuggets(player: PlayerState, amount: number): WalletState {
  const total = totalNuggetValue(player)
  const deduction = Math.max(0, Math.trunc(amount))

  if (deduction > total) {
    return { copper: player.copper, silver: player.silver, gold: player.gold }
  }

  return normalizeWalletFromTotal(total - deduction)
}

export function applyAssetPurchase(
  player: PlayerState,
  asset: PurchasableAsset,
): Partial<PlayerState> | null {
  if (!canAfford(player, asset)) return null

  const cost = assetCost(asset)
  const wallet = deductNuggets(player, cost)

  const delta: Partial<PlayerState> = { ...wallet }
  if (asset === 'table') delta.tables = player.tables + 1
  if (asset === 'barrel') delta.barrels = player.barrels + 1
  if (asset === 'dancer') delta.dancers = player.dancers + 1

  return delta
}

export function applyAssetSale(
  player: PlayerState,
  asset: PurchasableAsset,
): Partial<PlayerState> | null {
  if (!canSell(player, asset)) return null

  const reward = assetCost(asset)
  const wallet = normalizeWalletFromTotal(totalNuggetValue(player) + reward)

  const delta: Partial<PlayerState> = { ...wallet }
  if (asset === 'table') delta.tables = player.tables - 1
  if (asset === 'barrel') delta.barrels = player.barrels - 1
  if (asset === 'dancer') delta.dancers = player.dancers - 1

  return delta
}