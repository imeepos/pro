import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugComment, CreateBugCommentDto } from '@pro/types';
import { BugCommentEntity, BugEntity, UserEntity } from '@pro/entities';

@Injectable()
export class BugCommentService {
  private readonly logger = new Logger(BugCommentService.name);

  constructor(
    @InjectRepository(BugCommentEntity)
    private readonly commentRepository: Repository<BugCommentEntity>,
    @InjectRepository(BugEntity)
    private readonly bugRepository: Repository<BugEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(bugId: string, createCommentDto: CreateBugCommentDto): Promise<BugComment> {
    this.logger.log(`为Bug ${bugId} 创建评论`);

    const bug = await this.bugRepository.findOne({ where: { id: bugId } });
    if (!bug) {
      throw new NotFoundException('Bug不存在');
    }

    const commentEntity = this.commentRepository.create({
      content: createCommentDto.content,
      authorId: 'system',
      authorName: 'System',
      bugId,
    });

    const savedComment = await this.commentRepository.save(commentEntity);
    return this.mapEntityToDto(savedComment);
  }

  async findByBugId(bugId: string): Promise<BugComment[]> {
    this.logger.log(`获取Bug ${bugId} 的评论列表`);

    const comments = await this.commentRepository.find({
      where: { bugId },
      order: { createdAt: 'ASC' },
      relations: ['author'],
    });

    return comments.map(comment => this.mapEntityToDto(comment));
  }

  async remove(commentId: string): Promise<void> {
    this.logger.log(`删除评论: ${commentId}`);

    const comment = await this.commentRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    await this.commentRepository.remove(comment);
  }

  private mapEntityToDto(entity: BugCommentEntity): BugComment {
    return {
      id: entity.id,
      content: entity.content,
      authorId: entity.authorId,
      authorName: entity.authorName,
      bugId: entity.bugId,
      isEdited: entity.isEdited,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      attachments: [],
    };
  }
}