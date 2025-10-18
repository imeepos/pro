import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JdAccountStatus } from '@pro/types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { buildOffsetConnection } from '../common/utils/pagination.utils';
import { JdAccountService } from './jd-account.service';
import { JdHealthCheckService } from './jd-health-check.service';
import { JdAccountFilterInput } from './dto/jd-account.dto';
import {
  JdAccountCheckResultModel,
  JdAccountCheckSummaryModel,
  JdAccountConnection,
  JdAccountModel,
  JdAccountStatsModel,
  mapJdAccountSummaryToModel,
} from './models/jd-account.model';
import { CompositeAuthGuard } from '../auth/guards/composite-auth.guard';

type HealthCheckResultPayload = {
  accountId: number;
  jdUid: string;
  oldStatus: JdAccountStatus;
  newStatus: JdAccountStatus;
  statusChanged: boolean;
  message?: string;
  checkedAt?: string | Date;
};

type HealthCheckBatchPayload = {
  total?: number;
  checked?: number;
  results?: HealthCheckResultPayload[];
};

@Resolver(() => JdAccountModel)
@UseGuards(CompositeAuthGuard)
export class JdAccountResolver {
  constructor(
    private readonly jdAccountService: JdAccountService,
    private readonly jdHealthCheckService: JdHealthCheckService,
  ) {}

  @Query(() => JdAccountConnection, { name: 'jdAccounts' })
  async getAccounts(
    @CurrentUser('userId') userId: string,
    @Args('filter', { type: () => JdAccountFilterInput, nullable: true })
    filter?: JdAccountFilterInput,
  ): Promise<JdAccountConnection> {
    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 10;
    const safePage = page > 0 ? page : 1;
    const safeSize = pageSize > 0 ? pageSize : 10;

    const summaries = await this.jdAccountService.listAccountSummaries(userId);
    const total = summaries.length;
    const offset = (safePage - 1) * safeSize;
    const nodes = summaries.slice(offset, offset + safeSize).map(mapJdAccountSummaryToModel);

    return buildOffsetConnection(nodes, {
      total,
      page: safePage,
      pageSize: safeSize,
    });
  }

  @Query(() => JdAccountStatsModel, { name: 'jdAccountStats' })
  async stats(): Promise<JdAccountStatsModel> {
    return this.jdAccountService.getLoggedInUsersStats();
  }

  @Mutation(() => Boolean, { name: 'removeJdAccount' })
  async removeAccount(
    @CurrentUser('userId') userId: string,
    @Args('id', { type: () => Int }) id: number,
  ): Promise<boolean> {
    await this.jdAccountService.deleteAccount(userId, id);
    return true;
  }

  @Mutation(() => JdAccountCheckResultModel, { name: 'checkJdAccount' })
  async checkAccount(@Args('id', { type: () => Int }) id: number): Promise<JdAccountCheckResultModel> {
    const result = await this.jdHealthCheckService.checkAccount(id);
    return this.mapHealthCheckResult(result);
  }

  @Mutation(() => JdAccountCheckSummaryModel, { name: 'checkAllJdAccounts' })
  async checkAllAccounts(): Promise<JdAccountCheckSummaryModel> {
    const result = (await this.jdHealthCheckService.checkAllAccounts()) as HealthCheckBatchPayload;
    const items = result.results ?? [];
    return {
      total: result.total ?? items.length,
      checked: result.checked ?? items.length,
      results: items.map((item) => this.mapHealthCheckResult(item)),
    };
  }

  private mapHealthCheckResult(result: HealthCheckResultPayload): JdAccountCheckResultModel {
    const checkedAt =
      typeof result.checkedAt === 'string' ? new Date(result.checkedAt) : result.checkedAt ?? new Date();

    return {
      accountId: result.accountId,
      jdUid: result.jdUid,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      statusChanged: Boolean(result.statusChanged),
      message: result.message ?? '',
      checkedAt,
    };
  }
}
