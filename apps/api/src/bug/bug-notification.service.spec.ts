import { Test, TestingModule } from '@nestjs/testing';
import { BugNotificationService } from './bug-notification.service';
import { BugEntity } from '@pro/entities';
import { Bug, BugStatus, BugPriority, BugCategory } from '@pro/types';

describe('BugNotificationService', () => {
  let service: BugNotificationService;
  let consoleSpy: jest.SpyInstance;

  const mockBugEntity = (overrides: Partial<BugEntity> = {}): BugEntity => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Bug',
    description: 'Test Description',
    status: BugStatus.OPEN,
    priority: BugPriority.MEDIUM,
    category: BugCategory.FUNCTIONAL,
    reporterId: 'user-123',
    assigneeId: 'user-456',
    environment: null,
    stepsToReproduce: null,
    expectedBehavior: null,
    actualBehavior: null,
    reproductionRate: null,
    resolvedAt: null,
    resolvedBy: null,
    closedAt: null,
    closedBy: null,
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reporter: null,
    assignee: null,
    resolver: null,
    closer: null,
    attachments: [],
    comments: [],
    tags: [],
    watchers: [],
    activities: [],
    timeTracking: [],
    ...overrides,
  });

  const mockBugDto = (overrides: Partial<Bug> = {}): Bug => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Bug',
    description: 'Test Description',
    status: BugStatus.OPEN,
    priority: BugPriority.MEDIUM,
    category: BugCategory.FUNCTIONAL,
    reporterId: 'user-123',
    assigneeId: 'user-456',
    environment: null,
    stepsToReproduce: null,
    expectedBehavior: null,
    actualBehavior: null,
    reproductionRate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    resolvedBy: null,
    closedAt: null,
    closedBy: null,
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    attachments: [],
    comments: [],
    tags: [],
    ...overrides,
  });

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BugNotificationService],
    }).compile();

    service = module.get<BugNotificationService>(BugNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('notifyBugCreated', () => {
    it('should notify bug creation successfully', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Critical Bug',
        priority: 'high',
        reporterId: 'user-123',
        assigneeId: 'user-456',
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('🐛 新Bug创建通知:');
      expect(consoleSpy).toHaveBeenCalledWith('   标题: Critical Bug');
      expect(consoleSpy).toHaveBeenCalledWith('   优先级: HIGH');
      expect(consoleSpy).toHaveBeenCalledWith('   报告者: user-123');
      expect(consoleSpy).toHaveBeenCalledWith(`   时间: ${new Date().toLocaleString()}`);
      expect(consoleSpy).toHaveBeenCalledWith('📧 通知发送:');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_CREATED');
      expect(consoleSpy).toHaveBeenCalledWith('   标题: 新Bug报告');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Critical Bug" 已被创建');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-123, user-456');
    });

    it('should handle bug without assignee', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Unassigned Bug',
        reporterId: 'user-123',
        assigneeId: null,
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-123');
    });

    it('should handle bug with null reporter and assignee', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'System Bug',
        reporterId: null,
        assigneeId: null,
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('   接收者: ');
    });

    it('should handle special characters in bug title', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Bug with 特殊字符 & symbols! @#$%',
        reporterId: 'user-123',
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('   标题: Bug with 特殊字符 & symbols! @#$%');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Bug with 特殊字符 & symbols! @#$%" 已被创建');
    });

    it('should handle very long bug title', async () => {
      const longTitle = 'A'.repeat(200);
      const bug = mockBugEntity({
        id: 'bug-123',
        title: longTitle,
        reporterId: 'user-123',
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith(`   标题: ${longTitle}`);
    });
  });

  describe('notifyStatusChange', () => {
    it('should notify status change successfully', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Status Change Bug',
        reporterId: 'user-123',
        assigneeId: 'user-456',
      });
      const oldStatus = BugStatus.OPEN;
      const newStatus = BugStatus.IN_PROGRESS;

      await service.notifyStatusChange(bug, oldStatus, newStatus);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 Bug状态变更通知:');
      expect(consoleSpy).toHaveBeenCalledWith('   Bug: Status Change Bug');
      expect(consoleSpy).toHaveBeenCalledWith('   状态: OPEN -> IN_PROGRESS');
      expect(consoleSpy).toHaveBeenCalledWith(`   时间: ${new Date().toLocaleString()}`);
      expect(consoleSpy).toHaveBeenCalledWith('📧 通知发送:');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_STATUS_CHANGED');
      expect(consoleSpy).toHaveBeenCalledWith('   标题: Bug状态更新');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Status Change Bug" 状态从 OPEN 变更为 IN_PROGRESS');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-123, user-456');
    });

    it('should handle status change without assignee', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Unassigned Bug',
        reporterId: 'user-123',
        assigneeId: null,
      });
      const oldStatus = BugStatus.OPEN;
      const newStatus = BugStatus.RESOLVED;

      await service.notifyStatusChange(bug, oldStatus, newStatus);

      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-123');
    });

    it('should handle all status transitions', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        reporterId: 'user-123',
        assigneeId: 'user-456',
      });

      const statusTransitions: Array<[BugStatus, BugStatus]> = [
        [BugStatus.OPEN, BugStatus.IN_PROGRESS],
        [BugStatus.IN_PROGRESS, BugStatus.RESOLVED],
        [BugStatus.RESOLVED, BugStatus.CLOSED],
        [BugStatus.CLOSED, BugStatus.REOPENED],
        [BugStatus.OPEN, BugStatus.RESOLVED],
      ];

      for (const [oldStatus, newStatus] of statusTransitions) {
        jest.clearAllMocks();
        await service.notifyStatusChange(bug, oldStatus, newStatus);

        expect(consoleSpy).toHaveBeenCalledWith(`   状态: ${oldStatus} -> ${newStatus}`);
        expect(consoleSpy).toHaveBeenCalledWith(`   消息: Bug "${bug.title}" 状态从 ${oldStatus} 变更为 ${newStatus}`);
      }
    });

    it('should handle same status change', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'No Change Bug',
        reporterId: 'user-123',
      });
      const status = BugStatus.OPEN;

      await service.notifyStatusChange(bug, status, status);

      expect(consoleSpy).toHaveBeenCalledWith('   状态: OPEN -> OPEN');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "No Change Bug" 状态从 OPEN 变更为 OPEN');
    });
  });

  describe('notifyBugAssigned', () => {
    it('should notify bug assignment successfully', async () => {
      const bug = mockBugDto({
        id: 'bug-123',
        title: 'Assigned Bug',
        reporterId: 'user-123',
        assigneeId: 'user-456',
      });
      const assigneeId = 'user-456';

      await service.notifyBugAssigned(bug, assigneeId);

      expect(consoleSpy).toHaveBeenCalledWith('👤 Bug分配通知:');
      expect(consoleSpy).toHaveBeenCalledWith('   Bug: Assigned Bug');
      expect(consoleSpy).toHaveBeenCalledWith('   分配给: user-456');
      expect(consoleSpy).toHaveBeenCalledWith(`   时间: ${new Date().toLocaleString()}`);
      expect(consoleSpy).toHaveBeenCalledWith('📧 通知发送:');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_ASSIGNED');
      expect(consoleSpy).toHaveBeenCalledWith('   标题: Bug已分配');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Assigned Bug" 已分配给您');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-456');
    });

    it('should handle assignment to different user than current assignee', async () => {
      const bug = mockBugDto({
        id: 'bug-123',
        title: 'Reassigned Bug',
        assigneeId: 'user-old',
      });
      const newAssigneeId = 'user-new';

      await service.notifyBugAssigned(bug, newAssigneeId);

      expect(consoleSpy).toHaveBeenCalledWith('   分配给: user-new');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-new');
    });

    it('should handle bug with special characters in title', async () => {
      const bug = mockBugDto({
        id: 'bug-123',
        title: 'Bug with émojis 🐛 & 特殊字符',
      });
      const assigneeId = 'user-123';

      await service.notifyBugAssigned(bug, assigneeId);

      expect(consoleSpy).toHaveBeenCalledWith('   Bug: Bug with émojis 🐛 & 特殊字符');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Bug with émojis 🐛 & 特殊字符" 已分配给您');
    });

    it('should handle very long assignee ID', async () => {
      const bug = mockBugDto({ id: 'bug-123' });
      const longAssigneeId = 'user-' + 'a'.repeat(100);

      await service.notifyBugAssigned(bug, longAssigneeId);

      expect(consoleSpy).toHaveBeenCalledWith(`   分配给: ${longAssigneeId}`);
      expect(consoleSpy).toHaveBeenCalledWith(`   接收者: ${longAssigneeId}`);
    });
  });

  describe('notifyCommentAdded', () => {
    it('should notify comment addition successfully', async () => {
      const bugId = 'bug-123';
      const commentAuthor = 'user-789';
      const bugTitle = 'Commented Bug';

      await service.notifyCommentAdded(bugId, commentAuthor, bugTitle);

      expect(consoleSpy).toHaveBeenCalledWith('💬 新评论通知:');
      expect(consoleSpy).toHaveBeenCalledWith('   Bug: Commented Bug');
      expect(consoleSpy).toHaveBeenCalledWith('   评论者: user-789');
      expect(consoleSpy).toHaveBeenCalledWith(`   时间: ${new Date().toLocaleString()}`);
      expect(consoleSpy).toHaveBeenCalledWith('📧 通知发送:');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: COMMENT_ADDED');
      expect(consoleSpy).toHaveBeenCalledWith('   标题: 新评论');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Commented Bug" 收到新评论');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-789');
    });

    it('should handle comment by system', async () => {
      const bugId = 'bug-123';
      const commentAuthor = 'System';
      const bugTitle = 'System Comment Bug';

      await service.notifyCommentAdded(bugId, commentAuthor, bugTitle);

      expect(consoleSpy).toHaveBeenCalledWith('   评论者: System');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: System');
    });

    it('should handle bug title with special characters', async () => {
      const bugId = 'bug-123';
      const commentAuthor = 'user-123';
      const bugTitle = 'Bug with "quotes" & <symbols>';

      await service.notifyCommentAdded(bugId, commentAuthor, bugTitle);

      expect(consoleSpy).toHaveBeenCalledWith('   Bug: Bug with "quotes" & <symbols>');
      expect(consoleSpy).toHaveBeenCalledWith('   消息: Bug "Bug with "quotes" & <symbols>" 收到新评论');
    });

    it('should handle very long bug title', async () => {
      const bugId = 'bug-123';
      const commentAuthor = 'user-123';
      const longBugTitle = 'A'.repeat(200);

      await service.notifyCommentAdded(bugId, commentAuthor, longBugTitle);

      expect(consoleSpy).toHaveBeenCalledWith(`   Bug: ${longBugTitle}`);
    });

    it('should handle comment author with special characters', async () => {
      const bugId = 'bug-123';
      const commentAuthor = 'user@domain.com';
      const bugTitle = 'Test Bug';

      await service.notifyCommentAdded(bugId, commentAuthor, bugTitle);

      expect(consoleSpy).toHaveBeenCalledWith('   评论者: user@domain.com');
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user@domain.com');
    });
  });

  describe('private sendNotification', () => {
    it('should handle notification with multiple recipients', async () => {
      const bug = mockBugEntity({
        reporterId: 'user-1',
        assigneeId: 'user-2',
      });

      await service.notifyBugCreated(bug);

      // Check that sendNotification was called with correct recipients
      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-1, user-2');
    });

    it('should handle notification with single recipient', async () => {
      const bug = mockBugDto();
      const assigneeId = 'user-123';

      await service.notifyBugAssigned(bug, assigneeId);

      expect(consoleSpy).toHaveBeenCalledWith('   接收者: user-123');
    });

    it('should handle notification with no recipients', async () => {
      const bug = mockBugEntity({
        reporterId: null,
        assigneeId: null,
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('   接收者: ');
    });

    it('should handle all notification types', async () => {
      const bug = mockBugEntity({
        id: 'bug-123',
        title: 'Test Bug',
        reporterId: 'user-123',
        assigneeId: 'user-456',
      });

      // Test BUG_CREATED notification
      await service.notifyBugCreated(bug);
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_CREATED');

      jest.clearAllMocks();

      // Test BUG_STATUS_CHANGED notification
      await service.notifyStatusChange(bug, BugStatus.OPEN, BugStatus.IN_PROGRESS);
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_STATUS_CHANGED');

      jest.clearAllMocks();

      // Test BUG_ASSIGNED notification
      await service.notifyBugAssigned(mockBugDto(), 'user-789');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: BUG_ASSIGNED');

      jest.clearAllMocks();

      // Test COMMENT_ADDED notification
      await service.notifyCommentAdded('bug-123', 'user-789', 'Test Bug');
      expect(consoleSpy).toHaveBeenCalledWith('   类型: COMMENT_ADDED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      const bug = mockBugEntity({
        title: '',
        reporterId: '',
        assigneeId: '',
      });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith('   标题: ');
      expect(consoleSpy).toHaveBeenCalledWith('   报告者: ');
    });

    it('should handle null and undefined values', async () => {
      const bug = mockBugEntity({
        title: null as any,
        reporterId: undefined as any,
        assigneeId: undefined as any,
      });

      await service.notifyBugCreated(bug);

      // Should not throw errors
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle concurrent notifications', async () => {
      const bug = mockBugEntity();

      const notifications = [
        service.notifyBugCreated(bug),
        service.notifyStatusChange(bug, BugStatus.OPEN, BugStatus.IN_PROGRESS),
        service.notifyBugAssigned(mockBugDto(), 'user-789'),
        service.notifyCommentAdded('bug-123', 'user-456', 'Test Bug'),
      ];

      await Promise.all(notifications);

      expect(consoleSpy).toHaveBeenCalledTimes(20); // 4 notifications * 5 console.log calls each
    });

    it('should handle very long IDs', async () => {
      const longId = 'a'.repeat(100);
      const bug = mockBugEntity({ id: longId });

      await service.notifyBugCreated(bug);

      expect(consoleSpy).toHaveBeenCalledWith(`   消息: Bug "${bug.title}" 已被创建`);
      // ID is used in logging but not displayed in console output
    });
  });
});