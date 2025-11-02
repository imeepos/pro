import type { EntityManager } from 'typeorm'
import { In, MoreThanOrEqual } from 'typeorm'
import {
  WeiboCommentEntity,
  WeiboHashtagEntity,
  WeiboInteractionEntity,
  WeiboLikeEntity,
  WeiboPostEntity,
  WeiboPostHashtagEntity,
  WeiboPostMentionEntity,
  WeiboRepostEntity,
  WeiboUserEntity,
} from '@pro/entities'
import { GraphAssemblyInput } from '../graph-builder/graph-assembler.js'

export interface GraphExtractionWindow {
  since?: Date
  until?: Date
  userIds?: string[]
  postLimit?: number
  userLimit?: number
  hashtagLimit?: number
}

export class PostgresGraphSource {
  private readonly manager: EntityManager

  constructor(manager: EntityManager) {
    this.manager = manager
  }

  async loadGraphSlice(window: GraphExtractionWindow = {}): Promise<GraphAssemblyInput> {
    const evaluationTime = window.until ?? new Date()
    const [users, posts, hashtags] = await Promise.all([
      this.fetchUsers(window),
      this.fetchPosts(window),
      this.fetchHashtags(window),
    ])

    const postIds = posts.map((post) => post.id)

    const [mentions, postHashtags, likes, interactions, reposts, comments] = await Promise.all([
      this.manager.find(WeiboPostMentionEntity, {
        where: postIds.length > 0 ? { postId: In(postIds) } : undefined,
      }),
      this.manager.find(WeiboPostHashtagEntity, {
        where: postIds.length > 0 ? { postId: In(postIds) } : undefined,
      }),
      this.fetchLikes(window, postIds),
      this.fetchInteractions(window, postIds),
      this.fetchReposts(window, postIds),
      this.fetchComments(window, postIds),
    ])

    return {
      users,
      posts,
      hashtags,
      mentions,
      postHashtags,
      likes,
      interactions,
      reposts,
      comments,
      evaluationTime,
    }
  }

  private async fetchUsers(window: GraphExtractionWindow): Promise<WeiboUserEntity[]> {
    const where = window.userIds?.length ? { id: In(window.userIds) } : undefined
    return this.manager.find(WeiboUserEntity, {
      where,
      take: window.userLimit ?? 2000,
      order: { id: 'ASC' },
    })
  }

  private async fetchPosts(window: GraphExtractionWindow): Promise<WeiboPostEntity[]> {
    return this.manager.find(WeiboPostEntity, {
      take: window.postLimit ?? 4000,
      order: { id: 'DESC' },
    })
  }

  private async fetchHashtags(window: GraphExtractionWindow): Promise<WeiboHashtagEntity[]> {
    return this.manager.find(WeiboHashtagEntity, {
      take: window.hashtagLimit ?? 1000,
      order: { ingestedAt: 'DESC' },
    })
  }

  private async fetchLikes(
    window: GraphExtractionWindow,
    postIds: string[],
  ): Promise<WeiboLikeEntity[]> {
    const where = window.since
      ? {
          createdAt: MoreThanOrEqual(window.since),
          ...(postIds.length ? { targetWeiboId: In(postIds) } : {}),
        }
      : postIds.length
        ? { targetWeiboId: In(postIds) }
        : {}

    return this.manager.find(WeiboLikeEntity, {
      where,
      order: { createdAt: 'ASC' } as any,
    })
  }

  private async fetchInteractions(
    window: GraphExtractionWindow,
    postIds: string[],
  ): Promise<WeiboInteractionEntity[]> {
    const where = window.since
      ? {
          createdAt: MoreThanOrEqual(window.since),
          ...(postIds.length ? { targetWeiboId: In(postIds) } : {}),
        }
      : postIds.length
        ? { targetWeiboId: In(postIds) }
        : {}

    return this.manager.find(WeiboInteractionEntity, {
      where,
      order: { createdAt: 'ASC' } as any,
      take: window.postLimit ? window.postLimit * 10 : undefined,
    })
  }

  private async fetchReposts(
    window: GraphExtractionWindow,
    postIds: string[],
  ): Promise<WeiboRepostEntity[]> {
    const where = window.since
      ? {
          created_at: MoreThanOrEqual(window.since),
          ...(postIds.length ? { mblogid: In(postIds) } : {}),
        }
      : postIds.length
        ? { mblogid: In(postIds) }
        : {}

    return this.manager.find(WeiboRepostEntity, {
      where,
      order: { created_at: 'ASC' } as any,
    })
  }

  private async fetchComments(
    window: GraphExtractionWindow,
    postIds: string[],
  ): Promise<WeiboCommentEntity[]> {
    if (!postIds.length) {
      return this.manager.find(WeiboCommentEntity, {
        take: window.postLimit ? window.postLimit * 2 : 2000,
        order: { id: 'DESC' } as any,
      })
    }

    return this.manager.find(WeiboCommentEntity, {
      where: { rootid: In(postIds.map((id) => Number(id))) },
      order: { id: 'DESC' } as any,
    })
  }
}
