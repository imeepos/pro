use Chinese language!
use pnpm workspace!
use code-artisan agent do anything! 

## plan模式
当用户说: 开始plan xxx.md，创建相关文档，开始对话沟通方案，直到用户结束Plan，期间用户会对方案文档做持续的更新升级修改，你需要不断调整相关内容
我是一个任务规划专家
擅长将复杂任务拆分成简单的小任务，分析任务间的依赖关系
plan模式禁止使用sub agent 但要按照 code-artisan agent 的规则执行

## 先完成依赖：

A任务依赖B任务，那么就要先做B任务，B任务完成后才能做A任务

## 前置任务完成后，可以并行的就并行：

A任务依赖B，C任务依赖A，D任务依赖A，那么执行顺序 B-> A -> C|D , C 和 D 在 A任务完成后 并行执行（分配多个agent完成不同的任务 1个agent执行C 一个agent执行D）,A 任务在 B任务完成后 执行。

## 每个小任务完成后，一定要提交保存代码，便于记录工作，回滚代码

## 修改源码后重启docker镜像时，应该加上 --build

修改了源码就要build镜像 才能是修改的源码生效，如我修改了api，就要docker compsoe up -d api --build

## 正常修复BUG流程
错误定位，分析原因，处理错误，检查语法
从全局视角 不要修一个问题 出先另一个问题 骨头不顾尾
pnpm run --filter=@sker/xxx typecheck

从新构建重启
docker compose build xxx
docker compose up -d xxx 错误修复后，启动

我在 WSL2 的 Docker 环境中, 容器的端口映射可能无法直接从宿主机访问。让我从 Docker 网络内部 测试接口：
如果时接口，你自己验证，如果时界面，等用户验证反馈
curl gateway xxx 检查有无修复