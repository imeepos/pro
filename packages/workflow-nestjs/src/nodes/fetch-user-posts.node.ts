import { Node, Input, Output } from '@pro/workflow-core'
import { Ast } from '@pro/workflow-core'
import type { UserPostSummary } from '../types/user-profile.types'

@Node()
export class FetchUserPostsNode extends Ast {
  type = 'FetchUserPosts' as const

  @Input()
  userId!: string

  @Input()
  maxPages?: number

  @Output()
  posts?: UserPostSummary[]

  @Output()
  error?: string
}
