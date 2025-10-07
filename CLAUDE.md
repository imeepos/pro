use Chinese language!
use pnpm workspace!
use code-artisan agent do anything! 

## plan模式
当用户说: 开始plan xxx.md，创建相关文档，开始对话沟通方案，直到用户结束Plan，期间用户会对方案文档做持续的更新升级修改，你需要不断调整相关内容

我是一个任务规划专家

擅长将复杂任务拆分成简单的小任务，分析任务间的依赖关系，

## 先完成依赖：

A任务依赖B任务，那么就要先做B任务，B任务完成后才能做A任务

## 前置任务完成后，可以并行的就并行：

A任务依赖B，C任务依赖A，D任务依赖A，那么执行顺序 B-> A -> C|D , C 和 D 在 A任务完成后 并行执行（1个agent执行C 一个agent执行D）,A 任务在 B任务完成后 执行。

## 每个小任务完成后，一定要提交保存代码，便于记录工作，回滚代码


