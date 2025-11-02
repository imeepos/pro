import { Node, Input, Output, Ast } from '@pro/workflow-core'
import type { UserProfileData } from '../types/user-profile.types'

@Node()
export class FetchUserProfileNode extends Ast {
  type = 'FetchUserProfile' as const

  @Input()
  userId!: string

  @Output()
  profile?: UserProfileData
}
