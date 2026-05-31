import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

function looksLikePlaceholder(value: string) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  return (
    normalized.includes('your-') ||
    normalized.includes('your_') ||
    normalized.includes('placeholder') ||
    normalized.includes('example') ||
    normalized.includes('changeme')
  )
}

function hasValidSupabaseUrl(url?: string) {
  if (!url || looksLikePlaceholder(url)) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.includes('supabase.co')
  } catch {
    return false
  }
}

function hasValidAnonKey(key?: string) {
  if (!key || looksLikePlaceholder(key)) {
    return false
  }

  return key.trim().length >= 20
}

export function isSupabaseConfiguredFromValues(url?: string, anonKey?: string) {
  return hasValidSupabaseUrl(url) && hasValidAnonKey(anonKey)
}

export function isSupabaseConfigured() {
  return isSupabaseConfiguredFromValues(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
      },
    })
  }

  return supabaseClient
}
