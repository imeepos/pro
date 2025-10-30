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

      const requestOptions = node.headers
        ? { headers: node.headers, getLongText: true }
        : { getLongText: true }

      const detail = await this.weiboStatusService.fetchStatusDetail(
        node.postId,
        requestOptions
      )

      node.detail = detail

      if (detail) {
        // 提取 authorWeiboId 并输出（用于后续节点）
        if (detail.user?.idstr || detail.user?.id) {
          node.authorWeiboId = String(detail.user.idstr || detail.user.id)
        } else {
          throw new NoRetryError('帖子数据中缺少作者ID信息')
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 获取帖子详情失败 | postId: ${node.postId} | ${errorMessage}`)
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

      let actualPostId = node.postId

      if (node.detail) {
        if (node.detail.id && typeof node.detail.id === 'number') {
          actualPostId = String(node.detail.id)
        } else if (node.detail.idstr && /^\d+$/.test(node.detail.idstr)) {
          actualPostId = node.detail.idstr
        }
      }

      const actualUid = node.authorWeiboId || node.uid

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
          }
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.comments = []
      node.totalComments = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 获取评论失败 | postId: ${node.postId} | ${errorMessage}`)
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

      const maxUsers = node.maxUsers || 100
      const requestOptions: any = {
        count: Math.min(maxUsers, 100),
        ...(node.headers ? { headers: node.headers } : {}),
      }

      let actualId = node.postId

      if (node.detail) {
        if (node.detail.id && typeof node.detail.id === 'number') {
          actualId = String(node.detail.id)
        } else if (node.detail.idstr && /^\d+$/.test(node.detail.idstr)) {
          actualId = node.detail.idstr
        }
      }

      const response = await this.weiboStatusService.fetchStatusLikes(
        actualId,
        requestOptions
      )

      const likeAttitudes = response.data || []
      node.likes = likeAttitudes.slice(0, maxUsers)
      node.totalLikes = response.total_number || likeAttitudes.length

      // 🔥 立即清洗点赞用户数据并入库
      if (likeAttitudes.length > 0) {
        const users = likeAttitudes
          .map((attitude: any) => normalizeUser(attitude.user))
          .filter((user): user is NonNullable<typeof user> => user !== null)

        if (users.length > 0) {
          await this.persistence.saveUsers(users)
          console.log(`✓ 点赞 | postId: ${node.postId} | 获取: ${node.totalLikes} | 保存用户: ${users.length}`)
        }
      } else {
        console.log(`✓ 点赞 | postId: ${node.postId} | 获取: 0 | 无点赞数据`)
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.likes = []
      node.totalLikes = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 点赞失败 | postId: ${node.postId} | ${errorMessage}`)
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

      // 保存转发关系
      const repostData = normalizeRepost(node.detail)
      if (repostData) {
        await this.repostPersistence.saveReposts([repostData], userMap, postMap)
        console.log(`✓ 转发 | postId: ${normalizedPost.weiboId} | 原帖: ${repostData.originalPostWeiboId}`)
      }

      // 提取并保存提及关系
      const mentions = normalizeMentions(node.detail)
      if (mentions.length > 0) {
        // 仅保存已存在于 userMap 中的提及关系
        const validMentions = mentions.filter(m => userMap.has(m.mentionedWeiboId))

        if (validMentions.length > 0) {
          await this.persistence.saveMentions(validMentions, postMap, userMap)
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 转发失败 | ${errorMessage}`)
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
              console.log(`✓ 点赞记录 | postId: ${node.postId} | 保存: ${savedLikes}`)
            }
          }
        }
      }

      node.savedCommentCount = savedComments
      node.savedLikeCount = savedLikes

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.savedCommentCount = 0
      node.savedLikeCount = 0
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 点赞记录失败 | postId: ${node.postId} | ${errorMessage}`)
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

      await this.rabbitMQService.publish(
        QUEUE_NAMES.POST_DETAIL_COMPLETED,
        postDetailCompletedEvent
      )

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.success = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`✗ 发布完成事件失败 | postId: ${node.postId} | ${errorMessage}`)
    }

    return node
  }
}
