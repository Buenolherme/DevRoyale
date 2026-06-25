import type { LevelProgress } from '@/types'

function getLevelThreshold(level: number): number {
  const initialThresholds = [0, 100, 250, 450, 700]
  if (level <= initialThresholds.length) return initialThresholds[Math.max(level - 1, 0)]

  let threshold = initialThresholds[initialThresholds.length - 1]
  let increment = 300

  for (let currentLevel = 6; currentLevel <= level; currentLevel += 1) {
    threshold += increment
    increment += 100
  }

  return threshold
}

export function calculateLevel(totalXP: number): LevelProgress {
  const normalizedXP = Math.max(0, Math.floor(Number.isFinite(totalXP) ? totalXP : 0))
  let level = 1

  while (normalizedXP >= getLevelThreshold(level + 1)) {
    level += 1
  }

  const currentLevelThreshold = getLevelThreshold(level)
  const nextLevelThreshold = getLevelThreshold(level + 1)

  return {
    level,
    currentLevelXP: normalizedXP - currentLevelThreshold,
    nextLevelXP: nextLevelThreshold - currentLevelThreshold,
    currentLevelThreshold,
    nextLevelThreshold,
  }
}
