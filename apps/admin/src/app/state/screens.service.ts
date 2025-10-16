import { Injectable } from '@angular/core';
import { Observable, from, tap, catchError, throwError, finalize, map, switchMap } from 'rxjs';
import { ScreensStore } from './screens.store';
import { ScreensQuery } from './screens.query';
import { ScreenPage, CreateScreenDto, UpdateScreenDto } from '@pro/sdk';
import { GraphqlGateway } from '../core/graphql/graphql-gateway.service';
import { graphql } from '../core/graphql/generated';
import { mapScreenToScreenPage } from '../core/utils/screen-mapper';
import type { ScreenComponentDataSourceType } from '../core/graphql/generated/graphql';

const ScreensQueryDoc = graphql(`
  query Screens($page: Int, $limit: Int) {
    screens(page: $page, limit: $limit) {
      edges {
        node {
          id
          name
          description
          layout {
            width
            height
            background
            cols
            rows
            grid {
              size
              enabled
            }
          }
          components {
            id
            type
            position {
              x
              y
              width
              height
              zIndex
            }
            config
            dataSource {
              type
              url
              data
              refreshInterval
            }
          }
          status
          isDefault
          createdBy
          createdAt
          updatedAt
        }
      }
      totalCount
    }
  }
`);

const ScreenQueryDoc = graphql(`
  query Screen($id: ID!) {
    screen(id: $id) {
      id
      name
      description
      layout {
        width
        height
        background
        cols
        rows
        grid {
          size
          enabled
        }
      }
      components {
        id
        type
        position {
          x
          y
          width
          height
          zIndex
        }
        config
        dataSource {
          type
          url
          data
          refreshInterval
        }
      }
      status
      isDefault
      createdBy
      createdAt
      updatedAt
    }
  }
`);

const CreateScreenMutation = graphql(`
  mutation CreateScreen($input: CreateScreenInput!) {
    createScreen(input: $input) {
      id
      name
      description
      layout {
        width
        height
        background
        cols
        rows
        grid {
          size
          enabled
        }
      }
      components {
        id
        type
        position {
          x
          y
          width
          height
          zIndex
        }
        config
        dataSource {
          type
          url
          data
          refreshInterval
        }
      }
      status
      isDefault
      createdBy
      createdAt
      updatedAt
    }
  }
`);

const UpdateScreenMutation = graphql(`
  mutation UpdateScreen($id: ID!, $input: UpdateScreenInput!) {
    updateScreen(id: $id, input: $input) {
      id
      name
      description
      layout {
        width
        height
        background
        cols
        rows
        grid {
          size
          enabled
        }
      }
      components {
        id
        type
        position {
          x
          y
          width
          height
          zIndex
        }
        config
        dataSource {
          type
          url
          data
          refreshInterval
        }
      }
      status
      isDefault
      createdBy
      createdAt
      updatedAt
    }
  }
`);

const RemoveScreenMutation = graphql(`
  mutation RemoveScreen($id: ID!) {
    removeScreen(id: $id)
  }
`);

const CopyScreenMutation = graphql(`
  mutation CopyScreen($id: ID!) {
    copyScreen(id: $id) {
      id
      name
    }
  }
`);

const PublishScreenMutation = graphql(`
  mutation PublishScreen($id: ID!) {
    publishScreen(id: $id) {
      id
      status
    }
  }
`);

const DraftScreenMutation = graphql(`
  mutation DraftScreen($id: ID!) {
    draftScreen(id: $id) {
      id
      status
    }
  }
`);

const SetDefaultScreenMutation = graphql(`
  mutation SetDefaultScreen($id: ID!) {
    setDefaultScreen(id: $id) {
      id
      isDefault
    }
  }
`);

@Injectable({ providedIn: 'root' })
export class ScreensService {
  constructor(
    private store: ScreensStore,
    private query: ScreensQuery,
    private graphql: GraphqlGateway
  ) {}

  loadScreens(page = 1, limit = 20): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(ScreensQueryDoc, { page, limit })
    ).pipe(
      tap(response => {
        const screens = response.screens.edges.map(edge =>
          mapScreenToScreenPage(edge.node)
        );

        this.store.set(screens);
        this.store.update({
          total: response.screens.totalCount,
          page,
          limit
        });
      }),
      catchError(error => {
        this.setError(error.message || '加载页面列表失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  createScreen(dto: CreateScreenDto): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    const input = {
      name: dto.name,
      description: dto.description,
      layout: {
        width: dto.layout.width,
        height: dto.layout.height,
        background: dto.layout.background,
        grid: dto.layout.grid ? {
          size: dto.layout.grid.size,
          enabled: dto.layout.grid.enabled
        } : undefined
      },
      components: dto.components?.map(c => ({
        id: c.id,
        type: c.type,
        position: c.position,
        config: c.config,
        dataSource: c.dataSource ? {
          type: c.dataSource.type.toUpperCase() as ScreenComponentDataSourceType,
          url: c.dataSource.url,
          data: c.dataSource.data,
          refreshInterval: c.dataSource.refreshInterval
        } : undefined
      }))
    };

    return from(
      this.graphql.request(CreateScreenMutation, { input })
    ).pipe(
      map(response => mapScreenToScreenPage(response.createScreen)),
      tap(screen => {
        this.store.add(screen);
      }),
      catchError(error => {
        this.setError(error.message || '创建页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  updateScreen(id: string, dto: UpdateScreenDto): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    const input = {
      name: dto.name,
      description: dto.description,
      layout: dto.layout ? {
        width: dto.layout.width,
        height: dto.layout.height,
        background: dto.layout.background,
        grid: dto.layout.grid ? {
          size: dto.layout.grid.size,
          enabled: dto.layout.grid.enabled
        } : undefined
      } : undefined,
      components: dto.components?.map(c => ({
        id: c.id,
        type: c.type,
        position: c.position,
        config: c.config,
        dataSource: c.dataSource ? {
          type: c.dataSource.type.toUpperCase() as ScreenComponentDataSourceType,
          url: c.dataSource.url,
          data: c.dataSource.data,
          refreshInterval: c.dataSource.refreshInterval
        } : undefined
      }))
    };

    return from(
      this.graphql.request(UpdateScreenMutation, { id, input })
    ).pipe(
      map(response => mapScreenToScreenPage(response.updateScreen)),
      tap(screen => {
        this.store.update(id, screen);
      }),
      catchError(error => {
        this.setError(error.message || '更新页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  deleteScreen(id: string): Observable<void> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(RemoveScreenMutation, { id })
    ).pipe(
      tap(() => {
        this.store.remove(id);
      }),
      catchError(error => {
        this.setError(error.message || '删除页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false)),
      map(() => undefined)
    );
  }

  copyScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(CopyScreenMutation, { id })
    ).pipe(
      switchMap(response => this.loadScreen(response.copyScreen.id)),
      catchError(error => {
        this.setError(error.message || '复制页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  publishScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(PublishScreenMutation, { id })
    ).pipe(
      tap(response => {
        this.store.update(id, {
          status: response.publishScreen.status === 'Published' ? 'published' : 'draft'
        });
      }),
      map(response => {
        const current = this.query.getEntity(id);
        return current ? { ...current, status: response.publishScreen.status === 'Published' ? 'published' as const : 'draft' as const } : null!;
      }),
      catchError(error => {
        this.setError(error.message || '发布页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  draftScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(DraftScreenMutation, { id })
    ).pipe(
      tap(response => {
        this.store.update(id, {
          status: response.draftScreen.status === 'Published' ? 'published' : 'draft'
        });
      }),
      map(response => {
        const current = this.query.getEntity(id);
        return current ? { ...current, status: response.draftScreen.status === 'Published' ? 'published' as const : 'draft' as const } : null!;
      }),
      catchError(error => {
        this.setError(error.message || '设为草稿失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  loadScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(ScreenQueryDoc, { id })
    ).pipe(
      map(response => mapScreenToScreenPage(response.screen)),
      tap(screen => {
        this.store.upsert(id, screen);
      }),
      catchError(error => {
        this.setError(error.message || '加载页面详情失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  setDefaultScreen(id: string): Observable<ScreenPage> {
    this.setLoading(true);
    this.setError(null);

    return from(
      this.graphql.request(SetDefaultScreenMutation, { id })
    ).pipe(
      tap(() => {
        const screens = this.query.getAll();
        screens.forEach(s => {
          if (s.id === id) {
            this.store.update(s.id, { ...s, isDefault: true });
          } else if (s.isDefault) {
            this.store.update(s.id, { ...s, isDefault: false });
          }
        });
      }),
      map(() => {
        const screen = this.query.getEntity(id);
        return screen!;
      }),
      catchError(error => {
        this.setError(error.message || '设置默认页面失败');
        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }

  private setLoading(loading: boolean): void {
    this.store.update({ loading });
  }

  private setError(error: string | null): void {
    this.store.update({ error });
  }
}
