import { describe, expect, test } from 'vitest'
import { 
  totalNuggetValue, 
  applyAssetPurchase, 
  canAfford, 
  deductNuggets, 
  walletTotal 
} from './gameUtils'

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


describe('walletTotal', () => {
  test('somma correttamente i tre tier', () => {
    expect(walletTotal({ copper: 3, silver: 2, gold: 1 })).toBe(21)
  })
})

describe('canAfford', () => {
  test('nega se i fondi sono insufficienti', () => {
    expect(canAfford({ ...basePlayer, copper: 0, silver: 0, gold: 0 }, 'table')).toBe(false)
  })

  test('consente acquisto tavolo con fondi esatti', () => {
    expect(canAfford({ ...basePlayer, copper: 4, tables: 2 }, 'table')).toBe(true)
  })

  test('nega se il limite massimo è raggiunto', () => {
    expect(canAfford({ ...basePlayer, copper: 99, tables: 10 }, 'table')).toBe(false)
  })

  test('consente acquisto barile con 1 copper', () => {
    expect(canAfford({ ...basePlayer, copper: 1, barrels: 0 }, 'barrel')).toBe(true)
  })
})

describe('deductNuggets', () => {
  test('sottrae dai copper prima', () => {
    const result = deductNuggets({ ...basePlayer, copper: 5, silver: 0, gold: 0 }, 3)
    expect(result).toEqual({ copper: 2, silver: 0, gold: 0 })
  })

  test('usa gold prima dei silver quando conveniente', () => {
    const result = deductNuggets({ ...basePlayer, copper: 0, silver: 0, gold: 2 }, 10)
    expect(result).toEqual({ copper: 0, silver: 0, gold: 1 })
  })

  test('restituisce wallet invariato se fondi insufficienti', () => {
    const result = deductNuggets({ ...basePlayer, copper: 1, silver: 0, gold: 0 }, 4)
    expect(result).toEqual({ copper: 1, silver: 0, gold: 0 })
  })
})

describe('applyAssetPurchase', () => {
  test('restituisce null se non si può permettere', () => {
    expect(applyAssetPurchase({ ...basePlayer, copper: 0 }, 'barrel')).toBeNull()
  })

  test('incrementa il contatore dell\'asset e scala il wallet', () => {
    const result = applyAssetPurchase({ ...basePlayer, copper: 4, tables: 2 }, 'table')
    expect(result).toMatchObject({ tables: 3, copper: 0 })
  })
})
