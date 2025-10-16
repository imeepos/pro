import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BugService } from './bug.service';
import { BugCommentService } from './bug-comment.service';
import { BugNotificationService } from './bug-notification.service';
import { UuidValidator } from './common/uuid.validator';
import { BugEntity } from '@pro/entities';
import { BugStatus, BugPriority, CreateBugDto, UpdateBugDto, Bug } from '@pro/types';

describe('BugService', () => {
  let service: BugService;
  let bugRepository: jest.Mocked<Repository<BugEntity>>;
  let commentService: jest.Mocked<BugCommentService>;
  let notificationService: jest.Mocked<BugNotificationService>;
  let uuidValidatorSpy: jest.SpyInstance;

  const fixedDate = new Date('2023-01-01T00:00:00.000Z');

  const mockBugEntity = (overrides: Partial<BugEntity> = {}): BugEntity => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Bug',
    description: 'Test Description',
    status: BugStatus.OPEN,
    priority: BugPriority.MEDIUM,
    category: 'functional',
    reporterId: 'user-123',
    assigneeId: null,
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
    createdAt: fixedDate,
    updatedAt: fixedDate,
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
    category: 'functional',
    reporterId: 'user-123',
    assigneeId: null,
    environment: null,
    stepsToReproduce: null,
    expectedBehavior: null,
    actualBehavior: null,
    reproductionRate: null,
    createdAt: fixedDate,
    updatedAt: fixedDate,
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
    const mockBugRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };

    const mockCommentService = {
      create: jest.fn(),
      findByBugId: jest.fn(),
      remove: jest.fn(),
    };

    const mockNotificationService = {
      notifyBugCreated: jest.fn(),
      notifyStatusChange: jest.fn(),
      notifyBugAssigned: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BugService,
        {
          provide: getRepositoryToken(BugEntity),
          useValue: mockBugRepository,
        },
        {
          provide: BugCommentService,
          useValue: mockCommentService,
        },
        {
          provide: BugNotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<BugService>(BugService);
    bugRepository = module.get(getRepositoryToken(BugEntity));
    commentService = module.get(BugCommentService);
    notificationService = module.get(BugNotificationService);

    uuidValidatorSpy = jest.spyOn(UuidValidator, 'validateWithIntelligence');
  });

  afterEach(() => {
    jest.clearAllMocks();
    uuidValidatorSpy.mockRestore();
  });

  describe('create', () => {
    const createBugDto: CreateBugDto = {
      title: 'New Bug',
      description: 'Bug description',
      priority: BugPriority.HIGH,
      category: 'functional',
      reporterId: 'user-123',
    };

    it('should create a bug successfully', async () => {
      const createdEntity = mockBugEntity({
        title: createBugDto.title,
        description: createBugDto.description,
        priority: createBugDto.priority,
        category: createBugDto.category,
        reporterId: createBugDto.reporterId,
      });

      bugRepository.create.mockReturnValue(createdEntity);
      bugRepository.save.mockResolvedValue(createdEntity);
      notificationService.notifyBugCreated.mockResolvedValue();

      const result = await service.create(createBugDto);

      expect(bugRepository.create).toHaveBeenCalledWith({
        ...createBugDto,
        status: BugStatus.OPEN,
        priority: createBugDto.priority,
      });
      expect(bugRepository.save).toHaveBeenCalledWith(createdEntity);
      expect(notificationService.notifyBugCreated).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(mockBugDto({
        title: createBugDto.title,
        description: createBugDto.description,
        priority: createBugDto.priority,
        category: createBugDto.category,
        reporterId: createBugDto.reporterId,
      }));
    });

    it('should use MEDIUM priority when not specified', async () => {
      const dtoWithoutPriority = { ...createBugDto };
      delete dtoWithoutPriority.priority;

      const createdEntity = mockBugEntity({
        title: dtoWithoutPriority.title,
        priority: BugPriority.MEDIUM,
      });

      bugRepository.create.mockReturnValue(createdEntity);
      bugRepository.save.mockResolvedValue(createdEntity);
      notificationService.notifyBugCreated.mockResolvedValue();

      await service.create(dtoWithoutPriority);

      expect(bugRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutPriority,
        status: BugStatus.OPEN,
        priority: BugPriority.MEDIUM,
      });
    });

    it('should handle array result from save', async () => {
      const createdEntity = mockBugEntity();
      bugRepository.create.mockReturnValue(createdEntity);
      bugRepository.save.mockResolvedValue([createdEntity]);
      notificationService.notifyBugCreated.mockResolvedValue();

      const result = await service.create(createBugDto);

      expect(result).toEqual(mockBugDto());
    });
  });

  describe('findAll', () => {
    it('should return paginated bugs with default filters', async () => {
      const mockBugs = [mockBugEntity(), mockBugEntity({ id: 'bug-2' })];
      bugRepository.findAndCount.mockResolvedValue([mockBugs, 2]);

      const result = await service.findAll({});

      expect(bugRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
        relations: ['reporter', 'assignee'],
      });
      expect(result).toEqual({
        bugs: mockBugs.map(bug => mockBugDto({ id: bug.id })),
        total: 2,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        page: 2,
        limit: 5,
        status: [BugStatus.IN_PROGRESS],
        priority: [BugPriority.HIGH],
        assigneeId: 'user-456',
        reporterId: 'user-123',
        search: 'critical bug',
        sortBy: 'priority' as const,
        sortOrder: 'asc' as const,
      };

      const expectedWhere: FindOptionsWhere<BugEntity> = {
        status: BugStatus.IN_PROGRESS,
        priority: BugPriority.HIGH,
        assigneeId: 'user-456',
        reporterId: 'user-123',
        title: Like('%critical bug%'),
      };

      bugRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filters);

      expect(bugRepository.findAndCount).toHaveBeenCalledWith({
        where: expectedWhere,
        order: { priority: 'asc' },
        skip: 5,
        take: 5,
        relations: ['reporter', 'assignee'],
      });
    });

    it('should handle empty status and priority arrays', async () => {
      const filters = {
        status: [],
        priority: [],
      };

      bugRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(filters);

      expect(bugRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
        relations: ['reporter', 'assignee'],
      });
    });
  });

  describe('findOne', () => {
    const bugId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return bug when found', async () => {
      const bugEntity = mockBugEntity({ id: bugId });
      bugRepository.findOne.mockResolvedValue(bugEntity);

      const result = await service.findOne(bugId);

      expect(uuidValidatorSpy).toHaveBeenCalledWith(bugId, 'Bug ID');
      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: bugId },
        relations: ['reporter', 'assignee', 'comments', 'attachments'],
      });
      expect(result).toEqual(mockBugDto({ id: bugId }));
    });

    it('should throw NotFoundException when bug not found', async () => {
      bugRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(bugId)).rejects.toThrow(NotFoundException);
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';
      uuidValidatorSpy.mockImplementation(() => {
        throw new BadRequestException('Invalid UUID');
      });

      await expect(service.findOne(invalidId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const bugId = '550e8400-e29b-41d4-a716-446655440000';
    const updateDto: UpdateBugDto = {
      title: 'Updated Title',
      status: BugStatus.IN_PROGRESS,
    };

    it('should update bug successfully', async () => {
      const existingBug = mockBugEntity({
        id: bugId,
        status: BugStatus.OPEN
      });
      const updatedBug = mockBugEntity({
        id: bugId,
        title: 'Updated Title',
        status: BugStatus.IN_PROGRESS
      });

      bugRepository.findOne.mockResolvedValueOnce(existingBug);
      bugRepository.findOne.mockResolvedValueOnce(updatedBug);
      bugRepository.update.mockResolvedValue(undefined);
      commentService.create.mockResolvedValue(null);
      notificationService.notifyStatusChange.mockResolvedValue();

      const result = await service.update(bugId, updateDto);

      expect(uuidValidatorSpy).toHaveBeenCalledWith(bugId, 'Bug ID');
      expect(bugRepository.update).toHaveBeenCalledWith(bugId, {
        ...updateDto,
        environment: undefined,
      });
      expect(commentService.create).toHaveBeenCalledWith(bugId, {
        content: '状态从 open 变更为 in_progress',
      });
      expect(notificationService.notifyStatusChange).toHaveBeenCalledWith(
        updatedBug,
        BugStatus.OPEN,
        BugStatus.IN_PROGRESS
      );
      expect(result).toEqual(mockBugDto({
        id: bugId,
        title: 'Updated Title',
        status: BugStatus.IN_PROGRESS
      }));
    });

    it('should handle environment data serialization', async () => {
      const updateDtoWithEnv: UpdateBugDto = {
        environment: { os: 'Windows 10', browser: 'Chrome' },
      };
      const existingBug = mockBugEntity({ id: bugId });
      const updatedBug = mockBugEntity({ id: bugId });

      bugRepository.findOne.mockResolvedValueOnce(existingBug);
      bugRepository.findOne.mockResolvedValueOnce(updatedBug);
      bugRepository.update.mockResolvedValue(undefined);

      await service.update(bugId, updateDtoWithEnv);

      expect(bugRepository.update).toHaveBeenCalledWith(bugId, {
        ...updateDtoWithEnv,
        environment: { os: 'Windows 10', browser: 'Chrome' },
      });
    });

    it('should throw NotFoundException when bug not found', async () => {
      bugRepository.findOne.mockResolvedValue(null);

      await expect(service.update(bugId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should not create comment when status unchanged', async () => {
      const existingBug = mockBugEntity({
        id: bugId,
        status: BugStatus.OPEN
      });
      const updatedBug = mockBugEntity({
        id: bugId,
        status: BugStatus.OPEN
      });

      bugRepository.findOne.mockResolvedValueOnce(existingBug);
      bugRepository.findOne.mockResolvedValueOnce(updatedBug);
      bugRepository.update.mockResolvedValue(undefined);

      await service.update(bugId, { title: 'New Title' });

      expect(commentService.create).not.toHaveBeenCalled();
      expect(notificationService.notifyStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const bugId = '550e8400-e29b-41d4-a716-446655440000';

    it('should remove bug successfully', async () => {
      const bugEntity = mockBugEntity({ id: bugId });
      bugRepository.findOne.mockResolvedValue(bugEntity);
      bugRepository.remove.mockResolvedValue(undefined);

      await service.remove(bugId);

      expect(uuidValidatorSpy).toHaveBeenCalledWith(bugId, 'Bug ID');
      expect(bugRepository.findOne).toHaveBeenCalledWith({ where: { id: bugId } });
      expect(bugRepository.remove).toHaveBeenCalledWith(bugEntity);
    });

    it('should throw NotFoundException when bug not found', async () => {
      bugRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(bugId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const bugId = '550e8400-e29b-41d4-a716-446655440000';
    const newStatus = BugStatus.RESOLVED;
    const comment = 'Fixed the issue';

    it('should update status and add comment', async () => {
      const updatedBug = mockBugDto({ status: newStatus });

      jest.spyOn(service, 'update').mockResolvedValue(updatedBug);
      commentService.create.mockResolvedValue(null);

      const result = await service.updateStatus(bugId, newStatus, comment);

      expect(service.update).toHaveBeenCalledWith(bugId, { status: newStatus });
      expect(commentService.create).toHaveBeenCalledWith(bugId, {
        content: comment,
      });
      expect(result).toEqual(updatedBug);
    });

    it('should update status without comment', async () => {
      const updatedBug = mockBugDto({ status: newStatus });

      jest.spyOn(service, 'update').mockResolvedValue(updatedBug);

      const result = await service.updateStatus(bugId, newStatus);

      expect(service.update).toHaveBeenCalledWith(bugId, { status: newStatus });
      expect(commentService.create).not.toHaveBeenCalled();
      expect(result).toEqual(updatedBug);
    });
  });

  describe('assign', () => {
    const bugId = '550e8400-e29b-41d4-a716-446655440000';
    const assigneeId = 'user-456';

    it('should assign bug to user and create comment', async () => {
      const updatedBug = mockBugDto({ assigneeId });

      jest.spyOn(service, 'update').mockResolvedValue(updatedBug);
      commentService.create.mockResolvedValue(null);
      notificationService.notifyBugAssigned.mockResolvedValue();

      const result = await service.assign(bugId, assigneeId);

      expect(service.update).toHaveBeenCalledWith(bugId, { assigneeId });
      expect(commentService.create).toHaveBeenCalledWith(bugId, {
        content: `Bug已分配给用户 ${assigneeId}`,
      });
      expect(notificationService.notifyBugAssigned).toHaveBeenCalledWith(updatedBug, assigneeId);
      expect(result).toEqual(updatedBug);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockCounts = [
        100, // total
        30,  // open
        25,  // inProgress
        35,  // resolved
        10,  // closed
        20,  // low priority
        50,  // medium priority
        25,  // high priority
        5,   // critical priority
      ];

      bugRepository.count
        .mockResolvedValueOnce(mockCounts[0]) // total
        .mockResolvedValueOnce(mockCounts[1]) // open
        .mockResolvedValueOnce(mockCounts[2]) // inProgress
        .mockResolvedValueOnce(mockCounts[3]) // resolved
        .mockResolvedValueOnce(mockCounts[4]) // closed
        .mockResolvedValueOnce(mockCounts[5]) // low
        .mockResolvedValueOnce(mockCounts[6]) // medium
        .mockResolvedValueOnce(mockCounts[7]) // high
        .mockResolvedValueOnce(mockCounts[8]); // critical

      const result = await service.getStatistics();

      expect(bugRepository.count).toHaveBeenCalledTimes(9);
      expect(bugRepository.count).toHaveBeenCalledWith({ where: { status: BugStatus.OPEN } });
      expect(bugRepository.count).toHaveBeenCalledWith({ where: { priority: BugPriority.LOW } });

      expect(result).toEqual({
        total: 100,
        byStatus: {
          open: 30,
          inProgress: 25,
          resolved: 35,
          closed: 10,
        },
        byPriority: {
          low: 20,
          medium: 50,
          high: 25,
          critical: 5,
        },
      });
    });

    it('should handle zero counts', async () => {
      bugRepository.count.mockResolvedValue(0);

      const result = await service.getStatistics();

      expect(result).toEqual({
        total: 0,
        byStatus: {
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0,
        },
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
      });
    });
  });

  describe('private mapEntityToDto', () => {
    it('should map entity to dto correctly', () => {
      const entity = mockBugEntity({
        id: 'test-id',
        title: 'Test Bug',
        status: BugStatus.OPEN,
        priority: BugPriority.HIGH,
        reporterId: 'user-1',
        assigneeId: 'user-2',
        environment: { os: 'Windows 10' },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      });

      // Access private method through prototype
      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'test-id',
        title: 'Test Bug',
        description: 'Test Description',
        status: BugStatus.OPEN,
        priority: BugPriority.HIGH,
        category: 'functional',
        reporterId: 'user-1',
        assigneeId: 'user-2',
        environment: { os: 'Windows 10' },
        stepsToReproduce: null,
        expectedBehavior: null,
        actualBehavior: null,
        reproductionRate: null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
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
      });
    });
  });
});