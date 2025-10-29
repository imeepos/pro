import { Injectable, Inject } from '@pro/core'
import { Handler } from '@pro/workflow-core'
import { WeiboProfileService } from '@pro/weibo'
import { WeiboPersistenceServiceAdapter as WeiboPersistenceService } from '../services/weibo-persistence.adapter'
import { normalizeUser } from '@pro/weibo-persistence'
import {
  UserCheckAst,
  UserFetchAst,
} from './post-detail.ast'

@Injectable()
export class UserCheckVisitor {
  constructor(@Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService) {}

  @Handler(UserCheckAst)
  async visit(node: UserCheckAst): Promise<UserCheckAst> {
    try {
      node.state = 'running'

      console.log(`[UserCheckVisitor] Checking user existence for authorWeiboId: ${node.authorWeiboId}`)

      // 检查用户是否存在于数据库中
      const existingUser = await this.persistence.findUserByWeiboId(node.authorWeiboId)

      if (existingUser) {
        node.authorId = existingUser.id
        node.needFetch = false
        console.log(`[UserCheckVisitor] User found in database with ID: ${existingUser.id}`)
      } else {
        node.needFetch = true
        console.log(`[UserCheckVisitor] User not found in database, need to fetch`)
      }

      // 确保 authorWeiboId 传递给下一个节点
      // UserCheckAst 不修改这个值，只是传递下去

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      node.needFetch = false
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[UserCheckVisitor] Failed to check user ${node.authorWeiboId}:`, errorMessage)
      console.error(`[UserCheckVisitor] Error details:`, error)
    }

    return node
  }
}

@Injectable()
export class UserFetchVisitor {
  constructor(
    @Inject(WeiboProfileService) private readonly weiboProfileService: WeiboProfileService,
    @Inject(WeiboPersistenceService) private readonly persistence: WeiboPersistenceService
  ) {}

  @Handler(UserFetchAst)
  async visit(node: UserFetchAst): Promise<UserFetchAst> {
    try {
      node.state = 'running'

      console.log(`[UserFetchVisitor] Fetching user details for authorWeiboId: ${node.authorWeiboId}`)

      // 调用微博API获取用户完整信息
      const requestOptions = node.headers ? { headers: node.headers } : {}
      const profileResponse = await this.weiboProfileService.fetchProfileInfo(
        node.authorWeiboId,
        requestOptions
      )

      if (!profileResponse.data?.user) {
        throw new Error(`Failed to fetch user profile for ${node.authorWeiboId}`)
      }

      // 清洗用户数据
      const normalizedUser = normalizeUser(profileResponse.data.user)
      if (!normalizedUser) {
        throw new Error(`Failed to normalize user data for ${node.authorWeiboId}`)
      }

      console.log(`[UserFetchVisitor] User profile fetched and normalized successfully`)

      // 保存用户到数据库
      const userMap = await this.persistence.saveUsers([normalizedUser])
      const savedUser = userMap.get(node.authorWeiboId)

      if (savedUser) {
        node.authorId = savedUser.id
        console.log(`[UserFetchVisitor] User saved to database with ID: ${savedUser.id}`)
      } else {
        throw new Error(`Failed to save user ${node.authorWeiboId} to database`)
      }

      node.state = 'success'
    } catch (error) {
      node.state = 'fail'
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[UserFetchVisitor] Failed to fetch user ${node.authorWeiboId}:`, errorMessage)
      console.error(`[UserFetchVisitor] Error details:`, error)
    }

    return node
  }
}