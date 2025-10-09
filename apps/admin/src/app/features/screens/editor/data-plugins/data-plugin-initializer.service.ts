import { Injectable } from '@angular/core';
import { DataSlotterService } from '../data-slotter/data-slotter.service';
import { DemoDataPlugin } from './demo/demo-data.plugin';
import { ApiDataPlugin } from './api/api-data.plugin';
import { WebSocketDataPlugin } from './websocket/websocket-data.plugin';

@Injectable({ providedIn: 'root' })
export class DataPluginInitializerService {
  constructor(private dataSlotterService: DataSlotterService) {
    this.registerAllPlugins();
  }

  private registerAllPlugins(): void {
    this.dataSlotterService.registerPlugin(DemoDataPlugin);
    this.dataSlotterService.registerPlugin(ApiDataPlugin);
    this.dataSlotterService.registerPlugin(WebSocketDataPlugin);
  }
}
