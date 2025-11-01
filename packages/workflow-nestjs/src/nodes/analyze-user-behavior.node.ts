import { Node, Input, Output } from '@pro/rabbitmq'
import { Ast } from '@pro/rabbitmq'
import type { UserPostSummary, UserBehaviorFeatures, UserProfileData } from '../types/user-profile.types'

@Node()
export class AnalyzeUserBehaviorNode extends Ast {
  type = 'AnalyzeUserBehavior' as const

  @Input()
  posts!: UserPostSummary[]

  @Input()
  profile?: UserProfileData

  @Output()
  behaviorFeatures?: UserBehaviorFeatures
}
