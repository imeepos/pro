import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { BugComment, CreateBugCommentDto } from '@pro/types';
import { BugCommentEntity, BugEntity, UserEntity, useEntityManager } from '@pro/entities';

@Injectable()
export class BugCommentService {
  private readonly logger = new Logger(BugCommentService.name);

  async create(bugId: string, createCommentDto: CreateBugCommentDto | any): Promise<BugComment> {
    this.logger.log(`为Bug ${bugId} 创建评论`);

    return useEntityManager(async (manager) => {
      const bug = await manager.getRepository(BugEntity).findOne({ where: { id: bugId } });
      if (!bug) {
        throw new NotFoundException('Bug不存在');
      }

      const authorId = createCommentDto.authorId;
      let authorName = 'System';

      if (authorId) {
        const author = await manager.getRepository(UserEntity).findOne({ where: { id: authorId } });
        if (author) {
          authorName = author.username;
        }
      }

      const commentEntity = manager.getRepository(BugCommentEntity).create({
        content: createCommentDto.content,
        authorId: authorId || null,
        authorName,
        bugId,
      });

      const savedComment = await manager.getRepository(BugCommentEntity).save(commentEntity);
      return this.mapEntityToDto(savedComment);
    });
  }

  async findByBugId(bugId: string): Promise<BugComment[]> {
    this.logger.log(`获取Bug ${bugId} 的评论列表`);

    return useEntityManager(async (manager) => {
      const comments = await manager.getRepository(BugCommentEntity).find({
        where: { bugId },
        order: { createdAt: 'ASC' },
        relations: ['author'],
      });

      return comments.map(comment => this.mapEntityToDto(comment));
    });
  }

  async remove(commentId: string): Promise<void> {
    this.logger.log(`删除评论: ${commentId}`);

    return useEntityManager(async (manager) => {
      const comment = await manager.getRepository(BugCommentEntity).findOne({ where: { id: commentId } });
      if (!comment) {
        throw new NotFoundException('评论不存在');
      }

      await manager.getRepository(BugCommentEntity).remove(comment);
    });
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