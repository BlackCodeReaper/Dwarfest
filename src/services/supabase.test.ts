import { describe, expect, test } from 'vitest'
import { isSupabaseConfiguredFromValues } from './supabase'

describe('isSupabaseConfiguredFromValues', () => {
  test('returns false for missing values', () => {
    expect(isSupabaseConfiguredFromValues(undefined, undefined)).toBe(false)
  })

  test('returns false for placeholder values', () => {
    expect(isSupabaseConfiguredFromValues('https://your-project-ref.supabase.co', 'your-anon-key')).toBe(false)
  })

  test('returns false for invalid supabase url', () => {
    expect(isSupabaseConfiguredFromValues('https://example.com', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.value')).toBe(false)
  })

  test('returns false for very short key even with valid url', () => {
    expect(isSupabaseConfiguredFromValues('https://abc123.supabase.co', 'short-key')).toBe(false)
  })

  test('returns true for valid-looking supabase values', () => {
    expect(
      isSupabaseConfiguredFromValues('https://abc123.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature'),
    ).toBe(true)
  })
})