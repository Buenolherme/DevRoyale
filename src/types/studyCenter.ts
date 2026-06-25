export type StudyTopicId =
  | 'python'
  | 'javascript'
  | 'html-css'
  | 'sql'
  | 'git-github'
  | 'logic'
  | 'frontend'
  | 'backend'

export type StudyLevelId = 'never-coded' | 'basic' | 'intermediate' | 'advanced'

export interface StudyTopicOption {
  id: StudyTopicId
  label: string
  description: string
}

export interface StudyLevelOption {
  id: StudyLevelId
  label: string
  description: string
}

export interface StudyResourceLink {
  title: string
  description: string
  url: string
}

export interface StudyCodeLineExplanation {
  line: string
  explanation: string
}

export interface StudyCodeExample {
  language: string
  code: string
  lineByLine: StudyCodeLineExplanation[]
}

export interface StudyMiniActivity {
  title: string
  instructions: string
  successCriteria: string[]
}

export interface StudyLesson {
  id: string
  topicId: StudyTopicId
  levelId: StudyLevelId
  title: string
  lessonTheme: string
  shortDescription: string
  explanation: string
  analogy: string
  codeExample: StudyCodeExample
  commonMistakes: string[]
  miniActivity: StudyMiniActivity
  recommendedVideos: StudyResourceLink[]
  trustedResources: StudyResourceLink[]
  suggestedStrengths: string[]
  suggestedReinforcements: string[]
}

export interface StudyLearningPath {
  id: string
  topicId: StudyTopicId
  levelId: StudyLevelId
  title: string
  description: string
  lessons: StudyLesson[]
}

export interface StudyHistoryRecord {
  id: string
  userId: string
  topicId: StudyTopicId
  topicLabel: string
  levelId: StudyLevelId
  levelLabel: string
  lessonId: string
  lessonTitle: string
  lessonTheme: string
  completedAt: string
  strengths: string[]
  reinforcements: string[]
}

export type SaveStudyHistoryInput = Omit<
  StudyHistoryRecord,
  'id' | 'userId' | 'completedAt'
>

export interface SaveStudyHistoryResult {
  persisted: boolean
  alreadyCompleted: boolean
  record: StudyHistoryRecord | null
  history: StudyHistoryRecord[]
  reason?: 'anonymous-user' | 'storage-unavailable'
}
