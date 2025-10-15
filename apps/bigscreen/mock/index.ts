/**
 * Mock API 总入口
 */

import charts from './charts';
import common from './common';
import system from './system';
import sentiment from './sentiment';
import events from './events';
import overview from './overview';
import users from './users';

export default [
  ...charts,
  ...common,
  ...system,
  ...sentiment,
  ...events,
  ...overview,
  ...users,
];