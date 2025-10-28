import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeiboCommentEntity } from '@pro/entities';
import { PinoLogger } from '@pro/logger-nestjs';
import { WeiboCommentDataService } from '../weibo-comment-data.service';

describe('WeiboCommentDataService', () => {
  let service: WeiboCommentDataService;
  let repo: Repository<WeiboCommentEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeiboCommentDataService,
        {
          provide: getRepositoryToken(WeiboCommentEntity),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WeiboCommentDataService>(WeiboCommentDataService);
    repo = module.get<Repository<WeiboCommentEntity>>(
      getRepositoryToken(WeiboCommentEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findCommentById', () => {
    it('should call repository findOne with correct parameters', async () => {
      const id = '123';
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await service.findCommentById(id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['author', 'post'],
      });
    });
  });
});
