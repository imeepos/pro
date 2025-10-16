import { ScreenPage, Component, LayoutConfig } from '@pro/sdk';
import { Screen, ScreenComponent, ScreenLayout, ScreenComponentDataSource } from '../graphql/generated/graphql';

function mapDataSource(dataSource?: ScreenComponentDataSource | null): Component['dataSource'] {
  if (!dataSource) return undefined;

  return {
    type: dataSource.type.toLowerCase() as 'api' | 'static',
    url: dataSource.url ?? undefined,
    data: dataSource.data ?? undefined,
    refreshInterval: dataSource.refreshInterval ?? undefined
  };
}

function mapComponent(component: ScreenComponent): Component {
  return {
    id: component.id,
    type: component.type,
    position: {
      x: component.position.x,
      y: component.position.y,
      width: component.position.width,
      height: component.position.height,
      zIndex: component.position.zIndex
    },
    config: component.config ?? {},
    dataSource: mapDataSource(component.dataSource)
  };
}

function mapLayout(layout: ScreenLayout): LayoutConfig {
  return {
    width: layout.width,
    height: layout.height,
    background: layout.background,
    grid: layout.grid ? {
      size: layout.grid.size ?? undefined,
      enabled: layout.grid.enabled
    } : undefined
  };
}

export function mapScreenToScreenPage(screen: Screen): ScreenPage {
  return {
    id: screen.id,
    name: screen.name,
    description: screen.description ?? undefined,
    layout: mapLayout(screen.layout),
    components: screen.components.map(mapComponent),
    status: screen.status === 'Published' ? 'published' : 'draft',
    isDefault: screen.isDefault,
    createdBy: screen.createdBy,
    createdAt: screen.createdAt,
    updatedAt: screen.updatedAt
  };
}
