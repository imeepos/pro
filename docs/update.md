# 舆情大屏亮色主题优化建议

## 样式优化
1. 将 `apps/web/src/app/features/home/home.component.html:1` 以及 `apps/web/src/app/features/home/home.component.scss:4-13` 的根容器与视口背景从纯黑渐变调整为低饱和度的浅色渐变（如 `#f8fbff → #e1e8f5`），并同步更新 `apps/web/src/app/features/screen/screen-display.component.ts:241-250`，确保大屏在亮色主题下拥有通透底色，同时保留适度的层次感。
2. 为 `control-panel`、`toolbar-trigger` 等控制组件在 `home.component.scss:29-89` 与 `screen-display.component.ts:354-405` 中引入亮色玻璃拟态风格（浅色底 + 12%~18% 的模糊 + 柔和描边），替换当前深色半透明方案，让操作区在亮色背景下依旧聚焦但不刺眼。
3. 调整 `:host` 级别的基础文字颜色与语义色变量，将 `screen-display.component.ts:203-208` 中的默认字色从 `--pro-slate-100` 迁移到 `--pro-slate-700`，同时为亮色模式补齐信息色（如 `--pro-info: #2563eb`），避免深色文字在浅底上显得灰暗。
4. 重新设计加载与错误态，针对 `home.component.scss:118-143` 与 `screen-display.component.ts:264-299` 使用浅色留白+品牌主色点缀（淡蓝色圆环、柔光背景），以维持亮色主题一致性，并减轻全屏黑底造成的突兀感。

## 布局优化
1. 扩展 `home.component.html:2-13` 的顶部标题栏为「信息栈」布局：左侧维持产品名称，中间增加实时更新时间轴，右侧保留用户信息与操作，使亮色大屏的上沿形成清晰的信息分区。
2. 将 `home.component.html:41-77` 中底部居中的控制面板改为右下角垂直 Dock，利用 `flex-col` + `gap` 组织按钮与分页指示，并在 `home.component.scss` 内为大屏内容预留 24px 安全区，避免遮挡关键图表。
3. 在 `screen-stage` 容器（`home.component.html:17-37`、`screen-display.component.ts:253-262`）外增加自适应留白：根据缩放系数设置最小外边距 48px，以免亮色主题下元素紧贴屏幕边缘而缺乏呼吸空间。
4. 对多屏切换下的布局进行亮色主题对齐：在 `screen-display.component.ts:354-405` 中为 toolbar 提供响应式折叠策略（>1920px 时横向展开，<=1440px 时折叠为图标+Popover），保证大屏在不同分辨率下保持整洁秩序。

## 美观性优化
1. 为组件容器（`home.component.scss:161-178`、`screen-display.component.ts:317-345`）引入浅色描边与柔光阴影组合，例如 1px `rgba(37, 99, 235, 0.15)` 描边 + 16px 柔光投影，营造浮于纸面的数据卡片观感，契合亮色大屏的轻盈感。
2. 在 `screen-viewport` 层（`screen-display.component.ts:241-250`）增加低透明度的极简网格或放射性光束 SVG 纹理，并基于数据强度切换透明度，让背景讲述「信息流动」的叙事，同时不干扰主体信息。
3. 为关键指标组件定义统一的数字排版体系：在 `screen-display.component.ts` 动态渲染的组件内约定主数值使用 64px / `font-weight:700`，辅值使用 18px / `font-weight:500`，并以品牌色强调趋势箭头，使亮色主题下的视觉节奏更加鲜明。
4. 将全屏按钮与播放控制的 emoji 符号（`home.component.html:48-63`、`screen-display.component.ts:49-65`）替换为定制化的极简线性图标，配合亮色描边，可强化专业感并统一视觉语言。
