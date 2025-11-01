import { Node, Input, Output } from '@pro/rabbitmq'
import { Ast } from '@pro/rabbitmq'
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
