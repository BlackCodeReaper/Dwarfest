import type { PlayerState, PurchasableAsset, WalletState } from '../types';
import { BARREL_COST, BARREL_MAX, DANCER_COST, DANCER_MAX, TABLE_COST, TABLE_MAX } from '../types';

export function totalNuggetValue(player: PlayerState): number {
  return player.copper + player.silver * 4 + player.gold * 10
}

/** Valore totale di un WalletState (usato anche per wallet parziali) */
export function walletTotal(wallet: WalletState): number {
  return wallet.copper + wallet.silver * 4 + wallet.gold * 10
}

/** Costo in nuggets di un asset acquistabile */
export function assetCost(asset: PurchasableAsset): number {
  if (asset === 'table') return TABLE_COST
  if (asset === 'barrel') return BARREL_COST
  return DANCER_COST
}

/** Limite massimo di un asset */
export function assetMax(asset: PurchasableAsset): number {
  if (asset === 'table') return TABLE_MAX
  if (asset === 'barrel') return BARREL_MAX
  return DANCER_MAX
}

/** Il giocatore può permettersi l'acquisto? */
export function canAfford(player: PlayerState, asset: PurchasableAsset): boolean {
  const current = assetCount(player, asset)
  if (current >= assetMax(asset)) return false
  return totalNuggetValue(player) >= assetCost(asset)
}

function assetCount(player: PlayerState, asset: PurchasableAsset): number {
  if (asset === 'table') return player.tables
  if (asset === 'barrel') return player.barrels
  return player.dancers
}

/**
 * Scala i nuggets del giocatore sottraendo `amount` nella forma più
 * conveniente (prima gold, poi silver, poi copper), floor a 0.
 * Restituisce una copia immutabile dei campi wallet.
 */
export function deductNuggets(player: PlayerState, amount: number): WalletState {
  let remaining = Math.max(0, amount)
  let gold = player.gold
  let silver = player.silver
  let copper = player.copper

  const goldToUse = Math.min(gold, Math.floor(remaining / 10))
  gold -= goldToUse
  remaining -= goldToUse * 10

  const silverToUse = Math.min(silver, Math.floor(remaining / 4))
  silver -= silverToUse
  remaining -= silverToUse * 4

  const copperToUse = Math.min(copper, remaining)
  copper -= copperToUse
  remaining -= copperToUse

  // Se ancora remaining > 0 significa che non c'erano abbastanza fondi;
  // in quel caso non sottraiamo nulla (la chiamante deve usare canAfford prima).
  if (remaining > 0) {
    return { gold: player.gold, silver: player.silver, copper: player.copper }
  }

  return { gold, silver, copper }
}

/**
 * Applica l'acquisto di un asset al giocatore.
 * Restituisce null se l'acquisto non è possibile.
 */
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