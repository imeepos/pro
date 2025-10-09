import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { MediaTypeEntity } from '../entities/media-type.entity';
import { CreateMediaTypeDto } from './dto/create-media-type.dto';
import { UpdateMediaTypeDto } from './dto/update-media-type.dto';
import { QueryMediaTypeDto } from './dto/query-media-type.dto';

@Injectable()
export class MediaTypeService {
  constructor(
    @InjectRepository(MediaTypeEntity)
    private readonly mediaTypeRepo: Repository<MediaTypeEntity>,
  ) {}

  async create(createDto: CreateMediaTypeDto): Promise<MediaTypeEntity> {
    const existing = await this.mediaTypeRepo.findOne({
      where: { typeCode: createDto.typeCode },
    });

    if (existing) {
      throw new ConflictException('类型编号已存在');
    }

    const mediaType = this.mediaTypeRepo.create(createDto);
    return await this.mediaTypeRepo.save(mediaType);
  }

  async findAll(queryDto: QueryMediaTypeDto) {
    const { page = 1, pageSize = 10, status, keyword } = queryDto;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.typeName = Like(`%${keyword}%`);
    }

    const [list, total] = await this.mediaTypeRepo.findAndCount({
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
  }

  async findOne(id: number): Promise<MediaTypeEntity> {
    const mediaType = await this.mediaTypeRepo.findOne({
      where: { id },
    });

    if (!mediaType) {
      throw new NotFoundException('媒体类型不存在');
    }

    return mediaType;
  }

  async update(
    id: number,
    updateDto: UpdateMediaTypeDto,
  ): Promise<MediaTypeEntity> {
    const mediaType = await this.findOne(id);

    if (updateDto.typeCode && updateDto.typeCode !== mediaType.typeCode) {
      const existing = await this.mediaTypeRepo.findOne({
        where: { typeCode: updateDto.typeCode },
      });

      if (existing) {
        throw new ConflictException('类型编号已存在');
      }
    }

    Object.assign(mediaType, updateDto);
    return await this.mediaTypeRepo.save(mediaType);
  }

  async remove(id: number): Promise<void> {
    const mediaType = await this.findOne(id);
    await this.mediaTypeRepo.remove(mediaType);
  }
}
