import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScreenPageEntity } from '../entities/screen-page.entity';
import { CreateScreenDto, UpdateScreenDto } from './dto';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(ScreenPageEntity)
    private readonly screenPageRepository: Repository<ScreenPageEntity>,
  ) {}

  async create(createScreenDto: CreateScreenDto, userId: string) {
    const screen = this.screenPageRepository.create({
      ...createScreenDto,
      createdBy: userId,
      components: createScreenDto.components || [],
    });

    return this.screenPageRepository.save(screen);
  }

  async findAll(page = 1, limit = 10, userId?: string) {
    const query = this.screenPageRepository.createQueryBuilder('screen');

    if (userId) {
      query.where('screen.createdBy = :userId', { userId });
    }

    const [items, total] = await query
      .orderBy('screen.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const screen = await this.screenPageRepository.findOne({
      where: { id },
    });

    if (!screen) {
      throw new NotFoundException(`Screen page with ID ${id} not found`);
    }

    return screen;
  }

  async update(id: string, updateScreenDto: UpdateScreenDto, userId: string) {
    const screen = await this.findOne(id);

    if (screen.createdBy !== userId) {
      throw new BadRequestException('You can only update your own screens');
    }

    Object.assign(screen, updateScreenDto);

    return this.screenPageRepository.save(screen);
  }

  async remove(id: string, userId: string) {
    const screen = await this.findOne(id);

    if (screen.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own screens');
    }

    await this.screenPageRepository.remove(screen);

    return { message: 'Screen page deleted successfully' };
  }

  async copy(id: string, userId: string) {
    const screen = await this.findOne(id);

    const newScreen = this.screenPageRepository.create({
      name: `${screen.name} (Copy)`,
      description: screen.description,
      layout: screen.layout,
      components: screen.components,
      createdBy: userId,
      status: 'draft',
    });

    return this.screenPageRepository.save(newScreen);
  }

  async publish(id: string, userId: string) {
    const screen = await this.findOne(id);

    if (screen.createdBy !== userId) {
      throw new BadRequestException('You can only publish your own screens');
    }

    screen.status = 'published';

    return this.screenPageRepository.save(screen);
  }

  async draft(id: string, userId: string) {
    const screen = await this.findOne(id);

    if (screen.createdBy !== userId) {
      throw new BadRequestException(
        'You can only set draft status for your own screens',
      );
    }

    screen.status = 'draft';

    return this.screenPageRepository.save(screen);
  }

  async setDefault(id: string, userId: string) {
    const screen = await this.findOne(id);

    if (screen.createdBy !== userId) {
      throw new BadRequestException(
        'You can only set default for your own screens',
      );
    }

    // 取消其他默认页面
    await this.screenPageRepository.update(
      { createdBy: userId, isDefault: true },
      { isDefault: false },
    );

    screen.isDefault = true;

    return this.screenPageRepository.save(screen);
  }

  async getDefault(userId?: string) {
    const query = this.screenPageRepository.createQueryBuilder('screen');

    query.where('screen.isDefault = :isDefault', { isDefault: true });

    if (userId) {
      query.andWhere('screen.createdBy = :userId', { userId });
    }

    const screen = await query.getOne();

    if (!screen) {
      throw new NotFoundException('No default screen page found');
    }

    return screen;
  }
}
