import type { Bug } from '@/types'

function orderAfterCurrent(bugs: Bug[], currentBugId: string): Bug[] {
  const currentIndex = bugs.findIndex((bug) => bug.id === currentBugId)

  if (currentIndex < 0) return bugs

  return [...bugs.slice(currentIndex + 1), ...bugs.slice(0, currentIndex + 1)]
}

export function findFirstUncompletedBug(
  bugs: Bug[],
  completedBugIds: Iterable<string>,
): Bug | undefined {
  const completedIds = new Set(completedBugIds)
  return bugs.find((bug) => !completedIds.has(bug.id)) ?? bugs[0]
}

export function findNextTrainingBug(
  bugs: Bug[],
  currentBugId: string,
  completedBugIds: Iterable<string>,
): Bug | undefined {
  if (!bugs.length) return undefined

  const completedIds = new Set(completedBugIds)
  const orderedBugs = orderAfterCurrent(bugs, currentBugId)

  return orderedBugs.find((bug) => !completedIds.has(bug.id)) ?? orderedBugs[0]
}
