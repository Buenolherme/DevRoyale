export { cn } from './cn'
export { normalizeBattleAnswer, validateBattleAnswer } from './battleValidation'
export {
  STUDY_HISTORY_STORAGE_KEY,
  getCompletedStudyLessonIds,
  getCompletedStudyLessons,
  getStudyCompletionKey,
  getStudyHistoryByUser,
  isStudyLessonCompleted,
  saveCompletedStudyLesson,
} from './studyHistory'
export {
  buildBugStudyRecommendation,
  findRecommendedBug,
  getBugStudyRecommendation,
} from './bugStudyRecommendation'
export type {
  BugStudyRecommendation,
  BugTrainingCategory,
} from './bugStudyRecommendation'
export {
  PROGRESS_ACHIEVEMENTS,
  STUDY_LESSON_XP_BY_LEVEL,
  USER_PROGRESS_STORAGE_KEY,
  addXP,
  calculateLevel,
  checkAchievements,
  getAchievementSummary,
  getAchievementProgress,
  getStudyLessonXP,
  getUserProgress,
  hasCompletedSource,
  markSourceCompleted,
} from './userProgress'
export {
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_PREFERENCES_STORAGE_KEY,
  createDefaultProfilePreferences,
  getUserProfilePreferences,
  saveUserProfilePreferences,
} from './profilePreferences'
export { optimizeProfileAvatar } from './profileAvatar'
export type {
  ProfileExperienceLevel,
  UserProfilePreferences,
} from './profilePreferences'
