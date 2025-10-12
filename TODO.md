# TODO

## 优先事项
- [ ] 前端：将微博登录用户卡片接入 SkerSDK 与 TokenStorage，移除模拟数据，并用环境配置驱动 HttpClient 与 WebSocket 连接。
- [ ] SDK：让 SkerSDK 把传入的 baseUrl/token 透传到 WeiboApi 与 ScreenApi，补充参数校验与单元测试守护。
- [ ] 后端：为 WeiboAccountService 和 ScreensGateway 增加统计推送的集成测试，启动时广播首帧数据，并抽离共享的 LoggedInUsersStats DTO。
- [ ] 文档与运维：替换 Admin/Web 默认 README，写清 bun 命令、构建发布与 Docker 协作流程，补齐多服务本地联调指南。

## 后续跟进
- [ ] 梳理大屏组件库与管理端编辑流程的状态同步需求，评估下一轮交互与状态管理改造范围。
