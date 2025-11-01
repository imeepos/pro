import { Node, Input, Output } from '@pro/rabbitmq'
import { Ast } from '@pro/rabbitmq'
import type { UserProfileWorkflowData } from '../types/user-profile.types'

@Node()
export class SaveUserProfileNode extends Ast {
  type = 'SaveUserProfile' as const

  @Input()
  userId!: string

  @Input()
  workflowData!: UserProfileWorkflowData

  @Output()
  rawDataId?: string
}
