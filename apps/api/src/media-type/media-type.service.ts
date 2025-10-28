import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Like } from 'typeorm';
import { MediaTypeEntity, useEntityManager } from '@pro/entities';
import { CreateMediaTypeDto } from './dto/create-media-type.dto';
import { UpdateMediaTypeDto } from './dto/update-media-type.dto';
import { QueryMediaTypeDto } from './dto/query-media-type.dto';

@Injectable()
export class MediaTypeService {
  async create(createDto: CreateMediaTypeDto): Promise<MediaTypeEntity> {
    return await useEntityManager(async (m) => {
      const repository = m.getRepository(MediaTypeEntity);

      const existing = await repository.findOne({
        where: { typeCode: createDto.typeCode },
      });

      if (existing) {
        throw new ConflictException('类型编号已存在');
      }

      const mediaType = repository.create(createDto);
      return await repository.save(mediaType);
    });
  }

  async findAll(queryDto: QueryMediaTypeDto) {
    return await useEntityManager(async (m) => {
      const repository = m.getRepository(MediaTypeEntity);
      const { page = 1, pageSize = 10, status, keyword } = queryDto;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (keyword) {
        where.typeName = Like(`%${keyword}%`);
      }

      const [list, total] = await repository.findAndCount({
        where,
        order: { sort: 'ASC', createdAt: 'DESC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        list,
        total,
        page,
        pageSize,
      };
    });
  }

  async findOne(id: number): Promise<MediaTypeEntity> {
    return await useEntityManager(async (m) => {
      const repository = m.getRepository(MediaTypeEntity);
      const mediaType = await repository.findOne({
        where: { id },
      });

      if (!mediaType) {
        throw new NotFoundException('媒体类型不存在');
      }

      return mediaType;
    });
  }

  async update(
    id: number,
    updateDto: UpdateMediaTypeDto,
  ): Promise<MediaTypeEntity> {
    return await useEntityManager(async (m) => {
      const repository = m.getRepository(MediaTypeEntity);
      const mediaType = await repository.findOne({
        where: { id },
      });

      if (!mediaType) {
        throw new NotFoundException('媒体类型不存在');
      }

      if (updateDto.typeCode && updateDto.typeCode !== mediaType.typeCode) {
        const existing = await repository.findOne({
          where: { typeCode: updateDto.typeCode },
        });

        if (existing) {
          throw new ConflictException('类型编号已存在');
        }
      }

      Object.assign(mediaType, updateDto);
      return await repository.save(mediaType);
    });
  }

  async remove(id: number): Promise<void> {
    return await useEntityManager(async (m) => {
      const repository = m.getRepository(MediaTypeEntity);
      const mediaType = await repository.findOne({
        where: { id },
      });

      if (!mediaType) {
        throw new NotFoundException('媒体类型不存在');
      }

      await repository.remove(mediaType);
    });
  }
}
