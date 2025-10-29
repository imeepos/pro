import { Injectable } from '@pro/core'
import { Handler } from '@pro/workflow-core'
import { WeiboStatusService } from '@pro/weibo'
import {
  QUEUE_NAMES,
  PostDetailCompletedEvent,
} from '@pro/types'
import { RabbitMQService } from '@pro/rabbitmq'
import {
  normalizeStatus,
  normalizeUser,
  normalizeComments,
  WeiboPersistenceService,
} from '@pro/weibo-persistence'
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
    private readonly weiboStatusService: WeiboStatusService,
    private readonly persistence: WeiboPersistenceService
  ) { }

  async visit(node: FetchPostDetailAst): Promise<FetchPostDetailAst> {
    try {
      node.state = 'running'

      const requestOptions = node.headers
        ? { headers: node.headers, getLongText: true }
        : { getLongText: true }

      const detail = await this.weiboStatusService.fetchStatusDetail(
        node.postId,
        requestOptions
      )

      node.detail = detail
      node.authorId = detail.user?.idstr

      // 清洗入库
      const normalizedStatus = normalizeStatus(detail)
      const normalizedUser = normalizeUser(detail.user)

      const users = normalizedUser ? [normalizedUser] : []
      const posts = normalizedStatus ? [normalizedStatus] : []

      // 处理转发微博
      const retweeted = (detail as any).retweeted_status
      if (retweeted) {
        const retweetedStatus = normalizeStatus(retweeted)
        const retweetedUser = normalizeUser(retweeted.user)
        if (retweetedStatus) posts.push(retweetedStatus)
        if (retweetedUser) users.push(retweetedUser)
      }

      if (users.length > 0) {
        const userMap = await this.persistence.saveUsers(users)
        if (posts.length > 0) {
          await this.persistence.savePosts(posts, userMap)
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
    }

    return node
  }
}

@Injectable()
export class FetchCommentsVisitor {
  constructor(
    private readonly weiboStatusService: WeiboStatusService,
    private readonly persistence: WeiboPersistenceService
  ) { }
  @Handler(FetchCommentsAst)
  async visit(node: FetchCommentsAst): Promise<FetchCommentsAst> {
    try {
      node.state = 'running'

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
          }
        }
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.comments = []
      node.totalComments = 0
    }

    return node
  }
}

@Injectable()
export class FetchLikesVisitor {

  constructor(private readonly weiboStatusService: WeiboStatusService) { }
  @Handler(FetchLikesAst)
  async visit(node: FetchLikesAst): Promise<FetchLikesAst> {
    try {
      node.state = 'running'

      const maxUsers = node.maxUsers || 100
      const requestOptions: any = {
        count: Math.min(maxUsers, 100),
        ...(node.headers ? { headers: node.headers } : {}),
      }

      const response = await this.weiboStatusService.fetchStatusLikes(
        node.postId,
        requestOptions
      )

      const likeAttitudes = response.data || []
      node.likes = likeAttitudes.slice(0, maxUsers)
      node.totalLikes = response.total_number || likeAttitudes.length

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.likes = []
      node.totalLikes = 0
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
    }

    return node
  }
}
