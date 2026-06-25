export type StudyTrackId = 'python' | 'javascript' | 'sql'

export type StudyMissionDifficulty = 'simple' | 'medium' | 'advanced'

export interface StudyMission {
  id: string
  title: string
  difficulty: StudyMissionDifficulty
  explanation: string
  codeExample: string
  objective: string
}

export interface StudyTrack {
  id: StudyTrackId
  title: string
  description: string
  recommendedLevel: string
  missions: StudyMission[]
}

export type Study = StudyTrack

export type GuidedStudyTopicId =
  | 'python'
  | 'javascript'
  | 'html-css'
  | 'sql'
  | 'git-github'
  | 'logic'
  | 'frontend'
  | 'backend'

export type GuidedStudyLevelId = 'never-coded' | 'basic' | 'intermediate' | 'advanced'

export interface GuidedStudyLevel {
  id: GuidedStudyLevelId
  title: string
  description: string
  scoutFocus: string
  pace: string
}

export interface GuidedStudyCodeLine {
  code: string
  explanation: string
}

export interface GuidedStudyLesson {
  id: string
  title: string
  theme: string
  summary: string
  explanation: string
  analogy: string
  code: string
  codeLanguage: string
  codeWalkthrough: GuidedStudyCodeLine[]
  commonErrors: string[]
  activity: string
  strengths: string[]
  reinforce: string[]
}

export interface GuidedStudyResource {
  label: string
  description: string
  type: 'video' | 'documentation'
  url: string
}

export interface GuidedStudyTopic {
  id: GuidedStudyTopicId
  title: string
  shortLabel: string
  icon: string
  description: string
  recommendation: string
  lessons: GuidedStudyLesson[]
  resources: GuidedStudyResource[]
}

export interface StudyHistoryEntry {
  id: string
  topicId: GuidedStudyTopicId
  topicTitle: string
  levelId: GuidedStudyLevelId
  levelTitle: string
  lessonId: string
  lessonTitle: string
  theme: string
  completedAt: string
  strengths: string[]
  reinforce: string[]
}

export interface GuidedStudySession {
  topicId: GuidedStudyTopicId
  levelId: GuidedStudyLevelId
  lessonId: string
}
