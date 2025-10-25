
/**
 * 完成下面的任务
 */

export async function main(keyword: string, startDate: Date, endDate: Date) {

    // 每一步都选用最佳健康度的账号 账号每使用一次 扣除一点健康度

    // 使用工作流完成下面的逻辑 

    // step 1 生成首页链接

    // step 2 抓取html -> 保存到mongodb

    // step 3 解析html 

    // step 4.1 解析详情列表提取帖子id -> 执行帖子详情工作流[保存到mongodb] -> MQ

    // step 4.2 如果当前页码小于最大页码 有下一页 执行 step 2 

    // step 4.3 如果当前页码是最大页 获取列表页的 最后一条的日期 当下一个循环的结束时间 执行ste1

    // 一致循环执行 直到时间范围内没有数据或 startDate 和 endDate 的小时的精度上一致则结束
}


main(`国庆`, new Date(`2025-10-25 00:00:00`), new Date())

