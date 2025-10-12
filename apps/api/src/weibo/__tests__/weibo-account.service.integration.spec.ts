import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboAccountService } from '../weibo-account.service';
import { ScreensGateway } from '../../screens/screens.gateway';
import { WeiboAccountEntity, WeiboAccountStatus } from '@pro/entities';
import { JwtService } from '@nestjs/jwt';
import { LoggedInUsersStats } from '@pro/sdk';

describe('WeiboAccountService Integration', () => {
  let service: WeiboAccountService;
  let repository: Repository<WeiboAccountEntity>;
  let screensGateway: ScreensGateway;
  let module: TestingModule;

  const mockScreensGateway = {
    broadcastWeiboLoggedInUsersUpdate: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        WeiboAccountService,
        {
          provide: getRepositoryToken(WeiboAccountEntity),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ScreensGateway,
          useValue: mockScreensGateway,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WeiboAccountService>(WeiboAccountService);
    repository = module.get<Repository<WeiboAccountEntity>>(
      getRepositoryToken(WeiboAccountEntity),
    );
    screensGateway = module.get<ScreensGateway>(ScreensGateway);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLoggedInUsersStats', () => {
    it('应该返回正确的统计信息', async () => {
      // 模拟数据库返回
      (repository.count as jest.Mock)
        .mockResolvedValueOnce(100) // 总用户数
        .mockResolvedValueOnce(25)  // 今日新增
        .mockResolvedValueOnce(60); // 在线用户数

      const result = await service.getLoggedInUsersStats();

      expect(result).toEqual({
        total: 100,
        todayNew: 25,
        online: 60,
      });

      // 验证调用次数和参数
      expect(repository.count).toHaveBeenCalledTimes(3);
    });

    it('应该正确计算今日新增用户', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      (repository.count as jest.Mock)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(30);

      await service.getLoggedInUsersStats();

      // 验证今日新增查询使用了正确的日期条件
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          createdAt: expect.any(Object),
        },
      });
    });

    it('应该正确查询在线用户（ACTIVE状态）', async () => {
      (repository.count as jest.Mock)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(45);

      await service.getLoggedInUsersStats();

      // 验证在线用户查询使用了正确的状态条件
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          status: WeiboAccountStatus.ACTIVE,
        },
      });
    });
  });

  describe('deleteAccount', () => {
    it('应该成功删除用户自己的账号', async () => {
      const userId = 'user123';
      const accountId = 1;
      const mockAccount = {
        id: accountId,
        userId: userId,
        weiboUid: 'test_uid',
        weiboNickname: 'test_nickname',
      };

      (repository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (repository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      (repository.count as jest.Mock).mockResolvedValue(100).mockResolvedValue(20).mockResolvedValue(50);

      const result = await service.deleteAccount(userId, accountId);

      expect(result).toEqual({ success: true });
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: accountId },
      });
      expect(repository.delete).toHaveBeenCalledWith(accountId);

      // 验证删除后推送了统计更新
      expect(mockScreensGateway.broadcastWeiboLoggedInUsersUpdate).toHaveBeenCalledWith({
        total: 100,
        todayNew: 20,
        online: 50,
      });
    });

    it('应该拒绝删除其他用户的账号', async () => {
      const userId = 'user123';
      const accountId = 1;
      const mockAccount = {
        id: accountId,
        userId: 'other_user',
        weiboUid: 'test_uid',
      };

      (repository.findOne as jest.Mock).mockResolvedValue(mockAccount);

      await expect(service.deleteAccount(userId, accountId)).rejects.toThrow('无权删除此账号');
      expect(repository.delete).not.toHaveBeenCalled();
      expect(mockScreensGateway.broadcastWeiboLoggedInUsersUpdate).not.toHaveBeenCalled();
    });

    it('应该处理账号不存在的情况', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteAccount('user123', 999)).rejects.toThrow('账号不存在');
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('markAccountBanned', () => {
    it('应该成功标记账号为banned状态', async () => {
      const accountId = 1;
      const mockAccount = {
        id: accountId,
        weiboUid: 'test_uid',
        status: WeiboAccountStatus.ACTIVE,
      };

      (repository.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (repository.save as jest.Mock).mockResolvedValue({
        ...mockAccount,
        status: WeiboAccountStatus.BANNED,
      });
      (repository.count as jest.Mock).mockResolvedValue(80).mockResolvedValue(15).mockResolvedValue(40);

      const result = await service.markAccountBanned(accountId);

      expect(result).toEqual({
        success: true,
        message: '账号已标记为banned状态',
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockAccount,
        status: WeiboAccountStatus.BANNED,
      });

      // 验证标记后推送了统计更新
      expect(mockScreensGateway.broadcastWeiboLoggedInUsersUpdate).toHaveBeenCalledWith({
        total: 80,
        todayNew: 15,
        online: 40,
      });
    });

    it('应该处理账号不存在的情况', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.markAccountBanned(999)).rejects.toThrow('账号不存在');
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket 推送集成', () => {
    it('账号变更时应该推送统计更新', async () => {
      // 模拟有账号存在
      const mockAccounts = [
        { id: 1, userId: 'user1', status: WeiboAccountStatus.ACTIVE },
        { id: 2, userId: 'user2', status: WeiboAccountStatus.ACTIVE },
      ];

      (repository.find as jest.Mock).mockResolvedValue(mockAccounts);
      (repository.count as jest.Mock).mockResolvedValue(2).mockResolvedValue(1).mockResolvedValue(2);

      const result = await service.getAccounts('user1');

      // 账号查询本身不应该触发推送
      expect(mockScreensGateway.broadcastWeiboLoggedInUsersUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            weiboUid: mockAccounts[0].weiboUid,
          }),
        ]),
      });
    });
  });
});