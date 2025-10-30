import { WorkflowGraphAst, useHandlers, WeiboAccountAst } from "@pro/workflow-core";
import { root } from "@pro/core";
import { WorkflowService, WorkflowWithMetadata } from "./workflow.service";
import {
  FetchPostDetailVisitor,
  FetchCommentsVisitor,
  FetchLikesVisitor,
  SaveUserAndPostVisitor,
  SaveCommentsAndLikesVisitor,
  SavePostDetailVisitor,
} from "./workflows/post-detail.visitor";
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SaveUserAndPostAst,
  SaveCommentsAndLikesAst,
  SavePostDetailAst,
} from "./workflows/post-detail.ast";
import { WeiboAccountAstVisitor } from "./WeiboAccountAstVisitor";

export interface PostDetailWorkflowConfig {
  maxCommentPages?: number;
  maxLikeUsers?: number;
}

export async function runPostDetailWorkflow() {
  useHandlers([
    WeiboAccountAstVisitor,
    FetchPostDetailVisitor,
    SaveUserAndPostVisitor,
    FetchCommentsVisitor,
    FetchLikesVisitor,
    SaveCommentsAndLikesVisitor,
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
      { postId, metadata, ...config }
    );

    return state;
  };

  return { run };
}

export async function createPostDetailWorkflow(
  _config: PostDetailWorkflowConfig = {}
): Promise<WorkflowWithMetadata> {
  const account = new WeiboAccountAst();
  const fetchDetail = new FetchPostDetailAst();
  const saveUserAndPost = new SaveUserAndPostAst();
  const fetchComments = new FetchCommentsAst();
  const fetchLikes = new FetchLikesAst();
  const saveCommentsAndLikes = new SaveCommentsAndLikesAst();
  const saveDetail = new SavePostDetailAst();

  const workflow = new WorkflowGraphAst()
    .addNode(account)
    .addNode(fetchDetail)
    .addNode(saveUserAndPost)
    .addNode(fetchComments)
    .addNode(fetchLikes)
    .addNode(saveCommentsAndLikes)
    .addNode(saveDetail)

    // Step 1: account -> fetchDetail (提供认证信息)
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
    // Step 2: fetchDetail -> saveUserAndPost (保存用户和帖子)
    .addEdge({
      from: fetchDetail.id,
      to: saveUserAndPost.id,
      fromProperty: 'detail',
      toProperty: 'detail',
    })

    // Step 3: saveUserAndPost -> fetchComments (使用数据库ID爬取评论)
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
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'detail',
      toProperty: 'detail',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchComments.id,
      fromProperty: 'authorWeiboId',
      toProperty: 'authorWeiboId',
    })
    .addEdge({
      from: saveUserAndPost.id,
      to: fetchComments.id,
      fromProperty: 'savedAuthorId',
      toProperty: 'uid',
    })

    // Step 4: saveUserAndPost -> fetchLikes (使用数据库ID爬取点赞)
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
      to: fetchLikes.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })
    .addEdge({
      from: fetchDetail.id,
      to: fetchLikes.id,
      fromProperty: 'detail',
      toProperty: 'detail',
    })

    // Step 5: fetchComments/fetchLikes -> saveCommentsAndLikes (保存评论和点赞)
    .addEdge({
      from: fetchComments.id,
      to: saveCommentsAndLikes.id,
      fromProperty: 'comments',
      toProperty: 'comments',
    })
    .addEdge({
      from: fetchLikes.id,
      to: saveCommentsAndLikes.id,
      fromProperty: 'likes',
      toProperty: 'likes',
    })
    .addEdge({
      from: fetchDetail.id,
      to: saveCommentsAndLikes.id,
      fromProperty: 'postId',
      toProperty: 'postId',
    })

    // Step 6: saveCommentsAndLikes -> saveDetail (发送完成事件)
    .addEdge({
      from: fetchDetail.id,
      to: saveDetail.id,
      fromProperty: 'postId',
      toProperty: 'postId',
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
