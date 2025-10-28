import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ScreenPageEntity, ScreenComponent, useEntityManager } from '@pro/entities';
import { CreateScreenDto, UpdateScreenDto, ScreenComponentDto } from './dto';
import { ScreenDataTransformer } from './utils/screen-data-transformer';

type HydratedLayout = ReturnType<typeof ScreenDataTransformer.transformLayoutConfigToFrontend>;
type NormalizedScreenComponent = Omit<ScreenComponent, 'config'> & {
  config: Record<string, unknown>;
  _dto?: ScreenComponentDto;
};
type HydratedScreenPage = ScreenPageEntity & {
  layout: HydratedLayout;
  components: NormalizedScreenComponent[];
};

@Injectable()
export class ScreensService {
  async create(createScreenDto: CreateScreenDto, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);

      // 转换布局配置格式
      const layoutConfig = ScreenDataTransformer.transformLayoutConfig(createScreenDto.layout);

      // 转换组件配置格式
      const components = createScreenDto.components?.map(component =>
        ScreenDataTransformer.transformScreenComponent(component)
      ) || [];

      const screen = repository.create({
        ...createScreenDto,
        layout: layoutConfig,
        components,
        createdBy: userId,
      });

      return repository.save(screen);
    });
  }

  async findAll(page = 1, limit = 10, userId?: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const query = repository.createQueryBuilder('screen');

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
    });
  }

  async findPublished(page = 1, limit = 10, userId?: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const query = repository.createQueryBuilder('screen');

      query.where('screen.status = :status', { status: 'published' });

      if (userId) {
        query.andWhere('screen.createdBy = :userId', { userId });
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
    });
  }

  async findOne(id: string): Promise<HydratedScreenPage> {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      // 转换布局配置为前端友好格式（包含cols和rows信息）
      const transformedLayout = ScreenDataTransformer.transformLayoutConfigToFrontend(screen.layout);

      // 转换组件配置为前端友好格式
      const transformedComponents: NormalizedScreenComponent[] = screen.components.map(component => {
        const transformedComponent = ScreenDataTransformer.transformScreenComponentToFrontend(component);
        return {
          ...component, // 保持原始实体结构
          config: transformedComponent.config || {}, // 确保config字段存在
          // 可选地添加前端友好的转换数据
          _dto: transformedComponent, // 添加DTO格式作为元数据
        };
      });

      // 返回增强的屏幕对象，保持实体类型兼容性
      const enhancedScreen: HydratedScreenPage = {
        ...screen,
        layout: transformedLayout,
        components: transformedComponents,
      };

      return enhancedScreen;
    });
  }

  async update(id: string, updateScreenDto: UpdateScreenDto, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      if (screen.createdBy !== userId) {
        throw new BadRequestException('You can only update your own screens');
      }

      // 转换布局配置格式（如果提供了）
      let layoutConfig = screen.layout;
      if (updateScreenDto.layout) {
        layoutConfig = ScreenDataTransformer.transformLayoutConfig(updateScreenDto.layout);
      }

      // 转换组件配置格式（如果提供了）
      let components = screen.components;
      if (updateScreenDto.components) {
        components = updateScreenDto.components.map(component =>
          ScreenDataTransformer.transformScreenComponent(component)
        );
      }

      Object.assign(screen, {
        ...updateScreenDto,
        layout: layoutConfig,
        components,
      });

      return repository.save(screen);
    });
  }

  async remove(id: string, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      if (screen.createdBy !== userId) {
        throw new BadRequestException('You can only delete your own screens');
      }

      await repository.remove(screen);

      return { message: 'Screen page deleted successfully' };
    });
  }

  async copy(id: string, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      const newScreen = repository.create({
        name: `${screen.name} (Copy)`,
        description: screen.description,
        layout: screen.layout,
        components: screen.components,
        createdBy: userId,
        status: 'draft',
      });

      return repository.save(newScreen);
    });
  }

  async publish(id: string, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      if (screen.createdBy !== userId) {
        throw new BadRequestException('You can only publish your own screens');
      }

      screen.status = 'published';

      return repository.save(screen);
    });
  }

  async draft(id: string, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      if (screen.createdBy !== userId) {
        throw new BadRequestException(
          'You can only set draft status for your own screens',
        );
      }

      screen.status = 'draft';

      return repository.save(screen);
    });
  }

  async setDefault(id: string, userId: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const screen = await repository.findOne({
        where: { id },
      });

      if (!screen) {
        throw new NotFoundException(`Screen page with ID ${id} not found`);
      }

      if (screen.createdBy !== userId) {
        throw new BadRequestException(
          'You can only set default for your own screens',
        );
      }

      // 取消其他默认页面
      await repository.update(
        { createdBy: userId, isDefault: true },
        { isDefault: false },
      );

      screen.isDefault = true;

      return repository.save(screen);
    });
  }

  async getDefault(userId?: string) {
    return useEntityManager(async (m) => {
      const repository = m.getRepository(ScreenPageEntity);
      const query = repository.createQueryBuilder('screen');

      query.where('screen.isDefault = :isDefault', { isDefault: true });

      if (userId) {
        query.andWhere('screen.createdBy = :userId', { userId });
      }

      const screen = await query.getOne();

      if (!screen) {
        throw new NotFoundException('No default screen page found');
      }

      return screen;
    });
  }
}
