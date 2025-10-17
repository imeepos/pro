import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BugCommentService } from './bug-comment.service';
import { BugCommentEntity, BugEntity, UserEntity } from '@pro/entities';
import { BugComment, CreateBugCommentDto, BugStatus, BugPriority, BugCategory } from '@pro/types';

describe('BugCommentService', () => {
  let service: BugCommentService;
  let commentRepository: jest.Mocked<Repository<BugCommentEntity>>;
  let bugRepository: jest.Mocked<Repository<BugEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  const mockBugEntity = (overrides: Partial<BugEntity> = {}): BugEntity => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Bug',
    description: 'Test Description',
    status: BugStatus.OPEN,
    priority: BugPriority.MEDIUM,
    category: BugCategory.FUNCTIONAL,
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

  const fixedDate = new Date('2023-01-01T00:00:00.000Z');

  const mockCommentEntity = (overrides: Partial<BugCommentEntity> = {}): BugCommentEntity => ({
    id: 'comment-123',
    bugId: 'bug-123',
    content: 'Test comment',
    authorId: 'user-123',
    authorName: 'Test User',
    isEdited: false,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    bug: null,
    author: null,
    attachments: [],
    ...overrides,
  });

  const mockCommentDto = (overrides: Partial<BugComment> = {}): BugComment => ({
    id: 'comment-123',
    bugId: 'bug-123',
    content: 'Test comment',
    authorId: 'user-123',
    authorName: 'Test User',
    isEdited: false,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    attachments: [],
    ...overrides,
  });

  beforeEach(async () => {
    const mockCommentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const mockBugRepository = {
      findOne: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BugCommentService,
        {
          provide: getRepositoryToken(BugCommentEntity),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(BugEntity),
          useValue: mockBugRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<BugCommentService>(BugCommentService);
    commentRepository = module.get(getRepositoryToken(BugCommentEntity));
    bugRepository = module.get(getRepositoryToken(BugEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const bugId = 'bug-123';
    const createCommentDto: CreateBugCommentDto = {
      content: 'This is a test comment',
    };

    it('should create a comment successfully', async () => {
      const bug = mockBugEntity({ id: bugId });
      const commentEntity = mockCommentEntity({
        bugId,
        content: createCommentDto.content,
        authorName: 'System',
      });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create(bugId, createCommentDto);

      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: bugId }
      });
      expect(commentRepository.create).toHaveBeenCalledWith({
        content: createCommentDto.content,
        authorName: 'System',
        bugId,
      });
      expect(commentRepository.save).toHaveBeenCalledWith(commentEntity);
      expect(result).toEqual(mockCommentDto({
        bugId,
        content: createCommentDto.content,
        authorName: 'System',
      }));
    });

    it('should throw NotFoundException when bug does not exist', async () => {
      bugRepository.findOne.mockResolvedValue(null);

      await expect(service.create(bugId, createCommentDto))
        .rejects.toThrow(NotFoundException);

      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: bugId }
      });
      expect(commentRepository.create).not.toHaveBeenCalled();
      expect(commentRepository.save).not.toHaveBeenCalled();
    });

    it('should handle empty content', async () => {
      const bug = mockBugEntity({ id: bugId });
      const commentEntity = mockCommentEntity({
        bugId,
        content: '',
        authorName: 'System',
      });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create(bugId, { content: '' });

      expect(result).toEqual(mockCommentDto({
        bugId,
        content: '',
        authorName: 'System',
      }));
    });

    it('should handle large content', async () => {
      const bug = mockBugEntity({ id: bugId });
      const largeContent = 'A'.repeat(10000); // 10K characters
      const commentEntity = mockCommentEntity({
        bugId,
        content: largeContent,
        authorName: 'System',
      });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create(bugId, { content: largeContent });

      expect(result).toEqual(mockCommentDto({
        bugId,
        content: largeContent,
        authorName: 'System',
      }));
    });
  });

  describe('findByBugId', () => {
    const bugId = 'bug-123';

    it('should return comments sorted by creation date', async () => {
      const olderComment = mockCommentEntity({
        id: 'comment-1',
        createdAt: new Date('2023-01-01'),
      });
      const newerComment = mockCommentEntity({
        id: 'comment-2',
        createdAt: new Date('2023-01-02'),
      });
      const comments = [newerComment, olderComment]; // Database returns unsorted

      commentRepository.find.mockResolvedValue(comments);

      const result = await service.findByBugId(bugId);

      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { createdAt: 'ASC' },
        relations: ['author'],
      });
      expect(result).toEqual([
        mockCommentDto({ id: 'comment-1', createdAt: new Date('2023-01-01') }),
        mockCommentDto({ id: 'comment-2', createdAt: new Date('2023-01-02') }),
      ]);
    });

    it('should return empty array when no comments exist', async () => {
      commentRepository.find.mockResolvedValue([]);

      const result = await service.findByBugId(bugId);

      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { createdAt: 'ASC' },
        relations: ['author'],
      });
      expect(result).toEqual([]);
    });

    it('should handle comments with author relations', async () => {
      const author = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };
      const comment = mockCommentEntity({
        id: 'comment-1',
        author,
      });

      commentRepository.find.mockResolvedValue([comment]);

      const result = await service.findByBugId(bugId);

      expect(commentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { createdAt: 'ASC' },
        relations: ['author'],
      });
      expect(result).toEqual([
        mockCommentDto({
          id: 'comment-1',
          authorId: author.id,
          authorName: 'Test User', // This comes from entity mapping
        }),
      ]);
    });

    it('should handle comments with attachments', async () => {
      const attachment = {
        id: 'attachment-1',
        filename: 'screenshot.png',
        originalName: 'Screenshot.png',
      };
      const comment = mockCommentEntity({
        id: 'comment-1',
        attachments: [attachment],
      });

      commentRepository.find.mockResolvedValue([comment]);

      const result = await service.findByBugId(bugId);

      expect(result[0].attachments).toEqual([]);
    });
  });

  describe('remove', () => {
    const commentId = 'comment-123';

    it('should remove comment successfully', async () => {
      const comment = mockCommentEntity({ id: commentId });

      commentRepository.findOne.mockResolvedValue(comment);
      commentRepository.remove.mockResolvedValue(undefined);

      await service.remove(commentId);

      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: { id: commentId }
      });
      expect(commentRepository.remove).toHaveBeenCalledWith(comment);
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      commentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(commentId))
        .rejects.toThrow(NotFoundException);

      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: { id: commentId }
      });
      expect(commentRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle comment removal with dependencies', async () => {
      const comment = mockCommentEntity({
        id: commentId,
        attachments: [
          { id: 'attachment-1' },
          { id: 'attachment-2' },
        ],
      });

      commentRepository.findOne.mockResolvedValue(comment);
      commentRepository.remove.mockResolvedValue(undefined);

      await service.remove(commentId);

      expect(commentRepository.remove).toHaveBeenCalledWith(comment);
      // Note: Cascading delete should handle attachments automatically
    });
  });

  describe('private mapEntityToDto', () => {
    it('should map entity to dto correctly', () => {
      const entity = mockCommentEntity({
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment content',
        authorId: 'user-789',
        authorName: 'John Doe',
        isEdited: true,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-02T15:30:00Z'),
        attachments: [
          { id: 'attachment-1', filename: 'image.png' },
        ],
      });

      // Access private method through prototype
      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment content',
        authorId: 'user-789',
        authorName: 'John Doe',
        isEdited: true,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        attachments: [], // Always empty array as per service implementation
      });
    });

    it('should handle entity with null values', () => {
      const entity = {
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment',
        authorId: null,
        authorName: 'System',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        attachments: null,
      } as BugCommentEntity;

      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment',
        authorId: null,
        authorName: 'System',
        isEdited: false,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        attachments: [],
      });
    });

    it('should handle entity with undefined relations', () => {
      const entity = {
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment',
        authorId: 'user-789',
        authorName: 'Jane Doe',
        isEdited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        bug: undefined,
        author: undefined,
        attachments: undefined,
      } as unknown as BugCommentEntity;

      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'comment-123',
        bugId: 'bug-456',
        content: 'Test comment',
        authorId: 'user-789',
        authorName: 'Jane Doe',
        isEdited: false,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        attachments: [],
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long bug ID', async () => {
      const longBugId = 'a'.repeat(100); // Very long ID
      const bug = mockBugEntity({ id: longBugId });
      const commentEntity = mockCommentEntity({ bugId: longBugId });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create(longBugId, { content: 'Test' });

      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: longBugId }
      });
      expect(result.bugId).toBe(longBugId);
    });

    it('should handle special characters in content', async () => {
      const bug = mockBugEntity();
      const specialContent = 'Comment with émojis 🐛 and special chars: @#$%^&*()';
      const commentEntity = mockCommentEntity({ content: specialContent });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create('bug-123', { content: specialContent });

      expect(result.content).toBe(specialContent);
    });

    it('should handle HTML content safely', async () => {
      const bug = mockBugEntity();
      const htmlContent = '<script>alert("xss")</script><p>Safe content</p>';
      const commentEntity = mockCommentEntity({ content: htmlContent });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create('bug-123', { content: htmlContent });

      expect(result.content).toBe(htmlContent); // Service doesn't sanitize, that's handled elsewhere
    });

    it('should handle unicode content', async () => {
      const bug = mockBugEntity();
      const unicodeContent = '测试评论 with العربية and 🌍 Unicode';
      const commentEntity = mockCommentEntity({ content: unicodeContent });

      bugRepository.findOne.mockResolvedValue(bug);
      commentRepository.create.mockReturnValue(commentEntity);
      commentRepository.save.mockResolvedValue(commentEntity);

      const result = await service.create('bug-123', { content: unicodeContent });

      expect(result.content).toBe(unicodeContent);
    });
  });
});