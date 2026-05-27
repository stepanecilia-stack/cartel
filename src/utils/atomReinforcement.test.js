import { describe, expect, it } from 'vitest'
import {
  applyPracticedAtomsToReinforcement,
  reinforcementStarCount,
} from './atomReinforcement.js'

describe('reinforcementStarCount', () => {
  it('maps totals to 0–5 stars', () => {
    expect(reinforcementStarCount(0)).toBe(0)
    expect(reinforcementStarCount(1)).toBe(1)
    expect(reinforcementStarCount(2)).toBe(1)
    expect(reinforcementStarCount(3)).toBe(2)
    expect(reinforcementStarCount(7)).toBe(2)
    expect(reinforcementStarCount(8)).toBe(3)
    expect(reinforcementStarCount(14)).toBe(3)
    expect(reinforcementStarCount(15)).toBe(4)
    expect(reinforcementStarCount(24)).toBe(4)
    expect(reinforcementStarCount(25)).toBe(5)
    expect(reinforcementStarCount(100)).toBe(5)
  })
})

describe('applyPracticedAtomsToReinforcement', () => {
  it('increments totals once per atom per session batch', () => {
    const next = applyPracticedAtomsToReinforcement(
      { a1: { total: 2, lastAt: '2026-05-01' } },
      ['a1', 'a2', 'a1'],
      '2026-05-27',
    )
    expect(next.a1.total).toBe(3)
    expect(next.a1.lastAt).toBe('2026-05-27')
    expect(next.a2.total).toBe(1)
  })
})
