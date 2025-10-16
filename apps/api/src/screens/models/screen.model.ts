import { Field, GraphQLISODateTime, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { ScreenPageEntity, ScreenComponent as ScreenComponentEntity, LayoutConfig } from '@pro/entities';
import { UserModel } from '../../user/models/user.model';
import {
  ScreenComponentDataSourceEnum,
  ScreenComponentDataSourceType,
  ScreenComponentDto,
} from '../dto';
import { ScreenDataTransformer } from '../utils/screen-data-transformer';
import { createOffsetConnectionType } from '../../common/models/pagination.model';

export enum ScreenStatusModel {
  Draft = 'draft',
  Published = 'published',
}

registerEnumType(ScreenStatusModel, {
  name: 'ScreenStatus',
  description: '大屏状态',
});

@ObjectType('ScreenGrid')
export class ScreenGridModel {
  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Int, { nullable: true })
  size?: number;
}

@ObjectType('ScreenLayout')
export class ScreenLayoutModel {
  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;

  @Field(() => String)
  background: string;

  @Field(() => ScreenGridModel, { nullable: true })
  grid?: ScreenGridModel;

  @Field(() => Int, {
    nullable: true,
    description: '向后兼容的列数信息',
  })
  cols?: number;

  @Field(() => Int, {
    nullable: true,
    description: '向后兼容的行数信息',
  })
  rows?: number;
}

@ObjectType('ScreenComponentPosition')
export class ScreenComponentPositionModel {
  @Field(() => Int)
  x: number;

  @Field(() => Int)
  y: number;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  zIndex: number;
}

@ObjectType('ScreenComponentDataSource')
export class ScreenComponentDataSourceModel {
  @Field(() => ScreenComponentDataSourceEnum)
  type: ScreenComponentDataSourceType;

  @Field(() => String, { nullable: true })
  url?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, unknown>;

  @Field(() => Int, { nullable: true })
  refreshInterval?: number;
}

@ObjectType('ScreenComponent')
export class ScreenComponentModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => ScreenComponentPositionModel)
  position: ScreenComponentPositionModel;

  @Field(() => GraphQLJSONObject, { nullable: true })
  config?: Record<string, unknown>;

  @Field(() => ScreenComponentDataSourceModel, { nullable: true })
  dataSource?: ScreenComponentDataSourceModel;
}

@ObjectType('Screen')
export class ScreenModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ScreenLayoutModel)
  layout: ScreenLayoutModel;

  @Field(() => [ScreenComponentModel])
  components: ScreenComponentModel[];

  @Field(() => ScreenStatusModel)
  status: ScreenStatusModel;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => String)
  createdBy: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field(() => UserModel, { nullable: true })
  creator?: UserModel;
}

const ScreenConnectionBase = createOffsetConnectionType(ScreenModel, 'Screen');

@ObjectType()
export class ScreenConnection extends ScreenConnectionBase {}

type ScreenComponentSource = ScreenComponentEntity & {
  _dto?: ScreenComponentDto;
};

type ScreenExtras = {
  layout?: LayoutConfig & { cols?: number; rows?: number };
  components?: ScreenComponentSource[];
  creator?: UserModel;
};

const toFrontendComponent = (component: ScreenComponentSource): ScreenComponentDto => {
  if (component._dto) {
    return component._dto;
  }

  return ScreenDataTransformer.transformScreenComponentToFrontend(component);
};

const toFrontendLayout = (layout: LayoutConfig & { cols?: number; rows?: number }): ScreenLayoutModel => {
  const normalized = ScreenDataTransformer.transformLayoutConfigToFrontend(layout);

  return {
    width: normalized.width,
    height: normalized.height,
    background: normalized.background,
    grid: normalized.grid
      ? {
          enabled: normalized.grid.enabled ?? false,
          size: normalized.grid.size,
        }
      : undefined,
    cols: normalized.cols,
    rows: normalized.rows,
  };
};

const toComponentModel = (component: ScreenComponentSource): ScreenComponentModel => {
  const dto = toFrontendComponent(component);

  return {
    id: dto.id,
    type: dto.type,
    position: {
      x: Math.round(Number(dto.position.x)) || 0,
      y: Math.round(Number(dto.position.y)) || 0,
      width: Math.round(Number(dto.position.width)) || 1,
      height: Math.round(Number(dto.position.height)) || 1,
      zIndex: Math.round(Number(dto.position.zIndex)) || 0,
    },
    config: dto.config ?? {},
    dataSource: dto.dataSource
      ? {
          type: dto.dataSource.type,
          url: dto.dataSource.url ?? undefined,
          data: dto.dataSource.data ?? undefined,
          refreshInterval: dto.dataSource.refreshInterval ?? undefined,
        }
      : undefined,
  };
};

export const mapScreenEntityToModel = (screen: ScreenPageEntity): ScreenModel => {
  const extras = screen as ScreenPageEntity & ScreenExtras;
  const layoutSource = {
    ...screen.layout,
    ...(extras.layout ?? {}),
  } as LayoutConfig & { cols?: number; rows?: number };
  const layout = toFrontendLayout(layoutSource);
  const componentSources = (extras.components ?? screen.components) as ScreenComponentSource[];
  const components = componentSources.map(toComponentModel);

  return {
    id: screen.id,
    name: screen.name,
    description: screen.description ?? undefined,
    layout,
    components,
    status: screen.status as ScreenStatusModel,
    isDefault: screen.isDefault,
    createdBy: screen.createdBy,
    createdAt: screen.createdAt,
    updatedAt: screen.updatedAt,
    creator: extras.creator ?? undefined,
  };
};
