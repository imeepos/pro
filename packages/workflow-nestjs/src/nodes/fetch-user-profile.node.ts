import { Node, Input, Output } from '@pro/rabbitmq'
import { Ast } from '@pro/rabbitmq'
import type { UserProfileData } from '../types/user-profile.types'

@Node()
export class FetchUserProfileNode extends Ast {
  type = 'FetchUserProfile' as const

  @Input()
  userId!: string

  @Output()
  profile?: UserProfileData
}
