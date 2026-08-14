export const DEVROYALE_VERSION = '1.5.0'
export const DEVROYALE_VERSION_LABEL = `V${DEVROYALE_VERSION.split('.').slice(0, 2).join('.')}`
export const DEVROYALE_STATUS = 'Release'
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
