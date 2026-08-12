export const DEVROYALE_VERSION = 'V1.5'
export const DEVROYALE_STATUS = 'Em validação'
export const ONBOARDING_STORAGE_KEY = 'devroyale_onboarding_seen_v1_5'

export function hasSeenDevRoyaleOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function markDevRoyaleOnboardingSeen(): boolean {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    return true
  } catch {
    return false
  }
}
