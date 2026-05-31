import { describe, expect, it } from 'vitest'
import { advanceTurnPointer } from './gameFlow'

describe('advanceTurnPointer', () => {
  it('advances to next player within same phase', () => {
    const result = advanceTurnPointer({
      currentRound: 1,
      currentPhase: 'supplies',
      currentPlayerIndex: 0,
      rounds: 5,
      playerCount: 4,
    })

    expect(result).toEqual({
      currentRound: 1,
      currentPhase: 'supplies',
      currentPlayerIndex: 1,
      shouldResetRoundStats: false,
      isGameFinished: false,
    })
  })

  it('advances phase when current player is last in turn order', () => {
    const result = advanceTurnPointer({
      currentRound: 1,
      currentPhase: 'supplies',
      currentPlayerIndex: 3,
      rounds: 5,
      playerCount: 4,
    })

    expect(result).toEqual({
      currentRound: 1,
      currentPhase: 'opening',
      currentPlayerIndex: 0,
      shouldResetRoundStats: false,
      isGameFinished: false,
    })
  })

  it('starts next round and resets round stats flag after collection', () => {
    const result = advanceTurnPointer({
      currentRound: 1,
      currentPhase: 'collection',
      currentPlayerIndex: 3,
      rounds: 5,
      playerCount: 4,
    })

    expect(result).toEqual({
      currentRound: 2,
      currentPhase: 'supplies',
      currentPlayerIndex: 0,
      shouldResetRoundStats: true,
      isGameFinished: false,
    })
  })

  it('marks game as finished at final player/final phase/final round', () => {
    const result = advanceTurnPointer({
      currentRound: 5,
      currentPhase: 'collection',
      currentPlayerIndex: 3,
      rounds: 5,
      playerCount: 4,
    })

    expect(result).toEqual({
      currentRound: 5,
      currentPhase: 'collection',
      currentPlayerIndex: 3,
      shouldResetRoundStats: false,
      isGameFinished: true,
    })
  })

  it('handles single-player edge case without infinite loop risk', () => {
    const result = advanceTurnPointer({
      currentRound: 1,
      currentPhase: 'supplies',
      currentPlayerIndex: 0,
      rounds: 3,
      playerCount: 1,
    })

    expect(result).toEqual({
      currentRound: 1,
      currentPhase: 'opening',
      currentPlayerIndex: 0,
      shouldResetRoundStats: false,
      isGameFinished: false,
    })
  })

  it('wraps from final phase to next round for mid-game round', () => {
    const result = advanceTurnPointer({
      currentRound: 2,
      currentPhase: 'collection',
      currentPlayerIndex: 1,
      rounds: 5,
      playerCount: 2,
    })

    expect(result).toEqual({
      currentRound: 3,
      currentPhase: 'supplies',
      currentPlayerIndex: 0,
      shouldResetRoundStats: true,
      isGameFinished: false,
    })
  })
})
