import { phases, type PhaseKey } from '../types'

export interface TurnPointer {
  currentRound: number
  currentPhase: PhaseKey
  currentPlayerIndex: number
  rounds: number
  playerCount: number
}

export interface TurnAdvanceResult {
  currentRound: number
  currentPhase: PhaseKey
  currentPlayerIndex: number
  shouldResetRoundStats: boolean
  isGameFinished: boolean
}

export function advanceTurnPointer(pointer: TurnPointer): TurnAdvanceResult {
  const isLastPlayer = pointer.currentPlayerIndex >= pointer.playerCount - 1
  const phaseIndex = phases.indexOf(pointer.currentPhase)
  const isLastPhase = phaseIndex === phases.length - 1
  const isLastRound = pointer.currentRound >= pointer.rounds

  if (!isLastPlayer) {
    return {
      currentRound: pointer.currentRound,
      currentPhase: pointer.currentPhase,
      currentPlayerIndex: pointer.currentPlayerIndex + 1,
      shouldResetRoundStats: false,
      isGameFinished: false,
    }
  }

  if (!isLastPhase) {
    return {
      currentRound: pointer.currentRound,
      currentPhase: phases[phaseIndex + 1],
      currentPlayerIndex: 0,
      shouldResetRoundStats: false,
      isGameFinished: false,
    }
  }

  if (!isLastRound) {
    return {
      currentRound: pointer.currentRound + 1,
      currentPhase: phases[0],
      currentPlayerIndex: 0,
      shouldResetRoundStats: true,
      isGameFinished: false,
    }
  }

  return {
    currentRound: pointer.currentRound,
    currentPhase: pointer.currentPhase,
    currentPlayerIndex: pointer.currentPlayerIndex,
    shouldResetRoundStats: false,
    isGameFinished: true,
  }
}
