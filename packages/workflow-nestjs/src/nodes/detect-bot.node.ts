import { Node, Input, Output, Ast } from '@pro/workflow-core'
import type { UserProfileData, UserBehaviorFeatures, DetectionResult } from '../types/user-profile.types'

@Node()
export class DetectBotNode extends Ast {
  type = 'DetectBot' as const

  @Input()
  profile!: UserProfileData

  @Input()
  behaviorFeatures!: UserBehaviorFeatures

  @Output()
  botDetection?: DetectionResult
}
