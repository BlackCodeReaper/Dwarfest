import { describe, expect, test } from 'vitest'
import { totalNuggetValue } from './gameUtils'

const basePlayer = {
  id: 'p1',
  name: 'Gimli',
  copper: 0,
  silver: 0,
  gold: 0,
  fame: 1,
  brawl: 1,
  tables: 2,
  barrels: 2,
  dancers: 0,
  acceptedGuests: 0,
  servedGuests: 0,
  pendingCounterThrows: 0,
  successfulThrows: 0,
  failedThrows: 0,
  notes: '',
}

describe('totalNuggetValue', () => {
  test('returns zero when all currencies are zero', () => {
    expect(totalNuggetValue({ ...basePlayer, copper: 0, silver: 0, gold: 0 })).toBe(0)
  })

  test('counts copper as 1 each', () => {
    expect(totalNuggetValue({ ...basePlayer, copper: 7 })).toBe(7)
  })

  test('counts silver as 4 each', () => {
    expect(totalNuggetValue({ ...basePlayer, silver: 3 })).toBe(12)
  })

  test('counts gold as 10 each', () => {
    expect(totalNuggetValue({ ...basePlayer, gold: 2 })).toBe(20)
  })

  test('sums all currency types correctly', () => {
    // 10 copper + 2 silver (×4=8) + 1 gold (×10=10) = 28
    expect(totalNuggetValue({ ...basePlayer, copper: 10, silver: 2, gold: 1 })).toBe(28)
  })
})
