

- 简化WeiboSearchTaskEntity

id: 必须，保留
keyworkd: 必须，保留
startDate: 必须，保留
latestCrawlTime： 必须保留
crawlInterval： 必须，保留
nextRunAt： 必须保留
enabled： 保留

currentCrawlTime： 移除
enableAccountRotation： 移除
status: 移除
progress： 移除
totalSegments： 移除
noDataCount： 移除
noDataThreshold： 移除
retryCount： 移除
maxRetries： 移除
errorMessage： 移除
weiboAccount： 移除
longitude： 移除
latitude： 移除
locationAddress： 移除
locationName： 移除

- 新增 weibo_sub_task.entity.ts

id,task_id,metadata{startTime,endTime,keyword}元数据，不同任务参数不同,type,status

broker负责定时生成 WeiboSubTask
crawler负责处理WeiboSubTask抓取网页数据