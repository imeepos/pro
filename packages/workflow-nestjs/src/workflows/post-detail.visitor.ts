import { Inject, Injectable } from '@pro/core'
import { Handler, NoRetryError } from '@pro/workflow-core'
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
  normalizeRepost,
  normalizeMentions,
  NormalizedWeiboLike,
} from '@pro/weibo-persistence'
import { WeiboPersistenceServiceAdapter as WeiboPersistenceService } from '../services/weibo-persistence.adapter'
import { WeiboLikePersistenceService } from '../services/weibo-like-persistence.service'
import { WeiboRepostPersistenceService } from '../services/weibo-repost-persistence.service'
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SaveUserAndPostAst,
  SaveCommentsAndLikesAst,
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

      if (!node.postId) {
        throw new NoRetryError('FetchPostDetailAst: postId 参数为空')
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

        // 提取 authorWeiboId 并输出（用于后续节点）
        if (detail.user?.idstr || detail.user?.id) {
          node.authorWeiboId = String(detail.user.idstr || detail.user.id)
          console.log(`[FetchPostDetailVisitor] Extracted authorWeiboId: ${node.authorWeiboId}`)
        } else {
          throw new NoRetryError('帖子数据中缺少作者ID信息')
        }

        // 数据已获取，保存工作交给下游节点处理
        console.log(`[FetchPostDetailVisitor] PostId ${node.postId} data ready for downstream processing`)
      } else {
        console.warn(`[FetchPostDetailVisitor] Detail is null or undefined`)
      }

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

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  @Handler(FetchCommentsAst)
  async visit(node: FetchCommentsAst): Promise<FetchCommentsAst> {
    try {
      node.state = 'running'

      console.log(`[FetchCommentsVisitor] Processing postId: ${node.postId}, uid: ${node.uid}, authorWeiboId: ${node.authorWeiboId}`)

      let actualPostId = node.postId

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

      const actualUid = node.authorWeiboId || node.uid
      console.log(`[FetchCommentsVisitor] Using authorWeiboId as uid: ${actualUid}`)
      console.log(`[FetchCommentsVisitor] Final API params - postId: ${actualPostId}, uid: ${actualUid}`)

      const maxPages = node.maxPages || 5
      const allComments: any[] = []
      let currentMaxId: number | undefined

      for (let page = 0; page < maxPages; page++) {
        const requestOptions: any = {
          id: actualPostId,
          uid: actualUid,
          count: 20,
          fetch_level: 0,
          flow: 1,
          is_reload: 1,
          is_mix: 0,
          is_show_bulletin: 2,
          locale: 'zh-CN',
          timeout: 30000,
          ...(currentMaxId ? { max_id: currentMaxId } : {}),
          ...(node.headers ? { headers: node.headers } : {}),
        }

        console.log(`[FetchCommentsVisitor] Fetching page ${page + 1}/${maxPages} with params:`, {
          id: actualPostId,
          uid: actualUid,
          count: 20,
          ...(currentMaxId ? { max_id: currentMaxId } : {})
        })

        const response = await this.fetchCommentsWithRetry(actualPostId, requestOptions)

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

      if (allComments.length > 0) {
        const normalizedComments = normalizeComments(allComments, actualPostId)
        const users: any[] = []

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

  private async fetchCommentsWithRetry(
    postId: string,
    options: any,
    maxRetries = 3
  ): Promise<any> {
    let lastError: any

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.weiboStatusService.fetchStatusComments(postId, options)
      } catch (error: any) {
        lastError = error

        if (error?.isRetryable && attempt < maxRetries - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.warn(
            `[FetchCommentsVisitor] Retryable error (${error.status}), ` +
            `attempt ${attempt + 1}/${maxRetries}, ` +
            `retrying in ${backoffMs}ms...`
          )
          await this.sleep(backoffMs)
          continue
        }

        throw error
      }
    }

    throw lastError
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
        throw new NoRetryError('FetchLikesAst: postId 参数为空')
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

@Handler(SaveUserAndPostAst)
@Injectable()
export class SaveUserAndPostVisitor {
  constructor(
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService,
    @Inject(WeiboRepostPersistenceService) private readonly repostPersistence: WeiboRepostPersistenceService
  ) {}

  async visit(node: SaveUserAndPostAst): Promise<SaveUserAndPostAst> {
    try {
      node.state = 'running'

      console.log(`[SaveUserAndPostVisitor] Starting to save user and post`)

      if (!node.detail) {
        throw new NoRetryError('SaveUserAndPostAst: detail 数据为空')
      }

      // 提取并清洗帖子数据
      const normalizedPost = normalizeStatus(node.detail)
      if (!normalizedPost) {
        throw new NoRetryError('帖子数据格式无效，无法标准化')
      }

      // 提取帖子作者和转发帖子的作者
      const users = []
      const posts = [normalizedPost]
      const postAuthor = normalizeUser(node.detail.user)
      if (postAuthor) users.push(postAuthor)

      // 如果是转发，提取原帖和原帖作者
      const detailRecord = node.detail as any
      let retweetedPost = null
      if (detailRecord.retweeted_status) {
        const retweetAuthor = normalizeUser(detailRecord.retweeted_status.user)
        if (retweetAuthor) users.push(retweetAuthor)

        retweetedPost = normalizeStatus(detailRecord.retweeted_status)
        if (retweetedPost) posts.push(retweetedPost)
      }

      if (users.length === 0) {
        throw new NoRetryError('帖子数据中缺少有效的用户信息')
      }

      // 在同一事务中保存用户和帖子（包括转发的原帖）
      const { userMap, postMap } = await this.persistence.saveUsersAndPosts(users, posts)

      const savedAuthor = userMap.get(normalizedPost.authorWeiboId)
      const savedPost = postMap.get(normalizedPost.weiboId)

      if (!savedAuthor?.id) {
        throw new NoRetryError(`保存作者失败: ${normalizedPost.authorWeiboId}`)
      }

      if (!savedPost?.id) {
        throw new NoRetryError(`保存帖子失败: ${normalizedPost.weiboId}`)
      }

      node.savedAuthorId = savedAuthor.id
      node.savedPostId = savedPost.id

      console.log(`[SaveUserAndPostVisitor] Successfully saved - authorId: ${node.savedAuthorId}, postId: ${node.savedPostId}`)

      // 保存转发关系
      const repostData = normalizeRepost(node.detail)
      if (repostData) {
        await this.repostPersistence.saveReposts([repostData], userMap, postMap)
        console.log(`[SaveUserAndPostVisitor] Saved repost relationship`)
      }

      // 提取并保存提及关系
      const mentions = normalizeMentions(node.detail)
      if (mentions.length > 0) {
        // 仅保存已存在于 userMap 中的提及关系
        const validMentions = mentions.filter(m => userMap.has(m.mentionedWeiboId))

        if (validMentions.length > 0) {
          await this.persistence.saveMentions(validMentions, postMap, userMap)
          console.log(`[SaveUserAndPostVisitor] Saved ${validMentions.length} mention relationships`)
        }

        if (validMentions.length < mentions.length) {
          console.log(`[SaveUserAndPostVisitor] Skipped ${mentions.length - validMentions.length} mentions (users not in database)`)
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[SaveUserAndPostVisitor] Failed to save user and post:`, errorMessage)
      console.error(`[SaveUserAndPostVisitor] Error details:`, error)
    }

    return node
  }
}

@Handler(SaveCommentsAndLikesAst)
@Injectable()
export class SaveCommentsAndLikesVisitor {
  constructor(
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService,
    @Inject(WeiboLikePersistenceService) private readonly likePersistence: WeiboLikePersistenceService
  ) {}

  async visit(node: SaveCommentsAndLikesAst): Promise<SaveCommentsAndLikesAst> {
    try {
      node.state = 'running'

      console.log(`[SaveCommentsAndLikesVisitor] Starting to save comments and likes for post ${node.postId}`)

      let savedComments = 0
      let savedLikes = 0

      // 保存评论
      if (node.comments && node.comments.length > 0) {
        const normalizedComments = normalizeComments(node.comments, node.postId)
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
        collectUsers(node.comments)

        if (users.length > 0) {
          const userMap = await this.persistence.saveUsers(users)
          const post = await this.persistence.ensurePostByMid(node.postId)
          if (post && normalizedComments.length > 0) {
            await this.persistence.saveComments(normalizedComments, userMap, post)
            savedComments = normalizedComments.length
            console.log(`[SaveCommentsAndLikesVisitor] Saved ${savedComments} comments`)
          }
        }
      }

      // 保存点赞用户和点赞记录
      if (node.likes && node.likes.length > 0) {
        const users = node.likes
          .map((attitude: any) => normalizeUser(attitude.user))
          .filter((user): user is NonNullable<typeof user> => user !== null)

        if (users.length > 0) {
          const userMap = await this.persistence.saveUsers(users)
          const post = await this.persistence.ensurePostByMid(node.postId)

          if (post) {
            const likes: NormalizedWeiboLike[] = node.likes
              .filter((attitude: any) => attitude.user?.id && userMap.has(String(attitude.user.id)))
              .map((attitude: any) => ({
                userWeiboId: String(attitude.user.id),
                targetWeiboId: post.weiboId,
                createdAt: attitude.created_at ? new Date(attitude.created_at) : new Date(),
              }))

            if (likes.length > 0) {
              await this.likePersistence.saveLikes(likes, userMap, post)
              savedLikes = likes.length
              console.log(`[SaveCommentsAndLikesVisitor] Saved ${savedLikes} likes to database`)
            }
          } else {
            console.warn(`[SaveCommentsAndLikesVisitor] Post not found for postId: ${node.postId}`)
          }
        }
      }

      node.savedCommentCount = savedComments
      node.savedLikeCount = savedLikes

      console.log(`[SaveCommentsAndLikesVisitor] Successfully saved - comments: ${savedComments}, likes: ${savedLikes}`)

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.savedCommentCount = 0
      node.savedLikeCount = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[SaveCommentsAndLikesVisitor] Failed to save comments and likes:`, errorMessage)
      console.error(`[SaveCommentsAndLikesVisitor] Error details:`, error)
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
