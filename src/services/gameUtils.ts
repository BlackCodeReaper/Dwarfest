import type { PlayerState } from '../types'

export function totalNuggetValue(player: PlayerState): number {
  return player.copper + player.silver * 4 + player.gold * 10
}
