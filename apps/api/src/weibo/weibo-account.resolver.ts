import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver, ObjectType, Field } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { WeiboAccountService } from './weibo-account.service';
import { WeiboHealthCheckService } from './weibo-health-check.service';
import { WeiboAccountConnection, WeiboAccountModel, mapWeiboAccountEntityToModel } from './models/weibo-account.model';
import { WeiboAccountFilterDto } from './dto/weibo-account.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

@Resolver(() => WeiboAccountModel)
@UseGuards(CompositeAuthGuard)
export class WeiboAccountResolver {
  constructor(
    private readonly weiboAccountService: WeiboAccountService,
    private readonly weiboHealthCheckService: WeiboHealthCheckService,
    private readonly configService: ConfigService,
  ) {}

  @Query(() => WeiboAccountConnection, { name: 'weiboAccounts' })
  async getAccounts(
    @CurrentUser('userId') userId: string,
    @Args('filter', { type: () => WeiboAccountFilterDto, nullable: true }) filter?: WeiboAccountFilterDto,
  ): Promise<WeiboAccountConnection> {
    const accounts = await this.weiboAccountService.findAccounts(userId);
    const keyword = filter?.keyword?.toLowerCase();
    let nodes = accounts.map(mapWeiboAccountEntityToModel);

    if (keyword) {
      nodes = nodes.filter((item) =>
        item.nickname.toLowerCase().includes(keyword) || item.uid.toLowerCase().includes(keyword),
      );
    }

    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const paged = nodes.slice(offset, offset + pageSize);

    return buildOffsetConnection(paged, {
      total: nodes.length,
      page,
      pageSize,
    });
  }

  @Query(() => WeiboAccountModel, { name: 'weiboAccount' })
  async getAccount(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<WeiboAccountModel> {
    const entity = await this.weiboAccountService.findOwnedAccount(userId, id);
    return mapWeiboAccountEntityToModel(entity);
  }

  @Mutation(() => Boolean, { name: 'removeWeiboAccount' })
  async removeAccount(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    await this.weiboAccountService.deleteAccount(userId, id);
    return true;
  }

  @Mutation(() => Boolean, { name: 'checkWeiboAccount' })
  async checkAccount(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    await this.weiboHealthCheckService.checkAccount(id);
    return true;
  }

  @Mutation(() => Boolean, { name: 'checkAllWeiboAccounts' })
  async checkAllAccounts(): Promise<boolean> {
    await this.weiboHealthCheckService.checkAllAccounts();
    return true;
  }

  @Query(() => WeiboAccountStatsModel, { name: 'weiboAccountStats' })
  async stats(): Promise<WeiboAccountStatsModel> {
    const stats = await this.weiboAccountService.getLoggedInUsersStats();
    return stats;
  }

  @Query(() => [WeiboAccountWithCookiesModel], { name: 'weiboAccountsWithCookies' })
  async accountsWithCookies(
    @Args('token', { type: () => String }) token: string,
  ): Promise<WeiboAccountWithCookiesModel[]> {
    this.validateInternalToken(token);
    const result = await this.weiboAccountService.getAccountsWithCookies();
    return result.accounts.map((account) => ({
      id: account.id,
      weiboUid: account.weiboUid,
      weiboNickname: account.weiboNickname,
      status: account.status,
      cookies: account.cookies,
      lastCheckAt: account.lastCheckAt ?? undefined,
    }));
  }

  @Mutation(() => Boolean, { name: 'markWeiboAccountBanned' })
  async markAccountBanned(
    @Args('token', { type: () => String }) token: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    this.validateInternalToken(token);
    await this.weiboAccountService.markAccountBanned(id);
    return true;
  }

  private validateInternalToken(token: string): void {
    const expectedToken = this.configService.get<string>('INTERNAL_API_TOKEN', 'internal-token');
    if (token !== expectedToken) {
      throw new ForbiddenException('无权访问此接口');
    }
  }
}

@ObjectType('WeiboAccountStats')
class WeiboAccountStatsModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  todayNew: number;

  @Field(() => Int)
  online: number;
}

@ObjectType('WeiboAccountWithCookies')
class WeiboAccountWithCookiesModel {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  weiboUid: string;

  @Field(() => String, { nullable: true })
  weiboNickname?: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  cookies: string;

  @Field(() => Date, { nullable: true })
  lastCheckAt?: Date;
}
