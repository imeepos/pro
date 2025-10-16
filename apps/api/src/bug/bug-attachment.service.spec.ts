import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BugAttachmentService } from './bug-attachment.service';
import { BugAttachmentEntity, BugEntity, UserEntity } from '@pro/entities';
import { BugAttachment } from '@pro/types';

describe('BugAttachmentService', () => {
  let service: BugAttachmentService;
  let attachmentRepository: jest.Mocked<Repository<BugAttachmentEntity>>;
  let bugRepository: jest.Mocked<Repository<BugEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  const mockBugEntity = (overrides: Partial<BugEntity> = {}): BugEntity => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Bug',
    description: 'Test Description',
    status: 'open',
    priority: 'medium',
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

  const mockAttachmentEntity = (overrides: Partial<BugAttachmentEntity> = {}): BugAttachmentEntity => ({
    id: 'attachment-123',
    filename: 'screenshot.png',
    originalName: 'Screenshot.png',
    mimeType: 'image/png',
    size: 1024000,
    url: '/uploads/screenshot.png',
    uploadedBy: 'user-123',
    bugId: 'bug-123',
    commentId: null,
    uploadedAt: new Date(),
    bug: null,
    comment: null,
    uploader: null,
    ...overrides,
  });

  const mockAttachmentDto = (overrides: Partial<BugAttachment> = {}): BugAttachment => ({
    id: 'attachment-123',
    filename: 'screenshot.png',
    originalName: 'Screenshot.png',
    mimeType: 'image/png',
    size: 1024000,
    url: '/uploads/screenshot.png',
    uploadedBy: 'user-123',
    uploadedAt: new Date(),
    ...overrides,
  });

  const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test-file.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1024,
    destination: '/tmp',
    filename: 'test-file.png',
    path: '/tmp/test-file.png',
    buffer: Buffer.from('test content'),
    ...overrides,
  });

  beforeEach(async () => {
    const mockAttachmentRepository = {
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
        BugAttachmentService,
        {
          provide: getRepositoryToken(BugAttachmentEntity),
          useValue: mockAttachmentRepository,
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

    service = module.get<BugAttachmentService>(BugAttachmentService);
    attachmentRepository = module.get(getRepositoryToken(BugAttachmentEntity));
    bugRepository = module.get(getRepositoryToken(BugEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const bugId = 'bug-123';
    const file = mockFile();

    it('should create an attachment successfully', async () => {
      const bug = mockBugEntity({ id: bugId });
      const attachmentEntity = mockAttachmentEntity({
        bugId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create(bugId, file);

      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: bugId }
      });
      expect(attachmentRepository.create).toHaveBeenCalledWith({
        bugId,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      });
      expect(attachmentRepository.save).toHaveBeenCalledWith(attachmentEntity);
      expect(result).toEqual(mockAttachmentDto({
        bugId,
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
      }));
    });

    it('should throw NotFoundException when bug does not exist', async () => {
      bugRepository.findOne.mockResolvedValue(null);

      await expect(service.create(bugId, file))
        .rejects.toThrow(NotFoundException);

      expect(bugRepository.findOne).toHaveBeenCalledWith({
        where: { id: bugId }
      });
      expect(attachmentRepository.create).not.toHaveBeenCalled();
      expect(attachmentRepository.save).not.toHaveBeenCalled();
    });

    it('should handle different file types', async () => {
      const bug = mockBugEntity({ id: bugId });
      const pdfFile = mockFile({
        originalname: 'document.pdf',
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 2048000,
      });
      const attachmentEntity = mockAttachmentEntity({
        bugId,
        filename: pdfFile.filename,
        originalName: pdfFile.originalname,
        mimeType: pdfFile.mimetype,
        size: pdfFile.size,
        url: `/uploads/${pdfFile.filename}`,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create(bugId, pdfFile);

      expect(result).toEqual(mockAttachmentDto({
        bugId,
        filename: 'document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        url: '/uploads/document.pdf',
      }));
    });

    it('should handle large files', async () => {
      const bug = mockBugEntity({ id: bugId });
      const largeFile = mockFile({
        originalname: 'large-video.mp4',
        filename: 'large-video.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024, // 100MB
      });
      const attachmentEntity = mockAttachmentEntity({
        bugId,
        filename: largeFile.filename,
        originalName: largeFile.originalname,
        mimeType: largeFile.mimetype,
        size: largeFile.size,
        url: `/uploads/${largeFile.filename}`,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create(bugId, largeFile);

      expect(result.size).toBe(100 * 1024 * 1024);
    });

    it('should handle files with special characters in name', async () => {
      const bug = mockBugEntity({ id: bugId });
      const specialFile = mockFile({
        originalname: '测试文件 (1).png',
        filename: 'test-file.png',
        mimetype: 'image/png',
      });
      const attachmentEntity = mockAttachmentEntity({
        bugId,
        filename: specialFile.filename,
        originalName: specialFile.originalname,
        mimeType: specialFile.mimetype,
        size: specialFile.size,
        url: `/uploads/${specialFile.filename}`,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create(bugId, specialFile);

      expect(result.originalName).toBe('测试文件 (1).png');
    });
  });

  describe('findByBugId', () => {
    const bugId = 'bug-123';

    it('should return attachments sorted by upload date descending', async () => {
      const olderAttachment = mockAttachmentEntity({
        id: 'attachment-1',
        uploadedAt: new Date('2023-01-01'),
      });
      const newerAttachment = mockAttachmentEntity({
        id: 'attachment-2',
        uploadedAt: new Date('2023-01-02'),
      });
      const attachments = [olderAttachment, newerAttachment]; // Database returns unsorted

      attachmentRepository.find.mockResolvedValue(attachments);

      const result = await service.findByBugId(bugId);

      expect(attachmentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { uploadedAt: 'DESC' },
        relations: ['uploader'],
      });
      expect(result).toEqual([
        mockAttachmentDto({ id: 'attachment-2', uploadedAt: new Date('2023-01-02') }),
        mockAttachmentDto({ id: 'attachment-1', uploadedAt: new Date('2023-01-01') }),
      ]);
    });

    it('should return empty array when no attachments exist', async () => {
      attachmentRepository.find.mockResolvedValue([]);

      const result = await service.findByBugId(bugId);

      expect(attachmentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { uploadedAt: 'DESC' },
        relations: ['uploader'],
      });
      expect(result).toEqual([]);
    });

    it('should handle attachments with uploader relations', async () => {
      const uploader = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };
      const attachment = mockAttachmentEntity({
        id: 'attachment-1',
        uploader,
      });

      attachmentRepository.find.mockResolvedValue([attachment]);

      const result = await service.findByBugId(bugId);

      expect(attachmentRepository.find).toHaveBeenCalledWith({
        where: { bugId },
        order: { uploadedAt: 'DESC' },
        relations: ['uploader'],
      });
      expect(result).toEqual([
        mockAttachmentDto({
          id: 'attachment-1',
          uploadedBy: uploader.id,
        }),
      ]);
    });

    it('should handle multiple attachments with different types', async () => {
      const imageAttachment = mockAttachmentEntity({
        id: 'attachment-1',
        filename: 'screenshot.png',
        mimeType: 'image/png',
        size: 1024,
        uploadedAt: new Date('2023-01-01'),
      });
      const documentAttachment = mockAttachmentEntity({
        id: 'attachment-2',
        filename: 'report.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        uploadedAt: new Date('2023-01-02'),
      });
      const videoAttachment = mockAttachmentEntity({
        id: 'attachment-3',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        size: 50000000,
        uploadedAt: new Date('2023-01-03'),
      });

      attachmentRepository.find.mockResolvedValue([
        imageAttachment,
        documentAttachment,
        videoAttachment,
      ]);

      const result = await service.findByBugId(bugId);

      expect(result).toHaveLength(3);
      expect(result[0].mimeType).toBe('video/mp4');
      expect(result[1].mimeType).toBe('application/pdf');
      expect(result[2].mimeType).toBe('image/png');
    });
  });

  describe('remove', () => {
    const attachmentId = 'attachment-123';

    it('should remove attachment successfully', async () => {
      const attachment = mockAttachmentEntity({ id: attachmentId });

      attachmentRepository.findOne.mockResolvedValue(attachment);
      attachmentRepository.remove.mockResolvedValue(undefined);

      await service.remove(attachmentId);

      expect(attachmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: attachmentId }
      });
      expect(attachmentRepository.remove).toHaveBeenCalledWith(attachment);
    });

    it('should throw NotFoundException when attachment does not exist', async () => {
      attachmentRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(attachmentId))
        .rejects.toThrow(NotFoundException);

      expect(attachmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: attachmentId }
      });
      expect(attachmentRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle attachment removal with large file', async () => {
      const largeAttachment = mockAttachmentEntity({
        id: attachmentId,
        size: 500 * 1024 * 1024, // 500MB
      });

      attachmentRepository.findOne.mockResolvedValue(largeAttachment);
      attachmentRepository.remove.mockResolvedValue(undefined);

      await service.remove(attachmentId);

      expect(attachmentRepository.remove).toHaveBeenCalledWith(largeAttachment);
    });
  });

  describe('private mapEntityToDto', () => {
    it('should map entity to dto correctly', () => {
      const entity = mockAttachmentEntity({
        id: 'attachment-123',
        filename: 'stored-filename.png',
        originalName: 'Original Name.png',
        mimeType: 'image/png',
        size: 1024000,
        url: '/uploads/stored-filename.png',
        uploadedBy: 'user-789',
        bugId: 'bug-456',
        uploadedAt: new Date('2023-01-01T10:00:00Z'),
      });

      // Access private method through prototype
      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'attachment-123',
        filename: 'stored-filename.png',
        originalName: 'Original Name.png',
        mimeType: 'image/png',
        size: 1024000,
        url: '/uploads/stored-filename.png',
        uploadedBy: 'user-789',
        uploadedAt: entity.uploadedAt,
      });
    });

    it('should handle entity with null values', () => {
      const entity = {
        id: 'attachment-123',
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        url: '/uploads/test.png',
        uploadedBy: null,
        uploadedAt: new Date(),
        bug: null,
        comment: null,
        uploader: null,
      } as BugAttachmentEntity;

      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'attachment-123',
        filename: 'test.png',
        originalName: 'test.png',
        mimeType: 'image/png',
        size: 1024,
        url: '/uploads/test.png',
        uploadedBy: null,
        uploadedAt: entity.uploadedAt,
      });
    });

    it('should handle entity with undefined relations', () => {
      const entity = {
        id: 'attachment-123',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/test.pdf',
        uploadedBy: 'user-456',
        uploadedAt: new Date(),
        bug: undefined,
        comment: undefined,
        uploader: undefined,
      } as unknown as BugAttachmentEntity;

      const mapMethod = (service as any).mapEntityToDto.bind(service);
      const result = mapMethod(entity);

      expect(result).toEqual({
        id: 'attachment-123',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        url: '/uploads/test.pdf',
        uploadedBy: 'user-456',
        uploadedAt: entity.uploadedAt,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long attachment filename', async () => {
      const bug = mockBugEntity();
      const longFilename = 'a'.repeat(300) + '.png';
      const file = mockFile({
        originalname: longFilename,
        filename: 'short.png',
      });
      const attachmentEntity = mockAttachmentEntity({
        filename: file.filename,
        originalName: longFilename,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create('bug-123', file);

      expect(result.originalName).toBe(longFilename);
      expect(result.filename).toBe('short.png');
    });

    it('should handle zero-size file', async () => {
      const bug = mockBugEntity();
      const emptyFile = mockFile({
        size: 0,
      });
      const attachmentEntity = mockAttachmentEntity({
        size: 0,
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create('bug-123', emptyFile);

      expect(result.size).toBe(0);
    });

    it('should handle unusual mime types', async () => {
      const bug = mockBugEntity();
      const unusualFile = mockFile({
        originalname: 'custom-file.xyz',
        mimetype: 'application/x-custom',
      });
      const attachmentEntity = mockAttachmentEntity({
        mimeType: 'application/x-custom',
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create('bug-123', unusualFile);

      expect(result.mimeType).toBe('application/x-custom');
    });

    it('should handle unicode filenames', async () => {
      const bug = mockBugEntity();
      const unicodeFile = mockFile({
        originalname: '测试文件.png',
        filename: 'test-file.png',
      });
      const attachmentEntity = mockAttachmentEntity({
        originalName: '测试文件.png',
        filename: 'test-file.png',
      });

      bugRepository.findOne.mockResolvedValue(bug);
      attachmentRepository.create.mockReturnValue(attachmentEntity);
      attachmentRepository.save.mockResolvedValue(attachmentEntity);

      const result = await service.create('bug-123', unicodeFile);

      expect(result.originalName).toBe('测试文件.png');
    });
  });
});