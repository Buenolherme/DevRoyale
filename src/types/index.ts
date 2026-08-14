export type {
  AuthUser,
  KnowledgeLevel,
  MainLanguage,
  RegisterInput,
  RegisterResult,
  LoginInput,
  AuthState,
} from './auth'
export {
  KNOWLEDGE_LEVEL_OPTIONS,
  MAIN_LANGUAGE_OPTIONS,
  getKnowledgeLevelLabel,
  getMainLanguageLabel,
} from './auth'
export type { DatabaseProfile, Profile, UpdateProfileInput } from './profile'
export type { Database } from './database'
export type {
  DatabaseFriendBlock,
  DatabaseFriendship,
  Friend,
  FriendRequest,
  FriendshipStatus,
  OnlinePresence,
  PresenceStatus,
  SocialProfile,
  SocialRelationshipState,
  SocialSearchResult,
} from './social'
export type {
  DatabasePublicRoom,
  DatabaseRoom,
  DatabaseRoomInvite,
  DatabaseRoomMember,
  MatchFormat,
  PublicRoom,
  Room,
  RoomDifficulty,
  RoomInvite,
  RoomInviteRealtimeEvent,
  RoomInviteStatus,
  RoomLanguage,
  RoomMember,
  RoomMemberRole,
  RoomRealtimeEvent,
  RoomSettings,
  RoomStatus,
  RoomVisibility,
} from './room'
export {
  MATCH_FORMAT_LABELS,
  ROOM_DIFFICULTY_LABELS,
  ROOM_LANGUAGE_LABELS,
} from './room'
export type { User, UserXP } from './user'
export type { Achievement, AchievementRarity } from './achievement'
export type { Challenge, ChallengeDifficulty, ChallengeStatus } from './challenge'
export type {
  GuidedStudyCodeLine,
  GuidedStudyLesson,
  GuidedStudyLevel,
  GuidedStudyLevelId,
  GuidedStudyResource,
  GuidedStudySession,
  GuidedStudyTopic,
  GuidedStudyTopicId,
  Study,
  StudyHistoryEntry,
  StudyMission,
  StudyMissionDifficulty,
  StudyTrack,
  StudyTrackId,
} from './study'
export type {
  SaveStudyHistoryInput,
  SaveStudyHistoryResult,
  StudyCodeExample,
  StudyCodeLineExplanation,
  StudyHistoryRecord,
  StudyLearningPath,
  StudyLesson,
  StudyLevelId,
  StudyLevelOption,
  StudyMiniActivity,
  StudyResourceLink,
  StudyTopicId,
  StudyTopicOption,
} from './studyCenter'
export type {
  Bug,
  BugCodeSize,
  BugCount,
  BugDifficulty,
  BugLanguage,
} from './bug'
export type {
  BattleChallenge,
  BattleDifficulty,
  BattleHints,
  BattleLanguage,
  BattlePatternRule,
  BattleTestCase,
  BattleValidationRules,
  BattleValidationStrategy,
} from './battle'
export type {
  AchievementSummary,
  AchievementMetricProgress,
  LevelProgress,
  ProgressAchievementCondition,
  ProgressAchievementDefinition,
  ProgressAchievementMetric,
  ProgressActivity,
  ProgressActivitySource,
  ProgressActivityType,
  ProgressMetadata,
  ProgressMetadataValue,
  ProgressMutationResult,
  ProgressSource,
  UnlockedProgressAchievement,
  UserProgress,
} from './progress'

export type Theme = 'light' | 'dark'
