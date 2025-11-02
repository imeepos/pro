# Workflow Converters

## to-admin-format

将 WorkflowGraphAst 转换为 Admin 可视化编辑器所需的格式。

### 用法示例

```typescript
import { convertWorkflowToAdminFormat } from '@pro/workflow-core';
import { runWeiboDetailWorkflow } from '@pro/workflow-nestjs';

// 创建 workflow
const workflow = runWeiboDetailWorkflow('mblogid123', 'uid456');

// 转换为 Admin 格式
const { nodes, edges } = convertWorkflowToAdminFormat(workflow);

// 返回的数据可直接用于 Admin 编辑器
console.log(nodes); // WorkflowNodeDraft[]
console.log(edges); // WorkflowEdgeDraft[]
```

### 节点类型映射

| AST Type | Admin Kind |
|----------|------------|
| WeiboAjaxStatusesShowAst | WEIBO_AJAX_STATUSES_SHOW |
| WeiboAjaxStatusesRepostTimelineAst | WEIBO_AJAX_STATUSES_REPOST_TIMELINE |
| WeiboAjaxStatusesMymblogAst | WEIBO_AJAX_STATUSES_MYMBLOG |
| WeiboAjaxStatusesLikeShowAst | WEIBO_AJAX_STATUSES_LIKE_SHOW |
| WeiboAjaxStatusesCommentAst | WEIBO_AJAX_STATUSES_COMMENT |
| WeiboAjaxProfileInfoAst | WEIBO_AJAX_PROFILE_INFO |

### 布局算法

节点按 3 列网格自动排列：
- 水平间距：280px
- 垂直间距：180px
- 排列顺序：从左到右，从上到下
