import { WorkflowGraphAst, useHandlers, WeiboAccountAst } from "@pro/workflow-core";
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
  UserCheckAst,
  UserFetchAst,
} from "./workflows/post-detail.ast";
import { UserCheckVisitor, UserFetchVisitor } from "./workflows/user.visitor";
import { WeiboAccountAstVisitor } from "./WeiboAccountAstVisitor";

export interface PostDetailWorkflowConfig {
  maxCommentPages?: number;
  maxLikeUsers?: number;
}

export async function runPostDetailWorkflow() {
  useHandlers([
    WeiboAccountAstVisitor,
    UserCheckVisitor,
    UserFetchVisitor,
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
    // Force recreate workflow with new user processing structure
    // TODO: Remove this force update after migration
    const workflowMetadata = await createPostDetailWorkflow(config);

    const { state } = await workflowService.executeWorkflow(
      workflowMetadata.id,
      'system',
      { postId, metadata, authorWeiboId: '1534871194', ...config } // 暂时使用硬编码的authorWeiboId，实际应该从帖子详情中提取
    );

    return state;
  };

  return { run };
}

export async function createPostDetailWorkflow(
  _config: PostDetailWorkflowConfig = {}
): Promise<WorkflowWithMetadata> {
  const account = new WeiboAccountAst();
  const userCheck = new UserCheckAst();
  const userFetch = new UserFetchAst();
  const fetchDetail = new FetchPostDetailAst();
  const fetchComments = new FetchCommentsAst();
  const fetchLikes = new FetchLikesAst();
  const saveDetail = new SavePostDetailAst();

  const workflow = new WorkflowGraphAst()
    .addNode(account)
    .addNode(userCheck)
    .addNode(userFetch)
    .addNode(fetchDetail)
    .addNode(fetchComments)
    .addNode(fetchLikes)
    .addNode(saveDetail)
    // 用户处理流程的边连接
    .addEdge({
      from: account.id,
      to: userCheck.id,
      fromProperty: 'cookies',
      toProperty: 'cookies',
    })
    .addEdge({
      from: account.id,
      to: userCheck.id,
      fromProperty: 'headers',
      toProperty: 'headers',
    })
    .addEdge({
      from: userCheck.id,
      to: userFetch.id,
      fromProperty: 'needFetch',
      toProperty: 'needFetch',
    })
    .addEdge({
      from: userCheck.id,
      to: userFetch.id,
      fromProperty: 'authorWeiboId',
      toProperty: 'authorWeiboId',
    })
    .addEdge({
      from: userCheck.id,
      to: fetchDetail.id,
      fromProperty: 'authorId',
      toProperty: 'authorId',
    })
    .addEdge({
      from: userFetch.id,
      to: fetchDetail.id,
      fromProperty: 'authorId',
      toProperty: 'authorId',
    })
    // 帖子详情处理的边连接
    .addEdge({
      from: account.id,
      to: fetchDetail.id,
      fromProperty: 'cookies',
      toProperty: 'cookies',
    })
    .addEdge({
      from: account.id,
      to: fetchDetail.id,
      fromProperty: 'headers',
      toProperty: 'headers',
    })
    .addEdge({
      from: account.id,
      to: fetchComments.id,
      fromProperty: 'cookies',
      toProperty: 'cookies',
    })
    .addEdge({
      from: account.id,
      to: fetchComments.id,
      fromProperty: 'headers',
      toProperty: 'headers',
    })
    .addEdge({
      from: account.id,
      to: fetchLikes.id,
      fromProperty: 'cookies',
      toProperty: 'cookies',
    })
    .addEdge({
      from: account.id,
      to: fetchLikes.id,
      fromProperty: 'headers',
      toProperty: 'headers',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'authorId',
      toProperty: 'uid',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchLikes.id,
      fromProperty: 'detail',
      toProperty: 'detail',
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
    // 将postId从fetchDetail传递到fetchComments和fetchLikes
    .addEdge({
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchLikes.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })
    // 将postId和authorId传递到saveDetail
    .addEdge({
      from: fetchDetail.id,
      to: saveDetail.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })
    .addEdge({
      from: fetchDetail.id,
      to: saveDetail.id,
      fromProperty: 'authorId',
      toProperty: 'authorId',
    });

  const workflowService = root.get(WorkflowService);

  const savedWorkflow = await workflowService.upsertWorkflow(
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
