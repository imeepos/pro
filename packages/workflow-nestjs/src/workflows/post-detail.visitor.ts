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
  normalizeStatus,
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
    @Inject(WeiboStatusService) private readonly weiboStatusService: WeiboStatusService,
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService
  ) { }

  async visit(node: FetchPostDetailAst): Promise<FetchPostDetailAst> {
    try {
      node.state = 'running'

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

        // 🔥 立即清洗帖子数据并入库
        const normalizedPost = normalizeStatus(detail)
        if (normalizedPost) {
          // 提取帖子作者和转发帖子的作者
          const users = []
          const postAuthor = normalizeUser(detail.user)
          if (postAuthor) users.push(postAuthor)

          // 如果是转发，提取原帖作者
          const detailRecord = detail as any
          if (detailRecord.retweeted_status?.user) {
            const retweetAuthor = normalizeUser(detailRecord.retweeted_status.user)
            if (retweetAuthor) users.push(retweetAuthor)
          }

          if (users.length > 0) {
            const userMap = await this.persistence.saveUsers(users)
            const postMap = await this.persistence.savePosts([normalizedPost], userMap)
            console.log(`[FetchPostDetailVisitor] Post saved to database immediately, post count: ${postMap.size}`)
          }
        }
      } else {
        console.warn(`[FetchPostDetailVisitor] Detail is null or undefined`)
      }

      console.log(`[FetchPostDetailVisitor] PostId available for next nodes: ${node.postId}`)
      console.log(`[FetchPostDetailVisitor] AuthorId from workflow: ${node.authorId}`)

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

      console.log(`[FetchCommentsVisitor] Processing postId: ${node.postId}, uid: ${node.uid}, authorWeiboId: ${node.authorWeiboId}`)

      // 1. ID转换：获取数值型帖子ID
      let actualPostId = node.postId

      // 检查是否有帖子详情数据可用，从中提取正确的数值型ID
      if (node.detail) {
        if (node.detail.id && typeof node.detail.id === 'number') {
          actualPostId = String(node.detail.id)
          console.log(`[FetchCommentsVisitor] Using numeric ID from detail: ${actualPostId}`)
        } else if (node.detail.idstr && /^\d+$/.test(node.detail.idstr)) {
          actualPostId = node.detail.idstr
          console.log(`[FetchCommentsVisitor] Using numeric idstr from detail: ${actualPostId}`)
        } else {
          console.warn(`[FetchCommentsVisitor] No valid numeric ID found in detail`)
          console.log(`[FetchCommentsVisitor] Detail ID types:`, {
            id: typeof node.detail.id,
            idValue: node.detail.id,
            idstr: typeof node.detail.idstr,
            idstrValue: node.detail.idstr,
            mid: typeof node.detail.mid,
            midValue: node.detail.mid,
            mblogid: typeof node.detail.mblogid,
            mblogidValue: node.detail.mblogid
          })
        }
      } else {
        console.log(`[FetchCommentsVisitor] No detail available, using original postId: ${actualPostId}`)
      }

      // 2. UID修复：使用发帖人的微博ID，而不是数据库ID
      const actualUid = node.authorWeiboId || node.uid
      console.log(`[FetchCommentsVisitor] Using authorWeiboId as uid: ${actualUid}`)
      console.log(`[FetchCommentsVisitor] Final API params - postId: ${actualPostId}, uid: ${actualUid}`)

      const maxPages = node.maxPages || 5
      const allComments: any[] = []
      let currentMaxId: number | undefined

      for (let page = 0; page < maxPages; page++) {
        const requestOptions: any = {
          id: actualPostId,  // 🔑 使用正确的数值型帖子ID
          uid: actualUid,    // 🔑 使用正确的发帖人微博ID
          count: 20,
          fetch_level: 0,
          flow: 1,
          is_reload: 1,
          is_mix: 0,
          is_show_bulletin: 2,
          locale: 'zh-CN',
          ...(currentMaxId ? { max_id: currentMaxId } : {}),
          ...(node.headers ? { headers: node.headers } : {}),
        }

        console.log(`[FetchCommentsVisitor] Fetching page ${page + 1}/${maxPages} with params:`, {
          id: actualPostId,
          uid: actualUid,
          count: 20,
          ...(currentMaxId ? { max_id: currentMaxId } : {})
        })

        const response = await this.weiboStatusService.fetchStatusComments(
          actualPostId,
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
        // 🔑 使用转换后的数值型ID作为帖子ID，而不是原始postId
        const normalizedComments = normalizeComments(allComments, actualPostId)
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
          // 🔑 使用转换后的数值型ID查询数据库，而不是原始postId
          const post = await this.persistence.ensurePostByWeiboId(actualPostId)
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

  constructor(
    @Inject(WeiboStatusService) private readonly weiboStatusService: WeiboStatusService,
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService
  ) { }
  @Handler(FetchLikesAst)
  async visit(node: FetchLikesAst): Promise<FetchLikesAst> {
    try {
      node.state = 'running'

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

      if (node.detail) {
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

      // 🔥 立即清洗点赞用户数据并入库
      if (likeAttitudes.length > 0) {
        const users = likeAttitudes
          .map((attitude: any) => normalizeUser(attitude.user))
          .filter((user): user is NonNullable<typeof user> => user !== null)

        if (users.length > 0) {
          await this.persistence.saveUsers(users)
          console.log(`[FetchLikesVisitor] Saved ${users.length} like users to database immediately`)
        }
      }

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
    @Inject(RabbitMQService) private readonly rabbitMQService: RabbitMQService
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
