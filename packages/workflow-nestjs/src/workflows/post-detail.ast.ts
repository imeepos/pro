import { Input, Output, Ast, Node } from '@pro/workflow-core'

@Node()
export class FetchPostDetailAst extends Ast {
  @Input() postId!: string
  @Input() cookies?: string
  @Input() headers?: Record<string, string>

  @Output() detail?: any
  @Output() authorId?: string

  type = 'FetchPostDetailAst' as const
}

@Node()
export class FetchCommentsAst extends Ast {
  @Input() postId!: string
  @Input() uid!: string
  @Input() cookies?: string
  @Input() headers?: Record<string, string>
  @Input() maxPages?: number

  @Output() comments?: any[]
  @Output() totalComments?: number

  type = 'FetchCommentsAst' as const
}

@Node()
export class FetchLikesAst extends Ast {
  @Input() postId!: string
  @Input() cookies?: string
  @Input() headers?: Record<string, string>
  @Input() maxUsers?: number

  @Output() likes?: any[]
  @Output() totalLikes?: number

  type = 'FetchLikesAst' as const
}

@Node()
export class SavePostDetailAst extends Ast {
  @Input() postId!: string
  @Input() detail?: any
  @Input() comments?: any[]
  @Input() likes?: any[]
  @Input() metadata?: Record<string, any>

  @Output() rawDataId?: string
  @Output() success!: boolean

  type = 'SavePostDetailAst' as const
}

export interface PostDetailWorkflowInput {
  postId: string
  metadata?: Record<string, any>
}

export interface PostDetailWorkflowOutput {
  success: boolean
  rawDataId?: string
  authorId?: string
}
