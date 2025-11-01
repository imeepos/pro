import { Node, Input, Output, Ast } from '@pro/workflow-core'
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
