// ng-zorro-antd 组件的统一导出文件
// 用于 standalone components 导入

import {
  NgForOf,
  NgIf,
  NgClass,
  NgStyle,
  NgTemplateOutlet,
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  PercentPipe,
  CurrencyPipe,
  SlicePipe,
  UpperCasePipe,
  LowerCasePipe,
  TitleCasePipe
} from '@angular/common';

// Form 相关
import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

// ng-zorro-antd 组件导出
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSliderModule } from 'ng-zorro-antd/slider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCommentModule } from 'ng-zorro-antd/comment';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzAnchorModule } from 'ng-zorro-antd/anchor';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzModalModule } from 'ng-zorro-antd/modal';
// NzMessageModule 是服务，不需要导入
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBackTopModule } from 'ng-zorro-antd/back-top';
import { NzAffixModule } from 'ng-zorro-antd/affix';
import { NzCalendarModule } from 'ng-zorro-antd/calendar';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzSpaceModule } from 'ng-zorro-antd/space';

// 重新导出组件
export {
  NzButtonModule,
  NzInputModule,
  NzSelectModule,
  NzRadioModule,
  NzCheckboxModule,
  NzSwitchModule,
  NzDatePickerModule,
  NzTimePickerModule,
  NzUploadModule,
  NzRateModule,
  NzSliderModule,
  NzFormModule,
  NzTableModule,
  NzListModule,
  NzCardModule,
  NzDescriptionsModule,
  NzStatisticModule,
  NzTreeModule,
  NzTransferModule,
  NzAvatarModule,
  NzCommentModule,
  NzTimelineModule,
  NzTagModule,
  NzProgressModule,
  NzSkeletonModule,
  NzEmptyModule,
  NzResultModule,
  NzMenuModule,
  NzPaginationModule,
  NzBreadCrumbModule,
  NzStepsModule,
  NzAnchorModule,
  NzGridModule,
  NzLayoutModule,
  NzDividerModule,
  NzAlertModule,
  NzDrawerModule,
  NzModalModule,
  NzPopoverModule,
  NzTooltipModule,
  NzSpinModule,
  NzBackTopModule,
  NzAffixModule,
  NzCalendarModule,
  NzCollapseModule,
  NzPageHeaderModule,
  NzTabsModule,
  NzTypographyModule,
  NzIconModule,
  NzBadgeModule,
  NzSpaceModule
};

// 常用组件组合导出
export const COMMON_NZ_MODULES = [
  FormsModule,
  ReactiveFormsModule,
  NgForOf,
  NgIf,
  NgClass,
  NgStyle,
  AsyncPipe,
  NzButtonModule,
  NzInputModule,
  NzSelectModule,
  NzTableModule,
  NzPaginationModule,
  NzCardModule,
  NzFormModule,
  NzModalModule,
  NzSpinModule,
  NzIconModule,
  NzSpaceModule,
  NzPageHeaderModule
];

// 表单相关组件
export const FORM_NZ_MODULES = [
  FormsModule,
  ReactiveFormsModule,
  NzFormModule,
  NzInputModule,
  NzSelectModule,
  NzRadioModule,
  NzCheckboxModule,
  NzSwitchModule,
  NzButtonModule,
  NzDatePickerModule,
  NzUploadModule,
  NzDescriptionsModule,
  NzLayoutModule,
  NzGridModule
];

// 数据展示相关组件
export const DISPLAY_NZ_MODULES = [
  NzTableModule,
  NzListModule,
  NzCardModule,
  NzDescriptionsModule,
  NzStatisticModule,
  NzTagModule,
  NzBadgeModule,
  NzProgressModule,
  NzAvatarModule,
  NzSkeletonModule,
  NzEmptyModule,
  NzRadioModule
];

// 布局相关组件
export const LAYOUT_NZ_MODULES = [
  NzLayoutModule,
  NzGridModule,
  NzMenuModule,
  NzBreadCrumbModule,
  NzPageHeaderModule,
  NzDividerModule
];

// 反馈相关组件
export const FEEDBACK_NZ_MODULES = [
  NzAlertModule,
  NzModalModule,
  NzDrawerModule,
  NzSpinModule,
  NzPopoverModule,
  NzTooltipModule
];