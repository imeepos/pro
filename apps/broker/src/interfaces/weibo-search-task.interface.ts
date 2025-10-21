export interface WeiboSearchTaskEntity {
  id: number;
  keyword: string;
  startDate: Date;
  latestCrawlTime?: Date;
  crawlInterval: string;
  nextRunAt?: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
