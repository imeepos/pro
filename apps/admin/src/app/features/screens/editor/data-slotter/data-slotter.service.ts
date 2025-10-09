import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AnyDataConfig, DataAcceptor, DataInstance, DataPlugin, DataResponse, DataSlot, DataSourceType } from '../models/data-source.model';
import { DataStatus } from '../models/data-source.enum';
import { DataSlotterStore } from './data-slotter.store';
import { DataSlotterQuery } from './data-slotter.query';

@Injectable({ providedIn: 'root' })
export class DataSlotterService {
  private plugins = new Map<DataSourceType, DataPlugin>();
  private dataInstances = new Map<string, DataInstance>();
  private dataSubjects = new Map<string, Subject<DataResponse>>();

  constructor(
    private store: DataSlotterStore,
    private query: DataSlotterQuery,
    private injector: Injector
  ) {}

  registerPlugin(plugin: DataPlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  unregisterPlugin(type: DataSourceType): void {
    this.plugins.delete(type);
  }

  getPlugin(type: DataSourceType): DataPlugin | undefined {
    return this.plugins.get(type);
  }

  getAllPlugins(): DataPlugin[] {
    return Array.from(this.plugins.values());
  }

  getComponentPlugins(): DataPlugin[] {
    return this.getAllPlugins().filter(plugin => {
      const useTo = plugin.useTo || 'COMPONENT';
      return useTo === 'COMPONENT' || (Array.isArray(useTo) && useTo.includes('COMPONENT'));
    });
  }

  getGlobalPlugins(): DataPlugin[] {
    return this.getAllPlugins().filter(plugin => {
      const useTo = plugin.useTo || 'GLOBAL';
      return useTo === 'GLOBAL' || (Array.isArray(useTo) && useTo.includes('GLOBAL'));
    });
  }

  createDataSlot(componentId: string, dataConfig: AnyDataConfig): string {
    const slotId = this.generateSlotId(componentId);
    const subject = new BehaviorSubject<DataResponse>({ status: DataStatus.IDLE });

    this.dataSubjects.set(slotId, subject);

    const slot: DataSlot = {
      id: slotId,
      componentId,
      dataConfig,
      data$: subject.asObservable(),
      status: DataStatus.IDLE
    };

    this.store.add(slot);
    return slotId;
  }

  updateDataConfig(slotId: string, dataConfig: AnyDataConfig): void {
    const slot = this.query.getEntity(slotId);
    if (!slot) return;

    this.disconnectDataInstance(slotId);

    this.store.update(slotId, {
      dataConfig,
      status: DataStatus.IDLE
    });

    this.connectDataSource(slotId);
  }

  removeDataSlot(slotId: string): void {
    this.disconnectDataInstance(slotId);
    this.dataSubjects.delete(slotId);
    this.store.remove(slotId);
  }

  removeSlotsByComponentId(componentId: string): void {
    const slots = this.query.getAll().filter(slot => slot.componentId === componentId);
    slots.forEach(slot => this.removeDataSlot(slot.id));
  }

  async connectDataSource(slotId: string): Promise<void> {
    const slot = this.query.getEntity(slotId);
    if (!slot) return;

    const plugin = this.getPlugin(slot.dataConfig.type);
    if (!plugin) {
      this.emitError(slotId, `未找到类型为 ${slot.dataConfig.type} 的数据插件`);
      return;
    }

    try {
      this.store.update(slotId, { status: DataStatus.LOADING });

      const instance = this.injector.get(plugin.handler);
      this.dataInstances.set(slotId, instance);

      const acceptor: DataAcceptor = (response) => {
        this.handleDataResponse(slotId, response);
      };

      await instance.connect(acceptor, slot.dataConfig.options);
    } catch (error) {
      this.emitError(slotId, error instanceof Error ? error.message : '连接数据源失败');
    }
  }

  disconnectDataInstance(slotId: string): void {
    const instance = this.dataInstances.get(slotId);
    if (instance?.disconnect) {
      instance.disconnect();
    }
    this.dataInstances.delete(slotId);
  }

  async debugDataSource(slotId: string): Promise<void> {
    const slot = this.query.getEntity(slotId);
    if (!slot) return;

    const plugin = this.getPlugin(slot.dataConfig.type);
    if (!plugin) return;

    try {
      const instance = this.injector.get(plugin.handler);
      const acceptor: DataAcceptor = (response) => {
        this.handleDataResponse(slotId, response);
      };
      await instance.debug(acceptor);
    } catch (error) {
      this.emitError(slotId, error instanceof Error ? error.message : '调试数据源失败');
    }
  }

  private handleDataResponse(slotId: string, response: DataResponse): void {
    const subject = this.dataSubjects.get(slotId);
    if (!subject) return;

    const timestamp = Date.now();
    const updatedResponse = { ...response, timestamp };

    subject.next(updatedResponse);

    this.store.update(slotId, {
      status: response.status,
      lastUpdate: timestamp,
      error: response.error
    });
  }

  private emitError(slotId: string, message: string): void {
    this.handleDataResponse(slotId, {
      status: DataStatus.ERROR,
      error: message
    });
  }

  private generateSlotId(componentId: string): string {
    return `${componentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setGlobalData(key: string, data: any): void {
    this.store.updateGlobalData(key, data);
  }

  removeGlobalData(key: string): void {
    this.store.removeGlobalData(key);
  }

  getGlobalData(key: string): any {
    return this.query.getGlobalData(key);
  }

  selectGlobalData(key: string): Observable<any> {
    return this.query.selectGlobalDataByKey(key);
  }
}
