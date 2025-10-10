import { DataPlugin } from '../../models/data-source.model';
import { DataSourceType, DataMode } from '../../models/data-source.enum';
import { DemoDataHandler } from './demo-data.handler';
import { DemoDataConfigComponent } from './demo-data-config.component';

export const DemoDataPlugin: DataPlugin = {
  type: DataSourceType.DEMO,
  name: '示例数据',
  component: DemoDataConfigComponent,
  handler: DemoDataHandler,
  useTo: 'COMPONENT',
  getDefaultConfig: () => ({
    type: DataSourceType.DEMO,
    mode: DataMode.SELF,
    options: {
      data: {
        value: 100,
        label: '示例数据'
      }
    }
  })
};
