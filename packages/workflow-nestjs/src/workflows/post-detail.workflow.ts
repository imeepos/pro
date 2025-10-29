import { WorkflowGraphAst } from '@pro/workflow-core'
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SavePostDetailAst,
  PostDetailWorkflowInput,
  PostDetailWorkflowOutput,
} from './post-detail.ast'
import { executeAst } from '@pro/workflow-core';

export interface PostDetailWorkflowConfig {
  maxCommentPages?: number
  maxLikeUsers?: number
}

export function createPostDetailWorkflow(
  input: PostDetailWorkflowInput,
  config: PostDetailWorkflowConfig = {}
): WorkflowGraphAst {
  const { postId, metadata } = input
  const { maxCommentPages = 5, maxLikeUsers = 100 } = config

  const fetchDetail = new FetchPostDetailAst()
  fetchDetail.postId = postId

  const fetchComments = new FetchCommentsAst()
  fetchComments.postId = postId
  fetchComments.maxPages = maxCommentPages

  const fetchLikes = new FetchLikesAst()
  fetchLikes.postId = postId
  fetchLikes.maxUsers = maxLikeUsers

  const saveDetail = new SavePostDetailAst()
  saveDetail.postId = postId
  if (metadata) {
    saveDetail.metadata = metadata
  }

  return new WorkflowGraphAst()
    .addNode(fetchDetail)
    .addNode(fetchComments)
    .addNode(fetchLikes)
    .addNode(saveDetail)
    .addEdge({
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'authorId',
      toProperty: 'uid',
    })
    .addEdge({
      from: fetchDetail.id,
      to: saveDetail.id,
      fromProperty: 'detail',
      toProperty: 'detail',
    })
    .addEdge({
      from: fetchComments.id,
      to: saveDetail.id,
      fromProperty: 'comments',
      toProperty: 'comments',
    })
    .addEdge({
      from: fetchLikes.id,
      to: saveDetail.id,
      fromProperty: 'likes',
      toProperty: 'likes',
    })
}

export async function executePostDetailWorkflow(
  input: PostDetailWorkflowInput,
  config: PostDetailWorkflowConfig = {}
): Promise<PostDetailWorkflowOutput> {

  const workflow = createPostDetailWorkflow(input, config)
  const result = await executeAst(workflow, {})

  const saveNode = result.nodes.find((n: any) => n.type === 'SavePostDetailAst') as any
  const detailNode = result.nodes.find((n: any) => n.type === 'FetchPostDetailAst') as any

  return {
    success: saveNode?.success || false,
    rawDataId: saveNode?.rawDataId,
    authorId: detailNode?.authorId,
  }
}
