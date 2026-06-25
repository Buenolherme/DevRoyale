export interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
  level: number
  xp: number
  xpToNextLevel: number
  createdAt: string
}

export interface UserXP {
  current: number
  toNextLevel: number
  level: number
  totalEarned: number
}
