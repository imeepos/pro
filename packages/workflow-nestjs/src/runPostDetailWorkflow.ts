import { WorkflowGraphAst, useHandlers } from "@pro/workflow-core";
import { root } from "@pro/core";
import { WorkflowService, WorkflowWithMetadata } from "./workflow.service";
import {
  FetchPostDetailVisitor,
  FetchCommentsVisitor,
  FetchLikesVisitor,
  SavePostDetailVisitor,
} from "./workflows/post-detail.visitor";
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SavePostDetailAst,
} from "./workflows/post-detail.ast";

export interface PostDetailWorkflowConfig {
  maxCommentPages?: number;
  maxLikeUsers?: number;
}

export async function runPostDetailWorkflow() {
  useHandlers([
    FetchPostDetailVisitor,
    FetchCommentsVisitor,
    FetchLikesVisitor,
    SavePostDetailVisitor,
  ]);

  const workflowService = root.get(WorkflowService);

  const run = async (
    postId: string,
    metadata?: Record<string, any>,
    config: PostDetailWorkflowConfig = {}
  ) => {
    let workflowMetadata = await workflowService.getWorkflowBySlug('post-detail');

    if (!workflowMetadata) {
      workflowMetadata = await createPostDetailWorkflow(config);
    }

    const { state } = await workflowService.executeWorkflow(
      workflowMetadata.id,
      'system',
      { postId, metadata, ...config }
    );

    return state;
  };

  return { run };
}

export async function createPostDetailWorkflow(
  _config: PostDetailWorkflowConfig = {}
): Promise<WorkflowWithMetadata> {
  const fetchDetail = new FetchPostDetailAst();
  const fetchComments = new FetchCommentsAst();
  const fetchLikes = new FetchLikesAst();
  const saveDetail = new SavePostDetailAst();

  const workflow = new WorkflowGraphAst()
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
    });

  const workflowService = root.get(WorkflowService);

  const savedWorkflow = await workflowService.createWorkflow(
    '微博帖子详情抓取',
    workflow,
    'post-detail',
    {
      description: '抓取微博帖子详情、评论和点赞数据',
      tags: ['weibo', 'post', 'detail'],
      createdBy: 'system',
    }
  );

  return {
    workflow,
    id: savedWorkflow.id,
    name: savedWorkflow.name,
    slug: savedWorkflow.slug,
    description: savedWorkflow.description,
    tags: savedWorkflow.tags,
  };
}
