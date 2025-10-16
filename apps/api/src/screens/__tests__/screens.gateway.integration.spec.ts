import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ScreensGateway } from '../screens.gateway';
import { Server, Socket } from 'socket.io';
import { LoggedInUsersStats } from '@pro/types';

describe('ScreensGateway Integration', () => {
  let gateway: ScreensGateway;
  let jwtService: JwtService;
  let mockServer: any;
  let mockClient: any;
  let module: TestingModule;

  beforeAll(async () => {
    mockServer = {
      emit: jest.fn(),
    };

    mockClient = {
      id: 'test-client-id',
      handshake: {
        auth: {},
      },
      data: {},
      disconnect: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ScreensGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ScreensGateway>(ScreensGateway);
    jwtService = module.get<JwtService>(JwtService);

    // 手动设置 server，因为 @WebSocketServer() 在测试中不会自动注入
    (gateway as any).server = mockServer;
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WebSocket 连接认证', () => {
    it('应该成功认证有效的 JWT token', async () => {
      const mockPayload = { userId: 'user123' };
      mockClient.handshake.auth.token = 'valid-jwt-token';

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockClient.data.userId).toBe('user123');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('应该拒绝缺少 token 的连接', async () => {
      mockClient.handshake.auth.token = undefined;

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('应该拒绝无效的 JWT token', async () => {
      mockClient.handshake.auth.token = 'invalid-jwt-token';

      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await gateway.handleConnection(mockClient);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-jwt-token');
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('应该处理 JWT 验证中的异常', async () => {
      mockClient.handshake.auth.token = 'malformed-token';

      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Token malformed'));

      await gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('连接断开处理', () => {
    it('应该正确处理客户端断开连接', () => {
      // 这个测试主要是确保不会抛出异常
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('微博用户统计广播', () => {
    const testStats: LoggedInUsersStats = {
      total: 100,
      todayNew: 25,
      online: 60,
    };

    it('应该向所有客户端广播微博用户统计更新', () => {
      gateway.broadcastWeiboLoggedInUsersUpdate(testStats);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'weibo:logged-in-users:update',
        testStats
      );
    });

    it('应该处理空统计数据', () => {
      const emptyStats: LoggedInUsersStats = {
        total: 0,
        todayNew: 0,
        online: 0,
      };

      gateway.broadcastWeiboLoggedInUsersUpdate(emptyStats);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'weibo:logged-in-users:update',
        emptyStats
      );
    });

    it('应该处理大数据量统计', () => {
      const largeStats: LoggedInUsersStats = {
        total: 10000,
        todayNew: 500,
        online: 8000,
      };

      gateway.broadcastWeiboLoggedInUsersUpdate(largeStats);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'weibo:logged-in-users:update',
        largeStats
      );
    });

    it('应该处理部分数据为空的情况', () => {
      const partialStats: LoggedInUsersStats = {
        total: 100,
        todayNew: 0,
        online: 60,
      };

      gateway.broadcastWeiboLoggedInUsersUpdate(partialStats);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'weibo:logged-in-users:update',
        partialStats
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理广播时的异常', () => {
      mockServer.emit.mockImplementationOnce(() => {
        throw new Error('Broadcast failed');
      });

      // 应该不抛出异常，即使广播失败
      expect(() => {
        gateway.broadcastWeiboLoggedInUsersUpdate({
          total: 10,
          todayNew: 5,
          online: 8,
        });
      }).not.toThrow();
    });
  });

  describe('命名空间配置', () => {
    it('应该配置正确的命名空间', () => {
      const gatewayReflect = Reflect.getMetadata('__nest__gateways', ScreensGateway);
      expect(gatewayReflect).toBeDefined();
    });

    it('应该配置 CORS', () => {
      // 这个测试确保 CORS 配置存在
      const gatewayMetadata = Reflect.getMetadata('__nest__gateway__', ScreensGateway);
      expect(gatewayMetadata.options).toBeDefined();
      expect(gatewayMetadata.options.cors).toBeDefined();
    });
  });
});
