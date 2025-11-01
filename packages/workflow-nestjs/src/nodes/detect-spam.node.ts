import { Node, Input, Output } from '@pro/rabbitmq'
import { Ast } from '@pro/rabbitmq'
import type { UserPostSummary, UserBehaviorFeatures, DetectionResult } from '../types/user-profile.types'

@Node()
export class DetectSpamNode extends Ast {
  type = 'DetectSpam' as const

  @Input()
  posts!: UserPostSummary[]

  @Input()
  behaviorFeatures!: UserBehaviorFeatures

  @Output()
  spamDetection?: DetectionResult
}
