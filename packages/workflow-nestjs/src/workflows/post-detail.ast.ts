import { Input, Output, Ast, Node } from '@pro/workflow-core'

@Node()
export class UserCheckAst extends Ast {
  @Input() @Output() authorWeiboId!: string

  @Output() authorId?: string
  @Output() needFetch!: boolean

  type = 'UserCheckAst' as const
}

@Node()
export class UserFetchAst extends Ast {
  @Input() authorWeiboId!: string
  @Input() cookies?: string
  @Input() headers?: Record<string, string>

  @Output() authorId!: string

  type = 'UserFetchAst' as const
}

@Node()
export class FetchPostDetailAst extends Ast {
  @Input() @Output() postId!: string
  @Input() cookies?: string
  @Input() headers?: Record<string, string>

  @Output() detail?: any
  @Output() authorWeiboId!: string
  @Output() authorId?: string

  type = 'FetchPostDetailAst' as const
}

@Node()
export class FetchCommentsAst extends Ast {
  @Input() postId!: string
  @Input() uid!: string
  @Input() authorWeiboId!: string
  @Input() detail?: any
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
  @Input() detail?: any
  @Input() cookies?: string
  @Input() headers?: Record<string, string>
  @Input() maxUsers?: number

  @Output() likes?: any[]
  @Output() totalLikes?: number

  type = 'FetchLikesAst' as const
}

@Node()
export class SaveUserAndPostAst extends Ast {
  @Input() detail!: any
  @Input() authorId?: string

  @Output() savedAuthorId!: string
  @Output() savedPostId!: string

  type = 'SaveUserAndPostAst' as const
}

@Node()
export class SaveCommentsAndLikesAst extends Ast {
  @Input() comments?: any[]
  @Input() likes?: any[]
  @Input() postId!: string

  @Output() savedCommentCount!: number
  @Output() savedLikeCount!: number

  type = 'SaveCommentsAndLikesAst' as const
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
