import { Injectable } from '@pro/core'
import { Handler } from '@pro/workflow-core'
import { WeiboStatusService } from '@pro/weibo'
import { RawDataSourceService } from '@pro/mongodb'
import {
  SourceType,
  SourcePlatform,
  QUEUE_NAMES,
  RawDataReadyEvent,
  PostDetailCompletedEvent,
} from '@pro/types'
import { RabbitMQService } from '@pro/rabbitmq'
import { createHash } from 'crypto'
import {
  FetchPostDetailAst,
  FetchCommentsAst,
  FetchLikesAst,
  SavePostDetailAst,
} from './post-detail.ast'

@Handler(FetchPostDetailAst)
@Injectable()
export class FetchPostDetailVisitor {
  constructor(private readonly weiboStatusService: WeiboStatusService) { }

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

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
    }

    return node
  }
}

@Injectable()
export class FetchCommentsVisitor {
  constructor(private readonly weiboStatusService: WeiboStatusService) { }
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
    private readonly rawDataSourceService: RawDataSourceService,
    private readonly rabbitMQService: RabbitMQService
  ) { }

  async visit(node: SavePostDetailAst): Promise<SavePostDetailAst> {
    try {
      node.state = 'running'

      const rawContent = JSON.stringify({
        detail: node.detail,
        comments: node.comments,
        likes: node.likes,
      })

      const sourceUrl = `https://weibo.com/detail/${node.postId}`
      const contentHash = createHash('md5').update(rawContent).digest('hex')

      const doc = await this.rawDataSourceService.create({
        sourceType: SourceType.WEIBO_DETAIL,
        sourceUrl,
        rawContent,
        metadata: {
          postId: node.postId,
          commentCount: node.comments?.length || 0,
          likeCount: node.likes?.length || 0,
          ...node.metadata,
        },
      })

      node.rawDataId = String(doc._id)
      node.success = true

      const rawDataReadyEvent: RawDataReadyEvent = {
        rawDataId: node.rawDataId,
        sourceType: SourceType.WEIBO_DETAIL,
        sourcePlatform: SourcePlatform.WEIBO,
        sourceUrl,
        contentHash,
        metadata: {
          taskId: node.metadata?.taskId,
          keyword: node.metadata?.keyword,
          fileSize: Buffer.byteLength(rawContent, 'utf-8'),
        },
        createdAt: new Date().toISOString(),
      }

      await this.rabbitMQService.publish(
        QUEUE_NAMES.RAW_DATA_READY,
        rawDataReadyEvent
      )

      const postDetailCompletedEvent: PostDetailCompletedEvent = {
        postId: node.postId,
        authorId: node.detail?.user?.idstr,
        rawDataId: node.rawDataId,
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
