import { DataPlugin } from '../../models/data-source.model';
import { DataSourceType, DataMode, RequestMethod } from '../../models/data-source.enum';
import { ApiDataHandler } from './api-data.handler';
import { ApiDataConfigComponent } from './api-data-config.component';

export const ApiDataPlugin: DataPlugin = {
  type: DataSourceType.API,
  name: 'API接口',
  component: ApiDataConfigComponent,
  handler: ApiDataHandler,
  useTo: ['COMPONENT', 'GLOBAL'],
  getDefaultConfig: () => ({
    type: DataSourceType.API,
    mode: DataMode.API,
    options: {
      url: '',
      method: RequestMethod.GET,
      headers: {},
      params: {},
      interval: 0
    }
  })
};
