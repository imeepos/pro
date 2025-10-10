import { DataPlugin } from '../../models/data-source.model';
import { DataSourceType, DataMode } from '../../models/data-source.enum';
import { WebSocketDataHandler } from './websocket-data.handler';
import { WebSocketDataConfigComponent } from './websocket-data-config.component';

export const WebSocketDataPlugin: DataPlugin = {
  type: DataSourceType.WEBSOCKET,
  name: 'WebSocket实时数据',
  component: WebSocketDataConfigComponent,
  handler: WebSocketDataHandler,
  useTo: ['COMPONENT', 'GLOBAL'],
  getDefaultConfig: () => ({
    type: DataSourceType.WEBSOCKET,
    mode: DataMode.WEBSOCKET,
    options: {
      url: '',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5
    }
  })
};
