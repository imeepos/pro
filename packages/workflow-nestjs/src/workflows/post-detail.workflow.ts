import { createWorkflowGraphAst, INode } from '@pro/workflow-core'
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SavePostDetailAst,
  PostDetailWorkflowInput,
  PostDetailWorkflowOutput,
} from './post-detail.ast'

export interface PostDetailWorkflowConfig {
  maxCommentPages?: number
  maxLikeUsers?: number
}

export function createPostDetailWorkflow(
  input: PostDetailWorkflowInput,
  config: PostDetailWorkflowConfig = {}
) {
  const { postId, metadata } = input
  const { maxCommentPages = 5, maxLikeUsers = 100 } = config

  const fetchDetail = Object.assign(new FetchPostDetailAst(), {
    id: 'fetch-detail',
    postId,
  })

  const fetchComments = Object.assign(new FetchCommentsAst(), {
    id: 'fetch-comments',
    postId,
    uid: '',
    maxPages: maxCommentPages,
  })

  const fetchLikes = Object.assign(new FetchLikesAst(), {
    id: 'fetch-likes',
    postId,
    maxUsers: maxLikeUsers,
  })

  const saveDetail = Object.assign(new SavePostDetailAst(), {
    id: 'save-detail',
    postId,
    metadata,
  })

  const workflow = createWorkflowGraphAst({
    name: 'PostDetailWorkflow',
    nodes: [
      {
        id: fetchDetail.id,
        state: fetchDetail.state,
        type: fetchDetail.type,
        postId,
      } as INode,
      {
        id: fetchComments.id,
        state: fetchComments.state,
        type: fetchComments.type,
        postId,
        uid: '',
        maxPages: maxCommentPages,
      } as INode,
      {
        id: fetchLikes.id,
        state: fetchLikes.state,
        type: fetchLikes.type,
        postId,
        maxUsers: maxLikeUsers,
      } as INode,
      {
        id: saveDetail.id,
        state: saveDetail.state,
        type: saveDetail.type,
        postId,
        metadata,
      } as INode,
    ],
    edges: [
      {
        from: 'fetch-detail',
        to: 'fetch-comments',
        fromProperty: 'authorId',
        toProperty: 'uid',
      },
      {
        from: 'fetch-detail',
        to: 'save-detail',
        fromProperty: 'detail',
        toProperty: 'detail',
      },
      {
        from: 'fetch-comments',
        to: 'save-detail',
        fromProperty: 'comments',
        toProperty: 'comments',
      },
      {
        from: 'fetch-likes',
        to: 'save-detail',
        fromProperty: 'likes',
        toProperty: 'likes',
      },
    ],
  })

  return workflow
}

export async function executePostDetailWorkflow(
  input: PostDetailWorkflowInput,
  config: PostDetailWorkflowConfig = {}
): Promise<PostDetailWorkflowOutput> {
  const { execute } = await import('@pro/workflow-core')

  const workflow = createPostDetailWorkflow(input, config)
  const result = await execute(workflow)

  const saveNode = result.nodes.find((n: any) => n.id === 'save-detail') as any
  const detailNode = result.nodes.find((n: any) => n.id === 'fetch-detail') as any

  return {
    success: saveNode?.success || false,
    rawDataId: saveNode?.rawDataId,
    authorId: detailNode?.authorId,
  }
}
