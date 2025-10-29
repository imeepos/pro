import { Inject, Injectable } from '@pro/core'
import { Handler } from '@pro/workflow-core'
import { WeiboStatusService } from '@pro/weibo'
import {
  QUEUE_NAMES,
  PostDetailCompletedEvent,
} from '@pro/types'
import { RabbitMQService } from '@pro/rabbitmq'
import {
  normalizeComments,
  normalizeUser,
} from '@pro/weibo-persistence'
import { WeiboPersistenceServiceAdapter as WeiboPersistenceService } from '../services/weibo-persistence.adapter'
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SavePostDetailAst,
} from './post-detail.ast'

@Handler(FetchPostDetailAst)
@Injectable()
export class FetchPostDetailVisitor {
  constructor(
    @Inject(WeiboStatusService) private readonly weiboStatusService: WeiboStatusService
  ) { }

  async visit(node: FetchPostDetailAst): Promise<FetchPostDetailAst> {
    try {
      node.state = 'running'

      // 验证postId
      if (!node.postId) {
        throw new Error('postId is required but not provided')
      }

      console.log(`[FetchPostDetailVisitor] Processing postId: ${node.postId}`)

      const requestOptions = node.headers
        ? { headers: node.headers, getLongText: true }
        : { getLongText: true }

      const detail = await this.weiboStatusService.fetchStatusDetail(
        node.postId,
        requestOptions
      )

      node.detail = detail

      // 调试日志：验证 detail 数据结构
      if (detail) {
        console.log(`[FetchPostDetailVisitor] Detail fetched successfully`)
        console.log(`[FetchPostDetailVisitor] Detail ID types:`, {
          id: typeof detail.id,
          idValue: detail.id,
          idstr: typeof detail.idstr,
          idstrValue: detail.idstr,
          mid: typeof detail.mid,
          midValue: detail.mid,
          mblogid: typeof detail.mblogid,
          mblogidValue: detail.mblogid
        })
      } else {
        console.warn(`[FetchPostDetailVisitor] Detail is null or undefined`)
      }
      // authorId现在从workflow边连接获取，不需要从详情中提取
      console.log(`[FetchPostDetailVisitor] PostId available for next nodes: ${node.postId}`)
      console.log(`[FetchPostDetailVisitor] AuthorId from workflow: ${node.authorId}`)

      // 现在用户处理已经分离到专门的节点，这里只处理帖子详情
      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[FetchPostDetailVisitor] Failed to fetch post ${node.postId}:`, errorMessage)
      console.error(`[FetchPostDetailVisitor] Error details:`, error)
    }

    return node
  }
}

@Injectable()
export class FetchCommentsVisitor {
  constructor(
    @Inject(WeiboStatusService) private readonly weiboStatusService: WeiboStatusService,
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService
  ) { }
  @Handler(FetchCommentsAst)
  async visit(node: FetchCommentsAst): Promise<FetchCommentsAst> {
    try {
      node.state = 'running'

      console.log(`[FetchCommentsVisitor] Processing postId: ${node.postId}, uid: ${node.uid}`)

      const maxPages = node.maxPages || 5
      const allComments: any[] = []
      let currentMaxId: number | undefined

      for (let page = 0; page < maxPages; page++) {
        const requestOptions: any = {
          uid: node.uid,
          count: 20,
          ...(currentMaxId ? { maxId: currentMaxId } : {}),
          ...(node.headers ? { headers: node.headers } : {}),
        }

        const response = await this.weiboStatusService.fetchStatusComments(
          node.postId,
          requestOptions
        )

        if (response.data && response.data.length > 0) {
          allComments.push(...response.data)
          currentMaxId = response.max_id

          if (!currentMaxId || currentMaxId === 0) {
            break
          }
        } else {
          break
        }
      }

      node.comments = allComments
      node.totalComments = allComments.length

      if (allComments.length === 0) {
        console.log(`[FetchCommentsVisitor] No comments found for postId: ${node.postId}`)
      } else {
        console.log(`[FetchCommentsVisitor] Fetched ${allComments.length} comments`)
      }

      // 清洗入库
      if (allComments.length > 0) {
        const normalizedComments = normalizeComments(allComments, node.postId)
        const users: any[] = []

        // 收集评论用户
        const collectUsers = (comments: any[]): void => {
          for (const comment of comments) {
            const author = normalizeUser(comment.user)
            if (author) users.push(author)
            if (comment.reply_comment) {
              const replyAuthor = normalizeUser(comment.reply_comment.user)
              if (replyAuthor) users.push(replyAuthor)
            }
            if (Array.isArray(comment.comments)) {
              collectUsers(comment.comments)
            }
          }
        }
        collectUsers(allComments)

        if (users.length > 0) {
          const userMap = await this.persistence.saveUsers(users)
          const post = await this.persistence.ensurePostByWeiboId(node.postId)
          if (post && normalizedComments.length > 0) {
            await this.persistence.saveComments(normalizedComments, userMap, post)
            console.log(`[FetchCommentsVisitor] Saved ${normalizedComments.length} comments to database`)
          }
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.comments = []
      node.totalComments = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[FetchCommentsVisitor] Failed to fetch comments for postId: ${node.postId}:`, errorMessage)
      console.error(`[FetchCommentsVisitor] Error details:`, error)
    }

    return node
  }
}

@Injectable()
export class FetchLikesVisitor {

  constructor(@Inject(WeiboStatusService) private readonly weiboStatusService: WeiboStatusService) { }
  @Handler(FetchLikesAst)
  async visit(node: FetchLikesAst): Promise<FetchLikesAst> {
    try {
      node.state = 'running'

      // 验证postId
      if (!node.postId) {
        throw new Error('postId is required but not provided')
      }

      console.log(`[FetchLikesVisitor] Processing postId: ${node.postId}`)

      const maxUsers = node.maxUsers || 100
      const requestOptions: any = {
        count: Math.min(maxUsers, 100),
        ...(node.headers ? { headers: node.headers } : {}),
      }

      let actualId = node.postId

      // 检查是否有帖子详情数据可用，从中提取正确的数值型ID
      if (node.detail) {
        // 微博点赞API需要数值型id，而不是字符串型的mid或mblogid
        if (node.detail.id && typeof node.detail.id === 'number') {
          actualId = String(node.detail.id)
          console.log(`[FetchLikesVisitor] Using numeric ID from detail: ${actualId}`)
        } else if (node.detail.idstr && /^\d+$/.test(node.detail.idstr)) {
          actualId = node.detail.idstr
          console.log(`[FetchLikesVisitor] Using numeric idstr from detail: ${actualId}`)
        } else {
          console.warn(`[FetchLikesVisitor] No valid numeric ID found in detail, falling back to original postId`)
        }
      } else {
        console.log(`[FetchLikesVisitor] No detail available, using original postId: ${actualId}`)
      }

      console.log(`[FetchLikesVisitor] Final ID for likes API: ${actualId}`)
      console.log(`[FetchLikesVisitor] Starting API call with options:`, JSON.stringify(requestOptions, null, 2))

      const startTime = Date.now()
      console.log(`[FetchLikesVisitor] API call started at: ${new Date().toISOString()}`)

      const response = await this.weiboStatusService.fetchStatusLikes(
        actualId,
        requestOptions
      )

      const endTime = Date.now()
      const duration = endTime - startTime
      console.log(`[FetchLikesVisitor] API call completed at: ${new Date().toISOString()}, duration: ${duration}ms`)

      console.log(`[FetchLikesVisitor] API response structure:`, {
        hasData: !!response.data,
        dataLength: response.data?.length || 0,
        totalNumber: response.total_number,
        responseKeys: Object.keys(response)
      })

      const likeAttitudes = response.data || []
      node.likes = likeAttitudes.slice(0, maxUsers)
      node.totalLikes = response.total_number || likeAttitudes.length

      console.log(`[FetchLikesVisitor] Processed ${node.likes.length} likes out of ${node.totalLikes} total`)
      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.likes = []
      node.totalLikes = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[FetchLikesVisitor] Failed to fetch likes for post ${node.postId}:`, errorMessage)
      console.error(`[FetchLikesVisitor] Error details:`, error)
    }

    return node
  }
}

@Handler(SavePostDetailAst)
@Injectable()
export class SavePostDetailVisitor {
  constructor(
    private readonly rabbitMQService: RabbitMQService
  ) { }

  async visit(node: SavePostDetailAst): Promise<SavePostDetailAst> {
    try {
      node.state = 'running'

      console.log(`[SavePostDetailVisitor] Starting to save post detail for postId: ${node.postId}`)
      console.log(`[SavePostDetailVisitor] Node data summary:`, {
        hasDetail: !!node.detail,
        commentCount: node.comments?.length || 0,
        likeCount: node.likes?.length || 0,
        metadataKeys: node.metadata ? Object.keys(node.metadata) : []
      })

      node.success = true

      const postDetailCompletedEvent: PostDetailCompletedEvent = {
        postId: node.postId,
        authorId: node.detail?.user?.idstr,
        rawDataId: '',
        metadata: {
          keyword: node.metadata?.keyword,
          taskId: node.metadata?.taskId,
          commentCount: node.comments?.length || 0,
          likeCount: node.likes?.length || 0,
        },
        createdAt: new Date().toISOString(),
      }

      console.log(`[SavePostDetailVisitor] Publishing event to queue: ${QUEUE_NAMES.POST_DETAIL_COMPLETED}`)
      console.log(`[SavePostDetailVisitor] Event data:`, JSON.stringify(postDetailCompletedEvent, null, 2))

      const startTime = Date.now()
      await this.rabbitMQService.publish(
        QUEUE_NAMES.POST_DETAIL_COMPLETED,
        postDetailCompletedEvent
      )
      const duration = Date.now() - startTime
      console.log(`[SavePostDetailVisitor] Event published successfully, duration: ${duration}ms`)

      node.state = 'success'
      console.log(`[SavePostDetailVisitor] Post detail saved successfully for postId: ${node.postId}`)
    } catch (error) {
      node.state = 'fail'
      node.success = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[SavePostDetailVisitor] Failed to save post detail for postId: ${node.postId}:`, errorMessage)
      console.error(`[SavePostDetailVisitor] Error details:`, error)
    }

    return node
  }
}
