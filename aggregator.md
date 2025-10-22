# BigScreen 实时数据聚合技术方案

## 概述

基于现有的 NestJS 微服务架构，设计一套完整的实时数据聚合和推送系统，支持 BigScreen 大屏展示的实时数据需求。本方案充分利用现有的 RabbitMQ、Redis、PostgreSQL 基础设施，通过 WebSocket 和 GraphQL Subscription 实现实时数据推送。

## 1. WebSocket + GraphQL Subscription 详细设计

### 1.1 订阅事件类型定义

```typescript
// 订阅事件常量定义
export const BIGSCREEN_EVENTS = {
  SENTIMENT_STATS: 'bigscreen:sentiment:stats',
  TRENDING_TOPICS: 'bigscreen:trending:topics',
  HOT_EVENTS: 'bigscreen:events:hot',
  GEOGRAPHIC_DATA: 'bigscreen:geographic:data',
  REALTIME_METRICS: 'bigscreen:metrics:realtime'
} as const;

// GraphQL Subscription 类型定义
@ObjectType()
export class SentimentStatsUpdate {
  @Field(() => SentimentDistribution)
  distribution: SentimentDistribution;

  @Field(() => Int)
  totalPosts: number;

  @Field(() => Date)
  timestamp: Date;

  @Field(() => [String])
  topKeywords: string[];

  @Field(() => Float)
  avgSentimentScore: number;

  @Field(() => Int)
  activeUsers: number;
}

@ObjectType()
export class TrendingTopicsUpdate {
  @Field(() => [TrendingTopic])
  topics: TrendingTopic[];

  @Field(() => Date)
  timestamp: Date;

  @Field(() => String)
  timeRange: string;
}

@ObjectType()
export class HotEventsUpdate {
  @Field(() => [HotEvent])
  events: HotEvent[];

  @Field(() => Date)
  timestamp: Date;

  @Field(() => Int)
  totalActive: number;
}

@ObjectType()
export class GeographicDataUpdate {
  @Field(() => [GeographicHotspot])
  hotspots: GeographicHotspot[];

  @Field(() => Date)
  timestamp: Date;

  @Field(() -> String)
  keyword: string;
}
```

### 1.2 实时数据推送机制

基于现有的 WebSocket Gateway 架构，扩展支持 BigScreen 实时推送：

```typescript
@Injectable()
@WebSocketGateway({
  namespace: '/bigscreen',
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:4200'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
})
export class BigScreenGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  private logger = new Logger(BigScreenGateway.name);
  private connectedClients = new Map<string, ConnectedClient>();

  constructor(
    private readonly pubSub: PubSubService,
    private readonly authService: AuthService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  afterInit(server: Server) {
    this.logger.log('BigScreen WebSocket Gateway initialized');

    // 订阅内部事件
    this.subscribeToInternalEvents();
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // 验证客户端身份
      const token = client.handshake.auth.token || client.handshake.query.token;
      const user = await this.authService.validateToken(token);

      if (!user) {
        this.logger.warn(`Unauthorized connection attempt from ${client.id}`);
        client.disconnect();
        return;
      }

      // 记录连接信息
      const connectedClient: ConnectedClient = {
        socketId: client.id,
        userId: user.userId,
        username: user.username,
        connectedAt: new Date(),
        subscriptions: new Set(),
        lastActivity: new Date()
      };

      this.connectedClients.set(client.id, connectedClient);

      // 发送连接确认
      client.emit('connected', {
        clientId: client.id,
        serverTime: new Date().toISOString(),
        message: 'Connected to BigScreen real-time service'
      });

      this.logger.log(`Client ${client.id} connected (User: ${user.username})`);

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const connectedClient = this.connectedClients.get(client.id);
    if (connectedClient) {
      this.logger.log(`Client ${client.id} disconnected (User: ${connectedClient.username})`);
      this.connectedClients.delete(client.id);

      // 清理订阅
      await this.cleanupClientSubscriptions(client.id);
    }
  }

  // 订阅特定关键词的情感统计
  @SubscribeMessage('subscribe:sentiment')
  async handleSentimentSubscription(
    client: Socket,
    payload: { keyword?: string; timeRange?: string }
  ) {
    try {
      const { keyword = 'all', timeRange = '1h' } = payload;
      const connectedClient = this.connectedClients.get(client.id);

      if (!connectedClient) {
        client.emit('error', { message: 'Client not authenticated' });
        return;
      }

      const subscriptionKey = `sentiment:${keyword}:${timeRange}`;
      connectedClient.subscriptions.add(subscriptionKey);

      // 立即发送当前数据
      const currentData = await this.getCurrentSentimentStats(keyword, timeRange);
      client.emit('sentiment:update', currentData);

      // 加入 Redis 频道订阅
      await this.redis.subscribe(`bigscreen:${subscriptionKey}`, (message) => {
        try {
          const data = JSON.parse(message);
          client.emit('sentiment:update', data);
        } catch (error) {
          this.logger.error(`Failed to parse sentiment update message:`, error);
        }
      });

      client.emit('subscribed', {
        type: 'sentiment',
        keyword,
        timeRange,
        message: `Successfully subscribed to sentiment updates for ${keyword}`
      });

    } catch (error) {
      this.logger.error(`Sentiment subscription error:`, error);
      client.emit('error', { message: 'Failed to subscribe to sentiment updates' });
    }
  }

  // 订阅热点事件
  @SubscribeMessage('subscribe:events')
  async handleEventsSubscription(
    client: Socket,
    payload: { category?: string; limit?: number }
  ) {
    try {
      const { category = 'all', limit = 20 } = payload;
      const connectedClient = this.connectedClients.get(client.id);

      if (!connectedClient) {
        client.emit('error', { message: 'Client not authenticated' });
        return;
      }

      const subscriptionKey = `events:${category}:${limit}`;
      connectedClient.subscriptions.add(subscriptionKey);

      // 立即发送当前热点事件
      const currentEvents = await this.getCurrentHotEvents(category, limit);
      client.emit('events:update', currentEvents);

      // 订阅后续更新
      await this.redis.subscribe(`bigscreen:${subscriptionKey}`, (message) => {
        try {
          const data = JSON.parse(message);
          client.emit('events:update', data);
        } catch (error) {
          this.logger.error(`Failed to parse events update message:`, error);
        }
      });

      client.emit('subscribed', {
        type: 'events',
        category,
        limit,
        message: `Successfully subscribed to hot events`
      });

    } catch (error) {
      this.logger.error(`Events subscription error:`, error);
      client.emit('error', { message: 'Failed to subscribe to events updates' });
    }
  }

  // 广播情感统计更新
  async broadcastSentimentStatsUpdate(data: SentimentStatsUpdate) {
    const message = JSON.stringify(data);

    // 发布到所有相关频道
    await this.redis.publish('bigscreen:sentiment:all:1h', message);
    await this.redis.publish(`bigscreen:sentiment:${data.keyword || 'all'}:1h`, message);

    // 发布 GraphQL 订阅
    await this.pubSub.publish(BIGSCREEN_EVENTS.SENTIMENT_STATS, data);

    this.logger.debug(`Broadcasted sentiment stats update: ${data.totalPosts} posts`);
  }

  // 广播热点事件更新
  async broadcastHotEventsUpdate(events: HotEvent[]) {
    const data: HotEventsUpdate = {
      events,
      timestamp: new Date(),
      totalActive: events.length
    };

    const message = JSON.stringify(data);

    await this.redis.publish('bigscreen:events:all:20', message);
    await this.pubSub.publish(BIGSCREEN_EVENTS.HOT_EVENTS, data);

    this.logger.debug(`Broadcasted hot events update: ${events.length} events`);
  }

  private async subscribeToInternalEvents() {
    // 订阅内部聚合服务的事件
    this.pubSub.subscribe('aggregation:completed').subscribe({
      next: (event: AggregationCompletedEvent) => {
        this.handleAggregationCompleted(event);
      }
    });
  }

  private async handleAggregationCompleted(event: AggregationCompletedEvent) {
    // 根据聚合结果类型广播更新
    switch (event.type) {
      case 'SENTIMENT':
        await this.broadcastSentimentStatsUpdate(event.data);
        break;
      case 'EVENTS':
        await this.broadcastHotEventsUpdate(event.data);
        break;
      case 'GEOGRAPHIC':
        await this.broadcastGeographicUpdate(event.data);
        break;
    }
  }

  private async getCurrentSentimentStats(keyword: string, timeRange: string): Promise<SentimentStatsUpdate> {
    // 从缓存或数据库获取当前统计数据
    return this.sentimentService.getRealtimeStats(keyword, timeRange);
  }

  private async getCurrentHotEvents(category: string, limit: number): Promise<HotEvent[]> {
    // 从缓存或数据库获取当前热点事件
    return this.eventService.getHotEvents(limit, category);
  }

  private async cleanupClientSubscriptions(clientId: string) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      for (const subscription of client.subscriptions) {
        await this.redis.unsubscribe(`bigscreen:${subscription}`);
      }
    }
  }
}

// 连接客户端接口
interface ConnectedClient {
  socketId: string;
  userId: string;
  username: string;
  connectedAt: Date;
  subscriptions: Set<string>;
  lastActivity: Date;
}
```

### 1.3 GraphQL Subscription 实现

```typescript
@Resolver(() => SentimentStatsUpdate)
export class BigScreenSubscriptionResolver {
  constructor(
    private readonly pubSub: PubSubService,
    private readonly authService: AuthService
  ) {}

  @Subscription(() => SentimentStatsUpdate, {
    filter: (payload: SentimentStatsUpdate, variables, context) => {
      // 基于用户权限过滤数据
      return this.authService.canAccessSentimentData(context.user, payload);
    },
    resolve: (payload) => payload
  })
  sentimentStatsUpdated(
    @Args('keyword', { nullable: true }) keyword?: string,
    @Args('timeRange', { defaultValue: '1h' }) timeRange?: string
  ) {
    return this.pubSub.asyncIterator(BIGSCREEN_EVENTS.SENTIMENT_STATS);
  }

  @Subscription(() => TrendingTopicsUpdate, {
    filter: (payload: TrendingTopicsUpdate, variables, context) => {
      return this.authService.canAccessTrendingData(context.user, payload);
    }
  })
  trendingTopicsUpdated(
    @Args('limit', { defaultValue: 10 }) limit?: number
  ) {
    return this.pubSub.asyncIterator(BIGSCREEN_EVENTS.TRENDING_TOPICS);
  }

  @Subscription(() => HotEventsUpdate, {
    filter: (payload: HotEventsUpdate, variables, context) => {
      return this.authService.canAccessEventData(context.user, payload);
    }
  })
  hotEventsUpdated(
    @Args('category', { nullable: true }) category?: string,
    @Args('limit', { defaultValue: 20 }) limit?: number
  ) {
    return this.pubSub.asyncIterator(BIGSCREEN_EVENTS.HOT_EVENTS);
  }

  @Subscription(() => GeographicDataUpdate, {
    filter: (payload: GeographicDataUpdate, variables, context) => {
      return this.authService.canAccessGeographicData(context.user, payload);
    }
  })
  geographicDataUpdated(
    @Args('keyword', { type: () => String }) keyword: string
  ) {
    return this.pubSub.asyncIterator(BIGSCREEN_EVENTS.GEOGRAPHIC_DATA);
  }
}
```

## 2. 底层数据库结构设计

### 2.1 新增统计实体设计

```typescript
// 实时舆情统计实体
@Entity('realtime_sentiment_stats')
@Index(['keyword', 'timestamp'], { unique: false })
@Index(['timestamp'], { unique: false })
@Index(['keyword', 'timestamp', 'post_count'], { unique: false })
export class RealtimeSentimentStatsEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  keyword: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'jsonb', default: {} })
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @Column({ type: 'integer', default: 0 })
  postCount: number;

  @Column({ type: 'integer', default: 0 })
  commentCount: number;

  @Column({ type: 'integer', default: 0 })
  repostCount: number;

  @Column({ type: 'integer', default: 0 })
  attitudeCount: number;

  @Column({ type: 'jsonb', default: [] })
  topKeywords: Array<{
    word: string;
    count: number;
    sentiment: number;
  }>;

  @Column({ type: 'float', default: 0.0 })
  avgSentimentScore: number;

  @Column({ type: 'jsonb', nullable: true })
  geographicDistribution: Record<string, {
    count: number;
    sentiment: number;
    posts: string[];
  }>;

  @Column({ type: 'jsonb', nullable: true })
  topUsers: Array<{
    userId: string;
    username: string;
    followers: number;
    contribution: number;
  }>;

  @Column({ type: 'varchar', length: 50, default: '5min' })
  aggregationWindow: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}

// 热点事件趋势实体
@Entity('event_trend_data')
@Index(['eventId', 'timestamp'], { unique: false })
@Index(['timestamp'], { unique: false })
@Index(['eventId', 'timestamp', 'mention_count'], { unique: false })
export class EventTrendEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'integer' })
  eventId: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'integer', default: 0 })
  mentionCount: number;

  @Column({ type: 'integer', default: 0 })
  engagementCount: number;

  @Column({ type: 'float', default: 0.0 })
  sentimentScore: number;

  @Column({ type: 'jsonb', nullable: true })
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  topContributors: Array<{
    userId: string;
    username: string;
    followers: number;
    contribution: number;
    sentiment: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  relatedKeywords: Array<{
    keyword: string;
    count: number;
    growth: number;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  geographicSpread: Record<string, number>;

  @Column({ type: 'float', nullable: true })
  velocity: number; // 传播速度

  @Column({ type: 'float', nullable: true })
  acceleration: number; // 传播加速度

  @Column({ type: 'varchar', length: 50, default: '5min' })
  timeWindow: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}

// 地理位置热点实体
@Entity('geographic_hotspots')
@Index(['location_hash', 'timestamp'], { unique: false })
@Index(['timestamp'], { unique: false })
@Index(['province', 'city', 'timestamp'], { unique: false })
export class GeographicHotspotEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  locationHash: string; // province + city 的 MD5 hash

  @Column({ type: 'varchar', length: 50 })
  province: string;

  @Column({ type: 'varchar', length: 50 })
  city: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  district: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'integer', default: 0 })
  postCount: number;

  @Column({ type: 'integer', default: 0 })
  uniqueUsers: number;

  @Column({ type: 'float', default: 0.0 })
  avgSentimentScore: number;

  @Column({ type: 'jsonb', nullable: true })
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };

  @Column({ type: 'jsonb', default: [] })
  topKeywords: Array<{
    word: string;
    count: number;
    sentiment: number;
  }>;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'integer', default: 0 })
  influenceScore: number; // 影响力评分

  @Column({ type: 'jsonb', nullable: true })
  topInfluencers: Array<{
    userId: string;
    username: string;
    followers: number;
    posts: number;
  }>;

  @Column({ type: 'varchar', length: 50, default: '5min' })
  aggregationWindow: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  // 生成位置哈希
  static generateLocationHash(province: string, city: string, district?: string): string {
    const location = [province, city, district].filter(Boolean).join('-');
    return crypto.createHash('md5').update(location).digest('hex');
  }
}

// 实时指标实体
@Entity('realtime_metrics')
@Index(['metric_name', 'timestamp'], { unique: false })
@Index(['timestamp'], { unique: false })
export class RealtimeMetricsEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  metricName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  keyword: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'jsonb' })
  value: any; // 可以是数字、对象或数组

  @Column({ type: 'varchar', length: 20 })
  valueType: 'number' | 'string' | 'object' | 'array';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: 'realtime' })
  aggregationType: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}
```

### 2.2 索引优化策略

```sql
-- 实时统计查询优化
CREATE INDEX CONCURRENTLY idx_realtime_stats_keyword_time_desc
ON realtime_sentiment_stats(keyword, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_realtime_stats_time_keyword
ON realtime_sentiment_stats(timestamp, keyword);

CREATE INDEX CONCURRENTLY idx_realtime_stats_composite
ON realtime_sentiment_stats(keyword, timestamp DESC, post_count);

-- 地理数据查询优化
CREATE INDEX CONCURRENTLY idx_geo_hotspot_location_time
ON geographic_hotspots(province, city, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_geo_hotspot_hash_time
ON geographic_hotspots(location_hash, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_geo_hotspot_province_time
ON geographic_hotspots(province, timestamp DESC);

-- 事件趋势查询优化
CREATE INDEX CONCURRENTLY idx_event_trend_event_time
ON event_trend_data(event_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_event_trend_time_event
ON event_trend_data(timestamp, event_id);

CREATE INDEX CONCURRENTLY idx_event_trend_velocity
ON event_trend_data(velocity DESC, timestamp DESC);

-- 实时指标查询优化
CREATE INDEX CONCURRENTLY idx_realtime_metrics_name_time
ON realtime_metrics(metric_name, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_realtime_metrics_category_time
ON realtime_metrics(category, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_realtime_metrics_keyword_time
ON realtime_metrics(keyword, timestamp DESC);

-- 复合索引用于复杂查询
CREATE INDEX CONCURRENTLY idx_realtime_stats_keyword_sentiment
ON realtime_sentiment_stats(keyword, avg_sentiment_score DESC, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_geo_hotspot_influence
ON geographic_hotspots(influence_score DESC, timestamp DESC);

-- 时间序列索引
CREATE INDEX CONCURRENTLY idx_realtime_stats_timestamp_btree
ON realtime_sentiment_stats(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_event_trend_timestamp_btree
ON event_trend_data(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_geo_hotspot_timestamp_btree
ON geographic_hotspots(timestamp DESC);
```

### 2.3 数据分区方案

```sql
-- 按时间分区实时统计表
CREATE TABLE realtime_sentiment_stats_y2024m01
PARTITION OF realtime_sentiment_stats
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE realtime_sentiment_stats_y2024m02
PARTITION OF realtime_sentiment_stats
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 按地区分区地理数据
CREATE TABLE geographic_hotspots_north
PARTITION OF geographic_hotspots
FOR VALUES IN ('北京', '天津', '河北', '山西', '内蒙古');

CREATE TABLE geographic_hotspots_east
PARTITION OF geographic_hotspots
FOR VALUES IN ('上海', '江苏', '浙江', '安徽', '福建', '江西', '山东');

CREATE TABLE geographic_hotspots_south
PARTITION OF geographic_hotspots
FOR VALUES IN ('广东', '广西', '海南', '香港', '澳门');

CREATE TABLE geographic_hotspots_central
PARTITION OF geographic_hotspots
FOR VALUES IN ('河南', '湖北', '湖南');

CREATE TABLE geographic_hotspots_west
PARTITION OF geographic_hotspots
FOR VALUES IN ('重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆');

-- 创建自动分区的函数
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_y' || EXTRACT(year FROM start_date) || 'm' || LPAD(EXTRACT(month FROM start_date)::text, 2, '0');
    end_date := start_date + interval '1 month';

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (timestamp DESC)',
                   'idx_' || partition_name || '_timestamp', partition_name);
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务自动创建分区
SELECT cron.schedule('create-partitions', '0 0 1 * *',
    'SELECT create_monthly_partition(''realtime_sentiment_stats'', date_trunc(''month'', CURRENT_DATE + interval ''1 month''));'
);
```

## 3. 数据聚合方案

### 3.1 实时聚合服务

```typescript
@Injectable()
export class RealtimeAggregationService {
  private readonly logger = new Logger(RealtimeAggregationService.name);

  constructor(
    @InjectRepository(WeiboPostEntity)
    private readonly postRepository: Repository<WeiboPostEntity>,
    @InjectRepository(RealtimeSentimentStatsEntity)
    private readonly statsRepository: Repository<RealtimeSentimentStatsEntity>,
    @InjectRepository(GeographicHotspotEntity)
    private readonly geoRepository: Repository<GeographicHotspotEntity>,
    @InjectRedis() private readonly redis: Redis,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly pubSub: PubSubService
  ) {}

  // 滑动窗口聚合
  async aggregateSlidingWindow(
    keyword: string,
    windowMinutes: number = 5,
    startTime?: Date
  ): Promise<RealtimeSentimentStatsEntity> {
    const cacheKey = `sentiment:window:${keyword}:${windowMinutes}`;
    const windowStart = startTime || new Date(Date.now() - windowMinutes * 60 * 1000);
    const windowEnd = new Date();

    this.logger.debug(`Starting sliding window aggregation for ${keyword}, window: ${windowMinutes}min`);

    try {
      // 从 Redis 缓存获取
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        this.logger.debug(`Cache hit for ${cacheKey}`);
        return data;
      }

      // 查询数据库获取原始数据
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.analysisResult', 'analysis')
        .leftJoinAndSelect('post.author', 'author')
        .where('post.createdAt >= :windowStart AND post.createdAt <= :windowEnd', {
          windowStart,
          windowEnd
        });

      if (keyword !== 'all') {
        queryBuilder.andWhere('post.text ILIKE :keyword', { keyword: `%${keyword}%` });
      }

      const posts = await queryBuilder.getMany();

      // 聚合计算
      const aggregatedStats = await this.calculateAggregatedStats(posts, keyword, windowStart, windowEnd);

      // 保存到数据库
      const statsEntity = this.statsRepository.create(aggregatedStats);
      await this.statsRepository.save(statsEntity);

      // 缓存结果（短时间缓存）
      await this.redis.setex(cacheKey, 30, JSON.stringify(statsEntity));

      // 发布聚合完成事件
      await this.pubSub.publish('aggregation:completed', {
        type: 'SENTIMENT',
        keyword,
        data: statsEntity,
        timestamp: new Date()
      } as AggregationCompletedEvent);

      this.logger.debug(`Sliding window aggregation completed for ${keyword}: ${posts.length} posts processed`);

      return statsEntity;

    } catch (error) {
      this.logger.error(`Sliding window aggregation failed for ${keyword}:`, error);
      throw error;
    }
  }

  // 增量更新聚合
  async incrementalUpdate(postId: number, analysisResult: AnalysisResultEntity) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['author', 'analysisResult']
      });

      if (!post || !post.analysisResult) {
        return;
      }

      // 提取关键词
      const keywords = this.extractKeywords(post, analysisResult);

      // 更新每个关键词的统计
      for (const keyword of keywords) {
        await this.updateKeywordStats(keyword, post, analysisResult);
        await this.updateRealtimeCache(keyword, post, analysisResult);
      }

      // 更新地理位置统计
      if (post.author?.location) {
        await this.updateGeographicStats(post, analysisResult);
      }

      // 触发 WebSocket 推送
      await this.broadcastUpdates(keywords, post, analysisResult);

      this.logger.debug(`Incremental update completed for post ${postId}, keywords: ${keywords.join(', ')}`);

    } catch (error) {
      this.logger.error(`Incremental update failed for post ${postId}:`, error);
    }
  }

  private async calculateAggregatedStats(
    posts: WeiboPostEntity[],
    keyword: string,
    windowStart: Date,
    windowEnd: Date
  ): Promise<Partial<RealtimeSentimentStatsEntity>> {

    if (posts.length === 0) {
      return {
        keyword,
        timestamp: new Date(),
        postCount: 0,
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
        avgSentimentScore: 0,
        topKeywords: [],
        geographicDistribution: {},
        topUsers: []
      };
    }

    // 基础统计
    const totalPosts = posts.length;
    const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
    const totalReposts = posts.reduce((sum, post) => sum + post.repostsCount, 0);
    const totalAttitudes = posts.reduce((sum, post) => sum + post.attitudesCount, 0);

    // 情感分析聚合
    const sentimentData = posts.reduce((acc, post) => {
      if (post.analysisResult) {
        const sentiment = post.analysisResult.sentiment;
        if (sentiment > 0.6) acc.positive++;
        else if (sentiment < 0.4) acc.negative++;
        else acc.neutral++;

        acc.totalScore += sentiment;
        acc.validScores++;
      }
      return acc;
    }, { positive: 0, neutral: 0, negative: 0, totalScore: 0, validScores: 0 });

    const avgSentimentScore = sentimentData.validScores > 0
      ? sentimentData.totalScore / sentimentData.validScores
      : 0;

    // 关键词提取和统计
    const keywordStats = this.aggregateKeywords(posts);

    // 地理位置聚合
    const geoStats = this.aggregateGeographicData(posts);

    // 用户贡献统计
    const userStats = this.aggregateUserContributions(posts);

    return {
      keyword,
      timestamp: new Date(),
      postCount: totalPosts,
      commentCount: totalComments,
      repostCount: totalReposts,
      attitudeCount: totalAttitudes,
      sentimentDistribution: {
        positive: sentimentData.positive,
        neutral: sentimentData.neutral,
        negative: sentimentData.negative
      },
      avgSentimentScore,
      topKeywords: keywordStats,
      geographicDistribution: geoStats,
      topUsers: userStats,
      aggregationWindow: '5min'
    };
  }

  private aggregateKeywords(posts: WeiboPostEntity[]): Array<{word: string, count: number, sentiment: number}> {
    const keywordMap = new Map<string, {count: number, totalSentiment: number, validSentiment: number}>();

    posts.forEach(post => {
      if (post.analysisResult?.primaryKeywords) {
        post.analysisResult.primaryKeywords.forEach(keyword => {
          const existing = keywordMap.get(keyword) || { count: 0, totalSentiment: 0, validSentiment: 0 };
          existing.count++;

          if (post.analysisResult.sentiment !== null) {
            existing.totalSentiment += post.analysisResult.sentiment;
            existing.validSentiment++;
          }

          keywordMap.set(keyword, existing);
        });
      }
    });

    return Array.from(keywordMap.entries())
      .map(([word, data]) => ({
        word,
        count: data.count,
        sentiment: data.validSentiment > 0 ? data.totalSentiment / data.validSentiment : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private aggregateGeographicData(posts: WeiboPostEntity[]): Record<string, any> {
    const geoMap = new Map<string, {count: number, totalSentiment: number, validSentiment: number, posts: string[]}>();

    posts.forEach(post => {
      const location = post.author?.location || '未知';
      const existing = geoMap.get(location) || { count: 0, totalSentiment: 0, validSentiment: 0, posts: [] };
      existing.count++;
      existing.posts.push(post.mblogId || post.id.toString());

      if (post.analysisResult?.sentiment !== null) {
        existing.totalSentiment += post.analysisResult.sentiment;
        existing.validSentiment++;
      }

      geoMap.set(location, existing);
    });

    const result: Record<string, any> = {};
    geoMap.forEach((data, location) => {
      result[location] = {
        count: data.count,
        sentiment: data.validSentiment > 0 ? data.totalSentiment / data.validSentiment : 0,
        posts: data.posts.slice(0, 10) // 只保留前10个帖子ID
      };
    });

    return result;
  }

  private aggregateUserContributions(posts: WeiboPostEntity[]): Array<{
    userId: string,
    username: string,
    followers: number,
    contribution: number
  }> {
    const userMap = new Map<string, {username: string, followers: number, contribution: number}>();

    posts.forEach(post => {
      if (post.author) {
        const existing = userMap.get(post.author.weiboId) || {
          username: post.author.screenName || '未知用户',
          followers: post.author.followersCount || 0,
          contribution: 0
        };
        existing.contribution += (post.repostsCount + post.commentsCount + post.attitudesCount);
        userMap.set(post.author.weiboId, existing);
      }
    });

    return Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 10);
  }

  private extractKeywords(post: WeiboPostEntity, analysisResult: AnalysisResultEntity): string[] {
    const keywords = new Set<string>();

    // 从分析结果中提取关键词
    if (analysisResult.primaryKeywords) {
      analysisResult.primaryKeywords.forEach(k => keywords.add(k));
    }

    if (analysisResult.secondaryKeywords) {
      analysisResult.secondaryKeywords.forEach(k => keywords.add(k));
    }

    // 如果没有关键词，使用默认关键词
    if (keywords.size === 0) {
      keywords.add('all');
    }

    return Array.from(keywords);
  }

  private async updateKeywordStats(
    keyword: string,
    post: WeiboPostEntity,
    analysisResult: AnalysisResultEntity
  ) {
    // 更新 Redis 中的实时统计
    const redisKey = `realtime:stats:${keyword}`;
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(redisKey, 'postCount', 1);
    pipeline.hincrby(redisKey, 'commentCount', post.commentsCount);
    pipeline.hincrby(redisKey, 'repostCount', post.repostsCount);
    pipeline.hincrby(redisKey, 'attitudeCount', post.attitudesCount);

    // 更新情感统计
    if (analysisResult.sentiment !== null) {
      if (analysisResult.sentiment > 0.6) {
        pipeline.hincrby(redisKey, 'positiveCount', 1);
      } else if (analysisResult.sentiment < 0.4) {
        pipeline.hincrby(redisKey, 'negativeCount', 1);
      } else {
        pipeline.hincrby(redisKey, 'neutralCount', 1);
      }
    }

    pipeline.expire(redisKey, 3600); // 1小时过期
    await pipeline.exec();
  }

  private async updateRealtimeCache(
    keyword: string,
    post: WeiboPostEntity,
    analysisResult: AnalysisResultEntity
  ) {
    // 更新关键词时间窗口缓存
    const timeWindows = ['1min', '5min', '15min', '1h'];

    for (const window of timeWindows) {
      const cacheKey = `window:${keyword}:${window}`;
      await this.redis.expire(cacheKey, 30); // 设置短过期时间，强制重新计算
    }
  }

  private async updateGeographicStats(post: WeiboPostEntity, analysisResult: AnalysisResultEntity) {
    const location = post.author?.location;
    if (!location) return;

    const redisKey = `geo:stats:${location}`;
    const pipeline = this.redis.pipeline();

    pipeline.hincrby(redisKey, 'postCount', 1);
    pipeline.hincrby(redisKey, 'commentCount', post.commentsCount);
    pipeline.hincrby(redisKey, 'repostCount', post.repostsCount);

    if (analysisResult.sentiment !== null) {
      pipeline.hincrbyfloat(redisKey, 'totalSentiment', analysisResult.sentiment);
      pipeline.hincrby(redisKey, 'validSentiment', 1);
    }

    pipeline.expire(redisKey, 3600);
    await pipeline.exec();
  }

  private async broadcastUpdates(
    keywords: string[],
    post: WeiboPostEntity,
    analysisResult: AnalysisResultEntity
  ) {
    for (const keyword of keywords) {
      try {
        // 获取更新后的统计数据
        const updatedStats = await this.aggregateSlidingWindow(keyword, 5);

        // 通过 WebSocket 广播
        await this.pubSub.publish(BIGSCREEN_EVENTS.SENTIMENT_STATS, updatedStats);

        // 通过 Redis 频道发布
        const message = JSON.stringify(updatedStats);
        await this.redis.publish(`bigscreen:sentiment:${keyword}:5min`, message);

      } catch (error) {
        this.logger.error(`Failed to broadcast update for keyword ${keyword}:`, error);
      }
    }
  }

  // 批量聚合多个关键词
  async batchAggregateKeywords(keywords: string[], windowMinutes: number = 5): Promise<RealtimeSentimentStatsEntity[]> {
    const results = await Promise.allSettled(
      keywords.map(keyword => this.aggregateSlidingWindow(keyword, windowMinutes))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<RealtimeSentimentStatsEntity>).value);
  }
}

// 聚合完成事件接口
interface AggregationCompletedEvent {
  type: 'SENTIMENT' | 'EVENTS' | 'GEOGRAPHIC';
  keyword?: string;
  data: any;
  timestamp: Date;
}
```

### 3.2 批量聚合服务

```typescript
@Injectable()
export class BatchAggregationService {
  private readonly logger = new Logger(BatchAggregationService.name);

  constructor(
    private readonly realtimeAggregationService: RealtimeAggregationService,
    @InjectRepository(WeiboPostEntity)
    private readonly postRepository: Repository<WeiboPostEntity>,
    @InjectRepository(EventTrendEntity)
    private readonly eventTrendRepository: Repository<EventTrendEntity>,
    @InjectRepository(GeographicHotspotEntity)
    private readonly geoHotspotRepository: Repository<GeographicHotspotEntity>,
    @InjectRedis() private readonly redis: Redis,
    private readonly pubSub: PubSubService
  ) {}

  // 每5分钟执行的实时聚合任务
  @Cron('0 */5 * * * *')
  async batchAggregateSentiment() {
    this.logger.debug('Starting 5-minute batch sentiment aggregation');

    try {
      // 获取活跃关键词
      const activeKeywords = await this.getActiveKeywords();

      if (activeKeywords.length === 0) {
        this.logger.debug('No active keywords found, skipping aggregation');
        return;
      }

      // 并行聚合所有关键词
      const results = await this.realtimeAggregationService.batchAggregateKeywords(activeKeywords, 5);

      this.logger.log(`Completed batch aggregation for ${activeKeywords.length} keywords`);

      // 发布聚合完成事件
      await this.pubSub.publish('batch:aggregation:completed', {
        type: 'SENTIMENT_5MIN',
        keywords: activeKeywords,
        resultsCount: results.length,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error('5-minute batch aggregation failed:', error);
    }
  }

  // 每小时执行的聚合任务
  @Cron('0 0 * * * *')
  async hourlyBatchAggregation() {
    this.logger.debug('Starting hourly batch aggregation');

    try {
      await Promise.allSettled([
        this.aggregateGeographicData(),
        this.aggregateEventTrends(),
        this.aggregateHourlyStats(),
        this.cleanupOldData()
      ]);

      this.logger.log('Hourly batch aggregation completed');

    } catch (error) {
      this.logger.error('Hourly batch aggregation failed:', error);
    }
  }

  // 每日聚合任务
  @Cron('0 0 0 * * *')
  async dailyBatchAggregation() {
    this.logger.info('Starting daily batch aggregation');

    try {
      await Promise.allSettled([
        this.generateDailyReports(),
        this.optimizeDatabase(),
        this.backupAggregatedData()
      ]);

      this.logger.info('Daily batch aggregation completed');

    } catch (error) {
      this.logger.error('Daily batch aggregation failed:', error);
    }
  }

  private async getActiveKeywords(): Promise<string[]> {
    const cacheKey = 'active:keywords:5min';

    // 从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库获取最近5分钟有新帖子的关键词
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.postRepository
      .createQueryBuilder('post')
      .select('DISTINCT COALESCE(analysis.primaryKeywords[1], \'all\')', 'keyword')
      .leftJoin('post.analysisResult', 'analysis')
      .where('post.createdAt >= :fiveMinutesAgo', { fiveMinutesAgo })
      .andWhere('analysis.primaryKeywords IS NOT NULL')
      .limit(50) // 限制最多50个关键词
      .getRawMany();

    const keywords = result.map(row => row.keyword).filter(Boolean);

    // 缓存结果
    await this.redis.setex(cacheKey, 300, JSON.stringify(keywords)); // 5分钟缓存

    return keywords.length > 0 ? keywords : ['all'];
  }

  private async aggregateGeographicData() {
    this.logger.debug('Aggregating geographic data');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 获取最近一小时的帖子及其地理位置
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.analysisResult', 'analysis')
      .where('post.createdAt >= :oneHourAgo', { oneHourAgo })
      .andWhere('author.location IS NOT NULL')
      .getMany();

    // 按地理位置分组统计
    const locationGroups = new Map<string, WeiboPostEntity[]>();

    posts.forEach(post => {
      const location = post.author?.location;
      if (location) {
        const existing = locationGroups.get(location) || [];
        existing.push(post);
        locationGroups.set(location, existing);
      }
    });

    // 为每个地理位置生成热点数据
    for (const [location, locationPosts] of locationGroups) {
      await this.createGeographicHotspot(location, locationPosts);
    }

    this.logger.debug(`Aggregated geographic data for ${locationGroups.size} locations`);
  }

  private async createGeographicHotspot(location: string, posts: WeiboPostEntity[]) {
    // 解析地理位置
    const locationParts = location.split(/[，,\s]+/);
    const province = locationParts[0];
    const city = locationParts[1] || province;
    const district = locationParts[2];

    // 生成位置哈希
    const locationHash = GeographicHotspotEntity.generateLocationHash(province, city, district);

    // 计算统计数据
    const stats = this.calculateLocationStats(posts);

    // 创建热点实体
    const hotspot = this.geoHotspotRepository.create({
      locationHash,
      province,
      city,
      district,
      ...stats,
      aggregationWindow: '1h'
    });

    await this.geoHotspotRepository.save(hotspot);

    // 发布地理位置更新事件
    await this.pubSub.publish(BIGSCREEN_EVENTS.GEOGRAPHIC_DATA, {
      hotspots: [hotspot],
      timestamp: new Date(),
      keyword: 'all'
    });
  }

  private calculateLocationStats(posts: WeiboPostEntity[]) {
    const totalPosts = posts.length;
    const uniqueUsers = new Set(posts.map(p => p.author?.weiboId).filter(Boolean)).size;

    const sentimentData = posts.reduce((acc, post) => {
      if (post.analysisResult?.sentiment !== null) {
        if (post.analysisResult.sentiment > 0.6) acc.positive++;
        else if (post.analysisResult.sentiment < 0.4) acc.negative++;
        else acc.neutral++;

        acc.totalScore += post.analysisResult.sentiment;
        acc.validScores++;
      }
      return acc;
    }, { positive: 0, neutral: 0, negative: 0, totalScore: 0, validScores: 0 });

    const avgSentimentScore = sentimentData.validScores > 0
      ? sentimentData.totalScore / sentimentData.validScores
      : 0;

    // 计算影响力评分
    const influenceScore = posts.reduce((sum, post) => {
      return sum + post.repostsCount + post.commentsCount + post.attitudesCount;
    }, 0);

    // 提取顶级用户
    const topInfluencers = posts
      .map(post => post.author)
      .filter(Boolean)
      .sort((a, b) => (b?.followersCount || 0) - (a?.followersCount || 0))
      .slice(0, 5)
      .map(author => ({
        userId: author!.weiboId,
        username: author!.screenName,
        followers: author!.followersCount || 0,
        posts: 1
      }));

    return {
      timestamp: new Date(),
      postCount: totalPosts,
      uniqueUsers,
      avgSentimentScore,
      sentimentDistribution: {
        positive: sentimentData.positive,
        neutral: sentimentData.neutral,
        negative: sentimentData.negative
      },
      influenceScore,
      topInfluencers,
      topKeywords: this.extractTopKeywords(posts)
    };
  }

  private extractTopKeywords(posts: WeiboPostEntity[]): Array<{word: string, count: number, sentiment: number}> {
    const keywordMap = new Map<string, {count: number, totalSentiment: number, validSentiment: number}>();

    posts.forEach(post => {
      if (post.analysisResult?.primaryKeywords) {
        post.analysisResult.primaryKeywords.forEach(keyword => {
          const existing = keywordMap.get(keyword) || { count: 0, totalSentiment: 0, validSentiment: 0 };
          existing.count++;

          if (post.analysisResult.sentiment !== null) {
            existing.totalSentiment += post.analysisResult.sentiment;
            existing.validSentiment++;
          }

          keywordMap.set(keyword, existing);
        });
      }
    });

    return Array.from(keywordMap.entries())
      .map(([word, data]) => ({
        word,
        count: data.count,
        sentiment: data.validSentiment > 0 ? data.totalSentiment / data.validSentiment : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async aggregateEventTrends() {
    this.logger.debug('Aggregating event trends');

    // 获取热点事件
    const hotEvents = await this.getHotEvents();

    for (const event of hotEvents) {
      await this.updateEventTrend(event);
    }
  }

  private async getHotEvents(): Promise<any[]> {
    // 这里需要实现热点事件识别逻辑
    // 可以基于关键词密度、帖子增长速度等指标
    return [];
  }

  private async updateEventTrend(event: any) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // 查询与事件相关的帖子
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.analysisResult', 'analysis')
      .where('post.createdAt >= :oneHourAgo', { oneHourAgo })
      .andWhere('post.text ILIKE :keyword', { keyword: `%${event.keyword}%` })
      .getMany();

    // 计算趋势数据
    const trendData = this.calculateEventTrendData(event, posts);

    // 保存趋势数据
    const eventTrend = this.eventTrendRepository.create({
      eventId: event.id,
      ...trendData,
      timeWindow: '1h'
    });

    await this.eventTrendRepository.save(eventTrend);
  }

  private calculateEventTrendData(event: any, posts: WeiboPostEntity[]) {
    const mentionCount = posts.length;
    const engagementCount = posts.reduce((sum, post) =>
      sum + post.repostsCount + post.commentsCount + post.attitudesCount, 0);

    const sentimentData = posts.reduce((acc, post) => {
      if (post.analysisResult?.sentiment !== null) {
        if (post.analysisResult.sentiment > 0.6) acc.positive++;
        else if (post.analysisResult.sentiment < 0.4) acc.negative++;
        else acc.neutral++;

        acc.totalScore += post.analysisResult.sentiment;
        acc.validScores++;
      }
      return acc;
    }, { positive: 0, neutral: 0, negative: 0, totalScore: 0, validScores: 0 });

    const sentimentScore = sentimentData.validScores > 0
      ? sentimentData.totalScore / sentimentData.validScores
      : 0;

    return {
      timestamp: new Date(),
      mentionCount,
      engagementCount,
      sentimentScore,
      sentimentDistribution: {
        positive: sentimentData.positive,
        neutral: sentimentData.neutral,
        negative: sentimentData.negative
      }
    };
  }

  private async aggregateHourlyStats() {
    this.logger.debug('Aggregating hourly statistics');

    // 保存小时级别的聚合数据
    // 这里可以调用现有的 HourlyStatsEntity 逻辑
  }

  private async cleanupOldData() {
    this.logger.debug('Cleaning up old data');

    // 删除超过7天的实时统计数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await Promise.allSettled([
      this.statsRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :sevenDaysAgo', { sevenDaysAgo })
        .execute(),

      this.geoHotspotRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :sevenDaysAgo', { sevenDaysAgo })
        .execute(),

      this.eventTrendRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :sevenDaysAgo', { sevenDaysAgo })
        .execute()
    ]);

    this.logger.debug('Old data cleanup completed');
  }

  private async generateDailyReports() {
    this.logger.info('Generating daily reports');

    // 生成日报数据
    // 可以包括舆情趋势、热点事件总结、地理分布变化等
  }

  private async optimizeDatabase() {
    this.logger.debug('Optimizing database');

    // 执行数据库优化操作
    // 更新表统计信息、重建索引等
  }

  private async backupAggregatedData() {
    this.logger.debug('Backing up aggregated data');

    // 备份重要的聚合数据
  }
}
```

### 3.3 缓存设计和优化

```typescript
@Injectable()
export class AggregationCacheService {
  private readonly logger = new Logger(AggregationCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  // 多层缓存策略
  async getCachedStats(
    keyword: string,
    timeRange: string,
    type: 'sentiment' | 'geographic' | 'events' = 'sentiment'
  ): Promise<any> {
    const cacheKey = `stats:${type}:${keyword}:${timeRange}`;

    // L1: Redis 缓存（5秒最新数据）
    let result = await this.redis.get(cacheKey);
    if (result) {
      this.logger.debug(`L1 cache hit for ${cacheKey}`);
      return JSON.parse(result);
    }

    // L2: 预计算缓存（30秒聚合数据）
    const precomputedKey = `precomputed:${type}:${keyword}:${timeRange}`;
    result = await this.redis.get(precomputedKey);
    if (result) {
      // 更新L1缓存
      await this.redis.setex(cacheKey, 5, result);
      this.logger.debug(`L2 cache hit for ${precomputedKey}`);
      return JSON.parse(result);
    }

    // L3: 历史数据缓存（5分钟）
    const historicalKey = `historical:${type}:${keyword}:${timeRange}`;
    result = await this.redis.get(historicalKey);
    if (result) {
      // 更新L2和L1缓存
      await this.redis.setex(precomputedKey, 30, result);
      await this.redis.setex(cacheKey, 5, result);
      this.logger.debug(`L3 cache hit for ${historicalKey}`);
      return JSON.parse(result);
    }

    return null;
  }

  // 设置缓存数据
  async setCachedStats(
    keyword: string,
    timeRange: string,
    data: any,
    type: 'sentiment' | 'geographic' | 'events' = 'sentiment'
  ) {
    const serializedData = JSON.stringify(data);

    // 设置所有层级的缓存
    await Promise.allSettled([
      this.redis.setex(`stats:${type}:${keyword}:${timeRange}`, 5, serializedData), // L1: 5秒
      this.redis.setex(`precomputed:${type}:${keyword}:${timeRange}`, 30, serializedData), // L2: 30秒
      this.redis.setex(`historical:${type}:${keyword}:${timeRange}`, 300, serializedData) // L3: 5分钟
    ]);

    this.logger.debug(`Cache set for ${type}:${keyword}:${timeRange}`);
  }

  // 缓存预热
  async warmupCache(keywords: string[]) {
    this.logger.info(`Starting cache warmup for ${keywords.length} keywords`);

    const timeRanges = ['1min', '5min', '15min', '1h', '6h', '24h'];
    const types: Array<'sentiment' | 'geographic' | 'events'> = ['sentiment', 'geographic', 'events'];

    const warmupTasks = [];

    for (const type of types) {
      for (const keyword of keywords) {
        for (const timeRange of timeRanges) {
          warmupTasks.push(
            this.precomputeStats(keyword, timeRange, type)
              .catch(error => this.logger.error(`Cache warmup failed for ${type}:${keyword}:${timeRange}:`, error))
          );
        }
      }
    }

    await Promise.allSettled(warmupTasks);
    this.logger.info('Cache warmup completed');
  }

  // 预计算统计数据
  private async precomputeStats(
    keyword: string,
    timeRange: string,
    type: 'sentiment' | 'geographic' | 'events'
  ) {
    const precomputedKey = `precomputed:${type}:${keyword}:${timeRange}`;

    // 检查是否已经存在预计算数据
    const exists = await this.redis.exists(precomputedKey);
    if (exists) {
      return;
    }

    // 这里应该调用相应的服务来计算数据
    // 由于我们在缓存服务中，这里只是示例
    const mockData = this.generateMockData(type, keyword, timeRange);

    await this.redis.setex(precomputedKey, 30, JSON.stringify(mockData));
  }

  private generateMockData(type: string, keyword: string, timeRange: string): any {
    // 生成模拟数据的逻辑
    // 在实际实现中，这里应该调用相应的聚合服务
    return {
      keyword,
      timeRange,
      type,
      timestamp: new Date(),
      data: {}
    };
  }

  // 缓存失效策略
  async invalidateCache(keyword: string, type?: 'sentiment' | 'geographic' | 'events') {
    const patterns = [];

    if (type) {
      patterns.push(`*:${type}:${keyword}:*`);
    } else {
      patterns.push(`*:sentiment:${keyword}:*`);
      patterns.push(`*:geographic:${keyword}:*`);
      patterns.push(`*:events:${keyword}:*`);
    }

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} cache entries for pattern ${pattern}`);
      }
    }
  }

  // 批量缓存操作
  async batchSetCache(entries: Array<{
    keyword: string;
    timeRange: string;
    data: any;
    type: 'sentiment' | 'geographic' | 'events';
  }>) {
    const pipeline = this.redis.pipeline();

    entries.forEach(entry => {
      const { keyword, timeRange, data, type } = entry;
      const serializedData = JSON.stringify(data);

      // 设置不同层级的缓存
      pipeline.setex(`stats:${type}:${keyword}:${timeRange}`, 5, serializedData);
      pipeline.setex(`precomputed:${type}:${keyword}:${timeRange}`, 30, serializedData);
      pipeline.setex(`historical:${type}:${keyword}:${timeRange}`, 300, serializedData);
    });

    await pipeline.exec();
    this.logger.debug(`Batch cache set completed for ${entries.length} entries`);
  }

  // 获取缓存统计信息
  async getCacheStats(): Promise<CacheStats> {
    const stats = {
      totalKeys: 0,
      statsLayer1: 0,
      statsLayer2: 0,
      historicalLayer3: 0,
      precomputedData: 0,
      memoryUsage: 0,
      hitRate: 0
    };

    const patterns = [
      'stats:*',
      'precomputed:*',
      'historical:*'
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      stats.totalKeys += keys.length;

      if (pattern === 'stats:*') stats.statsLayer1 = keys.length;
      else if (pattern === 'precomputed:*') stats.precomputedData = keys.length;
      else if (pattern === 'historical:*') stats.historicalLayer3 = keys.length;
    }

    // 获取内存使用情况
    const info = await this.redis.info('memory');
    const memoryMatch = info.match(/used_memory:(\d+)/);
    if (memoryMatch) {
      stats.memoryUsage = parseInt(memoryMatch[1]);
    }

    return stats;
  }

  // 清理过期缓存
  async cleanupExpiredCache() {
    this.logger.debug('Starting expired cache cleanup');

    const patterns = [
      'stats:*',
      'precomputed:*',
      'historical:*'
    ];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // 没有过期时间的key
          // 设置默认过期时间
          const layer = key.split(':')[0];
          const defaultTTL = {
            'stats': 5,
            'precomputed': 30,
            'historical': 300
          }[layer] || 60;

          await this.redis.expire(key, defaultTTL);
        }
      }
    }

    this.logger.debug(`Cache cleanup completed, processed ${totalDeleted} keys`);
  }
}

interface CacheStats {
  totalKeys: number;
  statsLayer1: number;
  statsLayer2: number;
  historicalLayer3: number;
  precomputedData: number;
  memoryUsage: number;
  hitRate: number;
}
```

## 4. BigScreen 数据接口设计

### 4.1 舆情概览 API

```typescript
@Resolver()
export class BigScreenResolver {
  constructor(
    private readonly bigScreenService: BigScreenService,
    private readonly sentimentService: SentimentAnalysisService,
    private readonly eventService: EventService,
    private readonly geographicService: GeographicService
  ) {}

  @Query(() => BigScreenOverview, {
    name: 'bigScreenOverview',
    description: '获取大屏展示的舆情概览数据'
  })
  async bigScreenOverview(
    @Args('keyword', { nullable: true, description: '关键词，默认为全部' })
    keyword?: string,
    @Args('timeRange', { defaultValue: '1h', description: '时间范围：1min, 5min, 15min, 1h, 6h, 24h' })
    timeRange: string = '1h'
  ): Promise<BigScreenOverview> {
    return this.bigScreenService.getOverviewData(keyword, timeRange);
  }

  @Query(() => BigScreenMetrics, {
    name: 'bigScreenMetrics',
    description: '获取大屏实时指标数据'
  })
  async bigScreenMetrics(
    @Args('metricNames', { type: () => [String], nullable: true, description: '指定指标名称列表' })
    metricNames?: string[],
    @Args('keyword', { nullable: true })
    keyword?: string
  ): Promise<BigScreenMetrics> {
    return this.bigScreenService.getMetrics(metricNames, keyword);
  }

  @Query(() => [TrendingTopic], {
    name: 'trendingTopics',
    description: '获取热点话题列表'
  })
  async trendingTopics(
    @Args('limit', { defaultValue: 10, description: '返回数量限制' })
    limit: number = 10,
    @Args('timeRange', { defaultValue: '1h', description: '时间范围' })
    timeRange: string = '1h',
    @Args('category', { nullable: true, description: '话题分类' })
    category?: string
  ): Promise<TrendingTopic[]> {
    return this.bigScreenService.getTrendingTopics(limit, timeRange, category);
  }
}

@ObjectType()
export class BigScreenOverview {
  @Field(() => Int, { description: '总帖子数' })
  totalPosts: number;

  @Field(() => SentimentDistribution, { description: '情感分布' })
  sentimentDistribution: SentimentDistribution;

  @Field(() => Int, { description: '活跃用户数' })
  activeUsers: number;

  @Field(() => [String], { description: '热门关键词' })
  topKeywords: string[];

  @Field(() => Date, { description: '最后更新时间' })
  lastUpdated: Date;

  @Field(() => Float, { description: '平均情感分数' })
  avgSentimentScore: number;

  @Field(() => Int, { description: '总互动数（转发+评论+点赞）' })
  totalInteractions: number;

  @Field(() -> GeographicSummary, { description: '地理分布概要' })
  geographicSummary: GeographicSummary;
}

@ObjectType()
export class SentimentDistribution {
  @Field(() -> Int, { description: '正面情感数量' })
  positive: number;

  @Field(() -> Int, { description: '中性情感数量' })
  neutral: number;

  @Field(() -> Int, { description: '负面情感数量' })
  negative: number;

  @Field(() -> Float, { description: '正面情感占比' })
  positivePercentage: number;

  @Field(() -> Float, { description: '中性情感占比' })
  neutralPercentage: number;

  @Field(() -> Float, { description: '负面情感占比' })
  negativePercentage: number;
}

@ObjectType()
export class GeographicSummary {
  @Field(() -> Int, { description: '涉及地区数量' })
  totalRegions: number;

  @Field(() -> String, { description: '最活跃地区' })
  mostActiveRegion: string;

  @Field(() -> Int, { description: '最活跃地区帖子数' })
  mostActiveRegionPosts: number;

  @Field(() -> [GeographicHotspot], { description: 'TOP 5 热点地区' })
  topHotspots: GeographicHotspot[];
}

@ObjectType()
export class TrendingTopic {
  @Field(() -> String, { description: '话题名称' })
  name: string;

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> Float, { description: '热度指数' })
  hotnessScore: number;

  @Field(() -> Float, { description: '增长趋势' })
  growthRate: number;

  @Field(() -> String, { description: '主要情感倾向' })
  dominantSentiment: 'positive' | 'neutral' | 'negative';

  @Field(() -> [String], { description: '相关关键词' })
  relatedKeywords: string[];

  @Field(() -> Date, { description: '统计时间' })
  timestamp: Date;
}
```

### 4.2 实时情感分析 API

```typescript
@Resolver()
export class SentimentAnalysisResolver {

  @Query(() => SentimentTrendData, {
    name: 'sentimentTrend',
    description: '获取情感趋势时间序列数据'
  })
  async sentimentTrend(
    @Args('keyword', { description: '分析关键词' }) keyword: string,
    @Args('timeRange', { defaultValue: '24h', description: '时间范围' })
    timeRange: string = '24h',
    @Args('interval', { defaultValue: '1h', description: '时间间隔：5min, 15min, 1h, 6h' })
    interval: string = '1h'
  ): Promise<SentimentTrendData> {
    return this.sentimentService.getSentimentTrend(keyword, timeRange, interval);
  }

  @Query(() -> SentimentRealtimeStats, {
    name: 'sentimentRealtimeStats',
    description: '获取实时情感统计数据'
  })
  async sentimentRealtimeStats(
    @Args('keyword', { nullable: true }) keyword?: string,
    @Args('window', { defaultValue: '5min', description: '时间窗口' })
    window: string = '5min'
  ): Promise<SentimentRealtimeStats> {
    return this.sentimentService.getRealtimeStats(keyword, window);
  }

  @Query(() -> [KeywordSentiment], {
    name: 'keywordSentimentAnalysis',
    description: '获取多个关键词的情感分析对比'
  })
  async keywordSentimentAnalysis(
    @Args('keywords', { type: () -> [String] }) keywords: string[],
    @Args('timeRange', { defaultValue: '1h' }) timeRange: string = '1h'
  ): Promise<KeywordSentiment[]> {
    return this.sentimentService.compareKeywordsSentiment(keywords, timeRange);
  }

  // GraphQL Subscription 实时更新
  @Subscription(() -> SentimentUpdate, {
    name: 'sentimentUpdate',
    description: '实时情感数据更新订阅',
    filter: (payload: SentimentUpdate, variables, context) => {
      // 根据订阅参数过滤数据
      if (variables.keyword && variables.keyword !== 'all') {
        return payload.keyword === variables.keyword;
      }
      return true;
    }
  })
  sentimentUpdate(
    @Args('keyword', { nullable: true, description: '订阅的关键词，默认为全部' })
    keyword?: string,
    @Context() context: any
  ): AsyncIterator<SentimentUpdate> {
    const subscriptionKey = keyword ? `sentiment:update:${keyword}` : 'sentiment:update:all';
    return this.pubSub.asyncIterator(subscriptionKey);
  }
}

@ObjectType()
export class SentimentTrendData {
  @Field(() -> [SentimentDataPoint], { description: '时间序列数据点' })
  timeline: SentimentDataPoint[];

  @Field(() -> Float, { description: '整体情感分数' })
  overallScore: number;

  @Field(() -> Int, { description: '分析的总帖子数' })
  totalAnalyzed: number;

  @Field(() -> SentimentDistribution, { description: '整体情感分布' })
  overallDistribution: SentimentDistribution;

  @Field(() -> Date, { description: '数据开始时间' })
  startTime: Date;

  @Field(() -> Date, { description: '数据结束时间' })
  endTime: Date;
}

@ObjectType()
export class SentimentDataPoint {
  @Field(() -> Date, { description: '时间点' })
  timestamp: Date;

  @Field(() -> Float, { description: '平均情感分数' })
  avgScore: number;

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> SentimentDistribution, { description: '情感分布' })
  distribution: SentimentDistribution;

  @Field(() -> [String], { description: '热门关键词' })
  topKeywords: string[];
}

@ObjectType()
export class SentimentRealtimeStats {
  @Field(() -> String, { description: '关键词' })
  keyword: string;

  @Field(() -> Date, { description: '统计时间' })
  timestamp: Date;

  @Field(() -> Int, { description: '时间窗口内的帖子数' })
  postCount: number;

  @Field(() -> SentimentDistribution, { description: '情感分布' })
  distribution: SentimentDistribution;

  @Field(() -> Float, { description: '平均情感分数' })
  avgSentimentScore: number;

  @Field(() -> [KeywordSentiment], { description: '相关关键词情感' })
  relatedKeywords: KeywordSentiment[];

  @Field(() -> String, { description: '时间窗口' })
  timeWindow: string;
}

@ObjectType()
export class SentimentUpdate {
  @Field(() -> String, { description: '关键词' })
  keyword: string;

  @Field(() -> SentimentRealtimeStats, { description: '更新的统计数据' })
  stats: SentimentRealtimeStats;

  @Field(() -> Date, { description: '更新时间' })
  updateTimestamp: Date;

  @Field(() -> String, { description: '更新类型' })
  updateType: 'incremental' | 'full';

  @Field(() -> [String], { description: '影响的关键词' })
  affectedKeywords: string[];
}

@ObjectType()
export class KeywordSentiment {
  @Field(() -> String, { description: '关键词' })
  keyword: string;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> String, { description: '主要情感倾向' })
  dominantSentiment: 'positive' | 'neutral' | 'negative';

  @Field(() -> Float, { description: '相比上次的变化' })
  changeRate: number;
}
```

### 4.3 热点事件 API

```typescript
@Resolver()
export class EventResolver {

  @Query(() -> [HotEvent], {
    name: 'hotEvents',
    description: '获取热点事件列表'
  })
  async hotEvents(
    @Args('limit', { defaultValue: 20, description: '返回数量限制' })
    limit: number = 20,
    @Args('category', { nullable: true, description: '事件分类' })
    category?: string,
    @Args('timeRange', { defaultValue: '6h', description: '时间范围' })
    timeRange: string = '6h',
    @Args('minPosts', { defaultValue: 10, description: '最小帖子数' })
    minPosts: number = 10
  ): Promise<HotEvent[]> {
    return this.eventService.getHotEvents(limit, category, timeRange, minPosts);
  }

  @Query(() -> EventDetail, {
    name: 'eventDetail',
    description: '获取事件详细信息'
  })
  async eventDetail(
    @Args('eventId', { description: '事件ID' }) eventId: number
  ): Promise<EventDetail> {
    return this.eventService.getEventDetail(eventId);
  }

  @Query(() -> EventTrendData, {
    name: 'eventTrend',
    description: '获取事件趋势数据'
  })
  async eventTrend(
    @Args('eventId', { description: '事件ID' }) eventId: number,
    @Args('timeRange', { defaultValue: '24h', description: '时间范围' })
    timeRange: string = '24h'
  ): Promise<EventTrendData> {
    return this.eventService.getEventTrend(eventId, timeRange);
  }

  @Mutation(() -> Boolean, {
    name: 'trackEvent',
    description: '跟踪事件'
  })
  async trackEvent(
    @Args('eventId', { description: '事件ID' }) eventId: number,
    @CurrentUser('userId') userId: string
  ): Promise<boolean> {
    return this.eventService.trackEvent(eventId, userId);
  }

  @Subscription(() -> HotEventUpdate, {
    name: 'hotEventUpdate',
    description: '热点事件实时更新订阅'
  })
  hotEventUpdate(
    @Args('category', { nullable: true }) category?: string
  ): AsyncIterator<HotEventUpdate> {
    const subscriptionKey = category ? `events:update:${category}` : 'events:update:all';
    return this.pubSub.asyncIterator(subscriptionKey);
  }
}

@ObjectType()
export class HotEvent {
  @Field(() -> Int, { description: '事件ID' })
  id: number;

  @Field(() -> String, { description: '事件标题' })
  title: string;

  @Field(() -> String, { description: '事件描述' })
  description: string;

  @Field(() -> Int, { description: '相关帖子数' })
  mentionCount: number;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;

  @Field(() -> [String], { description: '主要关键词' })
  topKeywords: string[];

  @Field(() -> Date, { description: '峰值时间' })
  peakTime: Date;

  @Field(() -> Float, { description: '热度指数' })
  hotnessScore: number;

  @Field(() -> String, { description: '事件分类' })
  category: string;

  @Field(() -> String, { description: '主要情感倾向' })
  dominantSentiment: 'positive' | 'neutral' | 'negative';

  @Field(() -> Int, { description: '参与用户数' })
  participantCount: number;

  @Field(() -> Float, { description: '传播速度' })
  velocity: number;

  @Field(() -> [String], { description: '相关地区' })
  relatedRegions: string[];

  @Field(() -> Date, { description: '首次发现时间' })
  firstSeen: Date;

  @Field(() -> Date, { description: '最后更新时间' })
  lastUpdated: Date;
}

@ObjectType()
export class EventDetail extends HotEvent {
  @Field(() -> [EventPost], { description: '代表性帖子' })
  representativePosts: EventPost[];

  @Field(() -> [EventInfluencer], { description: '关键影响者' })
  keyInfluencers: EventInfluencer[];

  @Field(() -> EventTimeline, { description: '事件发展时间线' })
  timeline: EventTimeline;

  @Field(() -> EventGeographicSpread, { description: '地理传播情况' })
  geographicSpread: EventGeographicSpread;

  @Field(() -> [RelatedEvent], { description: '相关事件' })
  relatedEvents: RelatedEvent[];
}

@ObjectType()
export class EventTrendData {
  @Field(() -> [EventTrendPoint], { description: '趋势数据点' })
  dataPoints: EventTrendPoint[];

  @Field(() -> Int, { description: '总提及数' })
  totalMentions: number;

  @Field(() -> Float, { description: '平均传播速度' })
  avgVelocity: number;

  @Field(() -> Float, { description: '最高热度' })
  peakHotness: number;

  @Field(() -> Date, { description: '数据开始时间' })
  startTime: Date;

  @Field(() -> Date, { description: '数据结束时间' })
  endTime: Date;
}

@ObjectType()
export class EventTrendPoint {
  @Field(() -> Date, { description: '时间点' })
  timestamp: Date;

  @Field(() -> Int, { description: '提及数' })
  mentionCount: number;

  @Field(() -> Int, { description: '参与数' })
  engagementCount: number;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;

  @Field(() -> Float, { description: '热度指数' })
  hotness: number;

  @Field(() -> Float, { description: '传播速度' })
  velocity: number;
}

@ObjectType()
export class HotEventUpdate {
  @Field(() -> [HotEvent], { description: '更新后的事件列表' })
  events: HotEvent[];

  @Field(() -> Date, { description: '更新时间' })
  timestamp: Date;

  @Field(() -> Int, { description: '活跃事件总数' })
  totalActive: number;

  @Field(() -> String, { description: '更新类型' })
  updateType: 'new_events' | 'ranking_change' | 'data_update';

  @Field(() -> [String], { description: '变化的事件ID' })
  changedEventIds: number[];
}

@ObjectType()
export class EventPost {
  @Field(() -> String, { description: '帖子内容' })
  content: string;

  @Field(() -> String, { description: '作者' })
  author: string;

  @Field(() -> Date, { description: '发布时间' })
  publishedAt: Date;

  @Field(() -> Int, { description: '转发数' })
  repostsCount: number;

  @Field(() -> Int, { description: '评论数' })
  commentsCount: number;

  @Field(() -> Int, { description: '点赞数' })
  attitudesCount: number;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;
}

@ObjectType()
export class EventInfluencer {
  @Field(() -> String, { description: '用户ID' })
  userId: string;

  @Field(() -> String, { description: '用户名' })
  username: string;

  @Field(() -> Int, { description: '粉丝数' })
  followersCount: number;

  @Field(() -> Int, { description: '相关帖子数' })
  postCount: number;

  @Field(() -> Float, { description: '影响力分数' })
  influenceScore: number;

  @Field(() -> Float, { description: '平均情感倾向' })
  avgSentiment: number;
}

@ObjectType()
export class EventTimeline {
  @Field(() -> [TimelineEvent], { description: '时间线事件' })
  events: TimelineEvent[];
}

@ObjectType()
export class TimelineEvent {
  @Field(() -> Date, { description: '时间' })
  timestamp: Date;

  @Field(() -> String, { description: '事件类型' })
  type: 'origin' | 'peak' | 'decline' | 'resurgence';

  @Field(() -> String, { description: '描述' })
  description: string;

  @Field(() -> Int, { description: '帖子数' })
  postCount: number;

  @Field(() -> Float, { description: '热度' })
  hotness: number;
}

@ObjectType()
export class EventGeographicSpread {
  @Field(() -> [GeographicSpreadPoint], { description: '地理传播数据' })
  spreadData: GeographicSpreadPoint[];

  @Field(() -> Int, { description: '涉及地区数' })
  totalRegions: number;

  @Field(() -> String, { description: '最活跃地区' })
  mostActiveRegion: string;
}

@ObjectType()
export class GeographicSpreadPoint {
  @Field(() -> String, { description: '地区' })
  region: string;

  @Field(() -> Int, { description: '帖子数' })
  postCount: number;

  @Field(() -> Float, { description: '占总数比例' })
  percentage: number;

  @Field(() -> Float, { description: '平均情感' })
  avgSentiment: number;

  @Field(() -> Date, { description: '首次出现时间' })
  firstSeen: Date;
}

@ObjectType()
export class RelatedEvent {
  @Field(() -> Int, { description: '事件ID' })
  id: number;

  @Field(() -> String, { description: '事件标题' })
  title: string;

  @Field(() -> Float, { description: '相关度分数' })
  relevanceScore: number;

  @Field(() -> [String], { description: '共同关键词' })
  commonKeywords: string[];
}
```

### 4.4 地理位置API

```typescript
@Resolver()
export class GeographicResolver {

  @Query(() -> [GeographicData], {
    name: 'geographicData',
    description: '获取地理分布数据'
  })
  async geographicData(
    @Args('keyword', { description: '分析关键词' }) keyword: string,
    @Args('level', { defaultValue: 'province', description: '地理级别：province, city, district' })
    level: 'province' | 'city' | 'district' = 'province',
    @Args('timeRange', { defaultValue: '1h', description: '时间范围' })
    timeRange: string = '1h',
    @Args('limit', { defaultValue: 50, description: '返回数量限制' })
    limit: number = 50
  ): Promise<GeographicData[]> {
    return this.geoService.getGeographicDistribution(keyword, level, timeRange, limit);
  }

  @Query(() -> GeographicHeatmapData, {
    name: 'geographicHeatmap',
    description: '获取地理热力图数据'
  })
  async geographicHeatmap(
    @Args('keyword', { description: '关键词' }) keyword: string,
    @Args('timeRange', { defaultValue: '1h', description: '时间范围' })
    timeRange: string = '1h',
    @Args('gridSize', { defaultValue: 0.1, description: '网格大小（经纬度）' })
    gridSize: number = 0.1
  ): Promise<GeographicHeatmapData> {
    return this.geoService.getHeatmapData(keyword, timeRange, gridSize);
  }

  @Query(() -> GeographicTrendData, {
    name: 'geographicTrend',
    description: '获取地理趋势数据'
  })
  async geographicTrend(
    @Args('region', { description: '地区名称' }) region: string,
    @Args('timeRange', { defaultValue: '24h', description: '时间范围' })
    timeRange: string = '24h'
  ): Promise<GeographicTrendData> {
    return this.geoService.getGeographicTrend(region, timeRange);
  }

  @Subscription(() -> GeographicDataUpdate, {
    name: 'geographicDataUpdate',
    description: '地理数据实时更新订阅'
  })
  geographicDataUpdate(
    @Args('keyword', { description: '关键词' }) keyword: string,
    @Args('level', { defaultValue: 'province', description: '地理级别' })
    level: 'province' | 'city' | 'district' = 'province'
  ): AsyncIterator<GeographicDataUpdate> {
    const subscriptionKey = `geo:update:${keyword}:${level}`;
    return this.pubSub.asyncIterator(subscriptionKey);
  }
}

@ObjectType()
export class GeographicData {
  @Field(() -> String, { description: '地区名称' })
  location: string;

  @Field(() -> String, { description: '地区级别' })
  level: 'province' | 'city' | 'district';

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> Int, { description: '活跃用户数' })
  activeUsers: number;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;

  @Field(() -> SentimentDistribution, { description: '情感分布' })
  sentimentDistribution: SentimentDistribution;

  @Field(() -> Float, { description: '纬度' })
  latitude: number;

  @Field(() -> Float, { description: '经度' })
  longitude: number;

  @Field(() -> Int, { description: '影响力评分' })
  influenceScore: number;

  @Field(() -> [String], { description: '热门关键词' })
  topKeywords: string[];

  @Field(() -> [GeoInfluencer], { description: '地区影响者' })
  topInfluencers: GeoInfluencer[];

  @Field(() -> Date, { description: '最后更新时间' })
  lastUpdated: Date;
}

@ObjectType()
export class GeographicHeatmapData {
  @Field(() -> String, { description: '关键词' })
  keyword: string;

  @Field(() -> [HeatmapPoint], { description: '热力图数据点' })
  points: HeatmapPoint[];

  @Field(() -> Float, { description: '最大强度值' })
  maxIntensity: number;

  @Field(() -> Float, { description: '最小强度值' })
  minIntensity: number;

  @Field(() -> Float, { description: '平均强度值' })
  avgIntensity: number;

  @Field(() -> GeographicBounds, { description: '数据边界' })
  bounds: GeographicBounds;

  @Field(() -> Date, { description: '数据时间范围' })
  timeRange: string;

  @Field(() -> Date, { description: '生成时间' })
  generatedAt: Date;
}

@ObjectType()
export class HeatmapPoint {
  @Field(() -> Float, { description: '纬度' })
  lat: number;

  @Field(() -> Float, { description: '经度' })
  lng: number;

  @Field(() -> Float, { description: '强度值' })
  intensity: number;

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> Float, { description: '平均情感分数' })
  avgSentiment: number;

  @Field(() -> [String], { description: '主要关键词' })
  topKeywords: string[];
}

@ObjectType()
export class GeographicBounds {
  @Field(() -> Float, { description: '最小纬度' })
  minLat: number;

  @Field(() -> Float, { description: '最大纬度' })
  maxLat: number;

  @Field(() -> Float, { description: '最小经度' })
  minLng: number;

  @Field(() -> Float, { description: '最大经度' })
  maxLng: number;
}

@ObjectType()
export class GeographicTrendData {
  @Field(() -> String, { description: '地区名称' })
  region: string;

  @Field(() -> [GeographicTrendPoint], { description: '趋势数据点' })
  dataPoints: GeographicTrendPoint[];

  @Field(() -> Int, { description: '总帖子数' })
  totalPosts: number;

  @Field(() -> Float, { description: '平均情感分数' })
  avgSentimentScore: number;

  @Field(() -> Int, { description: '峰值帖子数' })
  peakPostCount: number;

  @Field(() -> Date, { description: '峰值时间' })
  peakTime: Date;

  @Field(() -> Float, { description: '增长趋势' })
  growthTrend: number;
}

@ObjectType()
export class GeographicTrendPoint {
  @Field(() -> Date, { description: '时间点' })
  timestamp: Date;

  @Field(() -> Int, { description: '帖子数' })
  postCount: number;

  @Field(() -> Float, { description: '情感分数' })
  sentimentScore: number;

  @Field(() -> Int, { description: '活跃用户数' })
  activeUsers: number;

  @Field(() -> [String], { description: '热门关键词' })
  topKeywords: string[];
}

@ObjectType()
export class GeographicDataUpdate {
  @Field(() -> [GeographicHotspot], { description: '更新的热点数据' })
  hotspots: GeographicHotspot[];

  @Field(() -> Date, { description: '更新时间' })
  timestamp: Date;

  @Field(() -> String, { description: '关键词' })
  keyword: string;

  @Field(() -> String, { description: '更新类型' })
  updateType: 'new_hotspot' | 'intensity_change' | 'ranking_update';

  @Field(() -> [String], { description: '影响的地区' })
  affectedRegions: string[];
}

@ObjectType()
export class GeoInfluencer {
  @Field(() -> String, { description: '用户ID' })
  userId: string;

  @Field(() -> String, { description: '用户名' })
  username: string;

  @Field(() -> Int, { description: '粉丝数' })
  followersCount: number;

  @Field(() -> Int, { description: '地区相关帖子数' })
  localPostCount: number;

  @Field(() -> Float, { description: '地区影响力' })
  localInfluence: number;

  @Field(() -> Float, { description: '平均情感倾向' })
  avgSentiment: number;
}

@ObjectType()
export class GeographicHotspot {
  @Field(() -> String, { description: '地区名称' })
  location: string;

  @Field(() -> Float, { description: '纬度' })
  latitude: number;

  @Field(() -> Float, { description: '经度' })
  longitude: number;

  @Field(() -> Int, { description: '帖子数量' })
  postCount: number;

  @Field(() -> Float, { description: '平均情感分数' })
  avgSentimentScore: number;

  @Field(() -> Int, { description: '影响力评分' })
  influenceScore: number;

  @Field(() -> [String], { description: '热门关键词' })
  topKeywords: string[];

  @Field(() -> [GeoInfluencer], { description: '地区影响者' })
  topInfluencers: GeoInfluencer[];

  @Field(() -> Date, { description: '最后更新时间' })
  lastUpdated: Date;
}
```

## 5. 系统架构图和数据流图

### 5.1 整体架构设计

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BigScreen 实时数据聚合系统                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Frontend  │    │   Frontend  │    │   Mobile    │
│  BigScreen  │    │ Admin Panel │    │  Dashboard  │    │    App      │
│ (Angular)   │    │ (Angular)   │    │ (React)     │    │ (React Native)│
└─────────┬───┘    └─────────┬───┘    └─────────┬───┘    └─────────┬───┘
          │                  │                  │                  │
          └──────────────────┼──────────────────┼──────────────────┘
                             │
                    ┌─────────▼─────────┐
                    │  API Gateway     │
                    │ (NestJS + GraphQL)│
                    │  Port: 3000      │
                    └─────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │WebSocket  │    │ HTTP API  │    │ GraphQL   │
    │ Gateway   │    │ Resolver  │    │ Subscription│
    │ (Realtime)│    │ (RESTful) │    │ (Realtime) │
    │ Namespace:│    │           │    │           │
    │ /bigscreen│    │           │    │           │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌─────────▼─────────┐
                    │  Service Layer    │
                    │                   │
                    │ ┌─────────────┐   │
                    │ │Aggregation  │   │
                    │ │Service      │   │
                    │ └─────────────┘   │
                    │ ┌─────────────┐   │
                    │ │Sentiment    │   │
                    │ │Service      │   │
                    │ └─────────────┘   │
                    │ ┌─────────────┐   │
                    │ │Event        │   │
                    │ │Service      │   │
                    │ └─────────────┘   │
                    │ ┌─────────────┐   │
                    │ │Geographic   │   │
                    │ │Service      │   │
                    │ └─────────────┘   │
                    └─────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │   Redis   │    │RabbitMQ   │    │Database   │
    │  Cache    │    │Message    │    │ Layer     │
    │           │    │Queue      │    │           │
    │ ┌─────┐   │    │           │    │ ┌─────┐   │
    │ │ L1  │   │    │ ┌─────┐   │    │ │ PG  │   │
    │ │(5s) │   │    │ │Queue│   │    │ │Postg│   │
    │ └─────┘   │    │ │     │   │    │ │resql│   │
    │ ┌─────┐   │    │ └─────┘   │    │ └─────┘   │
    │ │ L2  │   │    │           │    │           │
    │ │(30s)│   │    │ ┌─────┐   │    │ ┌─────┐   │
    │ └─────┘   │    │ │Pub- │   │    │ │Mongo│   │
    │ ┌─────┐   │    │ │Sub  │   │    │ │DB   │   │
    │ │ L3  │   │    │ │     │   │    │ └─────┘   │
    │ │(5m) │   │    │ └─────┘   │    │           │
    │ └─────┘   │    │           │    │           │
    └───────────┘    └───────────┘    └───────────┘

数据流向：
1. 实时数据流： WebSocket → Service → Cache → WebSocket
2. 查询数据流： HTTP/GraphQL → Service → Database → Cache → Response
3. 聚合数据流： Database → Aggregation Service → Cache → WebSocket/HTTP
4. 消息流： RabbitMQ → Service → Database → Cache → WebSocket
```

### 5.2 实时数据流设计

```
微博数据采集 → NLP分析 → 实时聚合 → 缓存更新 → WebSocket推送 → 前端更新
     ↓             ↓         ↓         ↓           ↓          ↓
  RabbitMQ    Analyzer   Aggregator   Redis    Gateway   BigScreen
    ↓             ↓         ↓         ↓           ↓          ↓
原始数据 → 清洗处理 → 结构化存储 → 统计计算 → 缓存层 → 实时推送

详细流程：
1. Crawler 服务采集微博原始数据
2. 数据通过 RabbitMQ 发送到 Cleaner 服务
3. Cleaner 清洗数据并存入 PostgreSQL
4. NLP 分析服务对数据进行情感分析
5. 实时聚合服务处理分析结果
6. 聚合结果存储到 Redis 缓存
7. WebSocket Gateway 推送更新到前端
8. BigScreen 实时更新显示
```

### 5.3 组件间通信设计

```typescript
// 事件驱动架构核心事件
export class DataUpdateEvent {
  constructor(
    public readonly type: 'SENTIMENT' | 'EVENT' | 'GEOGRAPHIC' | 'METRICS',
    public readonly data: any,
    public readonly timestamp: Date,
    public readonly keyword?: string,
    public readonly region?: string
  ) {}
}

// 发布订阅模式实现
@Injectable()
export class EventPublisherService {
  constructor(
    private readonly pubSub: PubSubService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async publishDataUpdate(event: DataUpdateEvent) {
    // GraphQL 订阅
    await this.pubSub.publish(`data:update:${event.type}`, event);

    // Redis 发布
    const redisChannel = `bigscreen:${event.type.toLowerCase()}:${event.keyword || 'all'}`;
    await this.redis.publish(redisChannel, JSON.stringify(event));

    // WebSocket 广播
    await this.broadcastToWebSocket(event);
  }

  private async broadcastToWebSocket(event: DataUpdateEvent) {
    // 这里会调用 WebSocket Gateway 的广播方法
    // 实现方式取决于具体的 WebSocket 实现
  }
}

// 消息队列配置
export const BIGSCREEN_QUEUES = {
  AGGREGATION_TASKS: 'bigscreen:aggregation:tasks',
  REALTIME_UPDATES: 'bigscreen:realtime:updates',
  CACHE_INVALIDATION: 'bigscreen:cache:invalidation',
  CLEANUP_TASKS: 'bigscreen:cleanup:tasks'
} as const;

// 微服务通信接口
export interface IAggregationService {
  aggregateSlidingWindow(keyword: string, windowMinutes: number): Promise<RealtimeSentimentStatsEntity>;
  batchAggregateKeywords(keywords: string[]): Promise<RealtimeSentimentStatsEntity[]>;
  incrementalUpdate(postId: number, analysisResult: AnalysisResultEntity): Promise<void>;
}

export interface ICacheService {
  getCachedStats(keyword: string, timeRange: string): Promise<any>;
  setCachedStats(keyword: string, timeRange: string, data: any): Promise<void>;
  invalidateCache(keyword: string): Promise<void>;
  warmupCache(keywords: string[]): Promise<void>;
}

export interface IWebSocketService {
  broadcastSentimentStatsUpdate(data: SentimentStatsUpdate): Promise<void>;
  broadcastHotEventsUpdate(events: HotEvent[]): Promise<void>;
  broadcastGeographicUpdate(data: GeographicDataUpdate): Promise<void>;
}
```

### 5.4 数据模型关系图

```
WeiboPost (主表)
├── id (PK)
├── text (内容)
├── authorId (FK → WeiboUser)
├── createdAt (时间)
├── repostsCount, commentsCount, attitudesCount
└── analysisResultId (FK → AnalysisResult)

WeiboUser (用户表)
├── id (PK)
├── weiboId (微博ID)
├── screenName (用户名)
├── followersCount, followingCount
├── location (地理位置)
└── posts (1:N → WeiboPost)

AnalysisResult (分析结果表)
├── id (PK)
├── postId (FK → WeiboPost)
├── sentiment (情感分数)
├── primaryKeywords (主要关键词)
├── secondaryKeywords (次要关键词)
└── createdAt (分析时间)

RealtimeSentimentStats (实时统计表)
├── id (PK)
├── keyword (关键词)
├── timestamp (时间戳)
├── sentimentDistribution (情感分布)
├── postCount, commentCount, repostCount
├── avgSentimentScore (平均情感分数)
├── topKeywords (热门关键词)
└── geographicDistribution (地理分布)

GeographicHotspot (地理热点表)
├── id (PK)
├── locationHash (位置哈希)
├── province, city, district
├── postCount (帖子数)
├── avgSentimentScore (平均情感)
├── influenceScore (影响力分数)
├── topKeywords (热门关键词)
└── topInfluencers (影响者)

EventTrendData (事件趋势表)
├── id (PK)
├── eventId (事件ID)
├── timestamp (时间戳)
├── mentionCount (提及数)
├── engagementCount (互动数)
├── sentimentScore (情感分数)
├── velocity (传播速度)
└── acceleration (传播加速度)
```

## 6. 实施计划和部署策略

### 6.1 分阶段实施计划

#### 第一阶段：基础设施搭建（预计1-2周）

**目标**：建立实时数据处理的基础架构

**任务清单**：
- [ ] 创建新的数据库实体和索引
  ```sql
  -- 创建实时统计表
  CREATE TABLE realtime_sentiment_stats (...);
  CREATE TABLE geographic_hotspots (...);
  CREATE TABLE event_trend_data (...);

  -- 创建索引
  CREATE INDEX CONCURRENTLY idx_realtime_stats_keyword_time ...;
  ```

- [ ] 搭建基础的缓存架构
  ```typescript
  // 实现 AggregationCacheService
  @Injectable()
  export class AggregationCacheService {
    // 三层缓存实现
  }
  ```

- [ ] 实现基础的 WebSocket Gateway 扩展
  ```typescript
  @WebSocketGateway({ namespace: '/bigscreen' })
  export class BigScreenGateway {
    // WebSocket 连接管理和消息处理
  }
  ```

- [ ] 配置 RabbitMQ 队列用于实时数据传递
  ```typescript
  export const BIGSCREEN_QUEUES = {
    REALTIME_UPDATES: 'bigscreen:realtime:updates',
    AGGREGATION_TASKS: 'bigscreen:aggregation:tasks'
  };
  ```

**验收标准**：
- 数据库表结构创建完成，索引生效
- Redis 缓存服务正常工作
- WebSocket 连接可以建立
- RabbitMQ 消息可以发送和接收

#### 第二阶段：核心服务开发（预计2-3周）

**目标**：实现实时数据聚合和分析功能

**任务清单**：
- [ ] 开发实时聚合服务
  ```typescript
  @Injectable()
  export class RealtimeAggregationService {
    async aggregateSlidingWindow(...) { /* 实现 */ }
    async incrementalUpdate(...) { /* 实现 */ }
  }
  ```

- [ ] 实现情感分析集成
  ```typescript
  @Injectable()
  export class SentimentAnalysisService {
    async analyzeSentiment(text: string): Promise<SentimentResult> { /* 实现 */ }
    async batchAnalyze(texts: string[]): Promise<SentimentResult[]> { /* 实现 */ }
  }
  ```

- [ ] 创建 GraphQL Subscription 解析器
  ```typescript
  @Resolver()
  export class BigScreenSubscriptionResolver {
    @Subscription(() -> SentimentStatsUpdate)
    sentimentStatsUpdated() { /* 实现 */ }
  }
  ```

- [ ] 实现批量聚合任务调度
  ```typescript
  @Injectable()
  export class BatchAggregationService {
    @Cron('0 */5 * * * *')
    async batchAggregateSentiment() { /* 实现 */ }
  }
  ```

**验收标准**：
- 实时聚合功能正常工作
- 情感分析结果准确
- GraphQL 订阅可以接收实时更新
- 定时聚合任务正常执行

#### 第三阶段：API接口开发（预计1-2周）

**目标**：提供完整的 BigScreen 数据接口

**任务清单**：
- [ ] 开发 BigScreen 专用 API 接口
  ```typescript
  @Resolver()
  export class BigScreenResolver {
    @Query(() -> BigScreenOverview)
    async bigScreenOverview(...) { /* 实现 */ }
  }
  ```

- [ ] 实现数据查询优化
  ```typescript
  // 数据库查询优化
  const optimizedQuery = this.postRepository
    .createQueryBuilder('post')
    .select(['post.id', 'post.text', 'post.createdAt'])
    .where('post.createdAt >= :date', { date })
    .cache(30000); // 30秒缓存
  ```

- [ ] 添加性能监控和日志
  ```typescript
  @Injectable()
  export class BigScreenMonitoringService {
    recordApiLatency(endpoint: string, duration: number) { /* 实现 */ }
    recordAggregationTime(operation: string, duration: number) { /* 实现 */ }
  }
  ```

- [ ] 实现错误处理和容错机制
  ```typescript
  @Catch()
  export class BigScreenExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) { /* 实现 */ }
  }
  ```

**验收标准**：
- 所有 API 接口正常响应
- 查询性能满足要求（< 100ms）
- 监控指标正常采集
- 错误处理机制生效

#### 第四阶段：前端集成和测试（预计1-2周）

**目标**：完成前端集成和系统测试

**任务清单**：
- [ ] 前端实时数据展示组件开发
  ```typescript
  // Angular 组件示例
  @Component({
    selector: 'app-sentiment-chart',
    template: `<canvas baseChart [data]="chartData" [options]="chartOptions"></canvas>`
  })
  export class SentimentChartComponent implements OnInit, OnDestroy {
    // GraphQL 订阅集成
  }
  ```

- [ ] 系统集成测试
  ```typescript
  describe('BigScreen Integration', () => {
    it('should receive real-time updates', async () => {
      // 集成测试实现
    });
  });
  ```

- [ ] 性能优化和调试
  ```typescript
  // 性能优化
  @UseInterceptors(CacheInterceptor)
  @CacheKey('bigscreen-overview')
  @CacheTTL(30) // 30秒缓存
  async getOverviewData() { /* 实现 */ }
  ```

- [ ] 负载测试和压力测试
  ```bash
  # 压力测试脚本
  artillery run load-test.yml
  ```

**验收标准**：
- 前端可以正常接收和显示实时数据
- 系统集成测试通过
- 性能指标达到要求
- 负载测试通过

### 6.2 风险评估和应对策略

| 风险项 | 风险等级 | 影响描述 | 应对策略 | 负责人 |
|--------|----------|----------|----------|--------|
| 数据库性能瓶颈 | 中 | 大量实时数据写入导致查询延迟 | 1. 分库分表策略<br>2. 读写分离<br>3. 索引优化 | 数据库团队 |
| WebSocket连接数过多 | 中 | 大屏展示时连接数激增 | 1. 连接池管理<br>2. 负载均衡<br>3. 连接限制 | 后端团队 |
| 实时计算延迟 | 低 | 聚合计算耗时过长 | 1. 异步处理<br>2. 缓存优化<br>3. 增量更新 | 算法团队 |
| 前端性能问题 | 低 | 大量实时数据更新导致页面卡顿 | 1. 虚拟化滚动<br>2. 防抖节流<br>3. 懒加载 | 前端团队 |
| 消息队列积压 | 中 | 数据处理不及时导致消息积压 | 1. 消费者扩容<br>2. 死信队列<br>3. 监控告警 | 运维团队 |
| 缓存雪崩 | 中 | 缓存失效导致数据库压力激增 | 1. 缓存预热<br>2. 熔断机制<br>3. 限流策略 | 后端团队 |

### 6.3 监控和运维策略

#### 性能监控

```typescript
@Injectable()
export class BigScreenMonitoringService {
  constructor(
    private readonly metrics: PrometheusService,
    private readonly logger: Logger
  ) {}

  // API 响应时间监控
  recordApiLatency(endpoint: string, duration: number) {
    this.metrics.histogram('bigscreen_api_latency_seconds', duration, { endpoint });

    if (duration > 1000) { // 超过1秒记录警告
      this.logger.warn(`Slow API response: ${endpoint} took ${duration}ms`);
    }
  }

  // WebSocket 连接数监控
  recordActiveConnections(count: number) {
    this.metrics.gauge('bigscreen_websocket_connections', count);

    if (count > 1000) { // 连接数过多告警
      this.logger.warn(`High WebSocket connection count: ${count}`);
    }
  }

  // 数据聚合耗时监控
  recordAggregationTime(operation: string, duration: number) {
    this.metrics.histogram('bigscreen_aggregation_duration_seconds', duration, { operation });

    if (duration > 5000) { // 超过5秒记录警告
      this.logger.warn(`Slow aggregation: ${operation} took ${duration}ms`);
    }
  }

  // 缓存命中率监控
  recordCacheHitRate(cacheType: string, hitRate: number) {
    this.metrics.gauge('bigscreen_cache_hit_rate', hitRate, { cache_type: cacheType });

    if (hitRate < 0.8) { // 命中率低于80%告警
      this.logger.warn(`Low cache hit rate: ${cacheType} ${hitRate * 100}%`);
    }
  }

  // 数据库连接池监控
  recordDatabaseConnections(active: number, idle: number, total: number) {
    this.metrics.gauge('bigscreen_db_connections_active', active);
    this.metrics.gauge('bigscreen_db_connections_idle', idle);
    this.metrics.gauge('bigscreen_db_connections_total', total);

    const utilization = active / total;
    if (utilization > 0.8) { // 连接池使用率过高告警
      this.logger.warn(`High database connection utilization: ${utilization * 100}%`);
    }
  }

  // 内存使用监控
  recordMemoryUsage(heapUsed: number, heapTotal: number, external: number) {
    this.metrics.gauge('bigscreen_memory_heap_used_bytes', heapUsed);
    this.metrics.gauge('bigscreen_memory_heap_total_bytes', heapTotal);
    this.metrics.gauge('bigscreen_memory_external_bytes', external);

    const heapUsage = heapUsed / heapTotal;
    if (heapUsage > 0.9) { // 内存使用率过高告警
      this.logger.warn(`High memory usage: ${(heapUsage * 100).toFixed(2)}%`);
    }
  }
}
```

#### 健康检查

```typescript
@Injectable()
export class BigScreenHealthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly rabbitMQService: RabbitMQService
  ) {}

  @HealthCheck()
  async checkHealth() {
    return [
      // Redis 健康检查
      new PingCheckHealthIndicator({
        pingService: this.redis,
        key: 'bigscreen:health:check',
        timeout: 3000,
        delegate: (error) => ({
          'redis': error ? 'down' : 'up',
          'redis_latency': error ? null : await this.checkRedisLatency()
        })
      }),

      // 数据库健康检查
      new TypeOrmHealthIndicator({
        connection: this.dataSource,
        timeout: 5000,
        delegate: async (error) => ({
          'database': error ? 'down' : 'up',
          'database_connections': error ? null : await this.checkDatabaseConnections()
        })
      }),

      // RabbitMQ 健康检查
      new RabbitMQHealthIndicator({
        service: this.rabbitMQService,
        timeout: 3000,
        delegate: (error) => ({
          'rabbitmq': error ? 'down' : 'up',
          'rabbitmq_queues': error ? null : await this.checkRabbitMQQueues()
        })
      }),

      // 内存健康检查
      new MemoryHealthIndicator({
        key: 'bigscreen_memory',
        timeout: 1000,
        delegate: () => this.checkMemoryHealth()
      })
    ];
  }

  private async checkRedisLatency(): Promise<number> {
    const start = Date.now();
    await this.redis.ping();
    return Date.now() - start;
  }

  private async checkDatabaseConnections(): Promise<{ active: number, total: number }> {
    const driver = this.dataSource.driver;
    return {
      active: driver.totalCount,
      total: driver.options.max || 100
    };
  }

  private async checkRabbitMQQueues(): Promise<Record<string, number>> {
    const queues = ['bigscreen:realtime:updates', 'bigscreen:aggregation:tasks'];
    const result: Record<string, number> = {};

    for (const queue of queues) {
      try {
        result[queue] = await this.rabbitMQService.getQueueMessageCount(queue);
      } catch (error) {
        result[queue] = -1; // 表示无法获取
      }
    }

    return result;
  }

  private async checkMemoryHealth(): Promise<{ used: number, total: number, percentage: number }> {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percentage = (used / total) * 100;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100
    };
  }
}
```

#### 日志配置

```typescript
// pino 配置
export const bigScreenLoggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label: string) => ({ level: label }),
    log: (object: any) => ({
      ...object,
      service: 'bigscreen',
      timestamp: new Date().toISOString(),
      pid: process.pid
    })
  },
  timestamp: false,
  prettyPrint: process.env.NODE_ENV !== 'production'
};

// 结构化日志示例
export class BigScreenLogger {
  private readonly logger = new Logger(BigScreenLogger.name);

  logWebSocketConnection(clientId: string, userId: string, userAgent: string) {
    this.logger.log({
      type: 'websocket_connection',
      clientId,
      userId,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  logDataAggregation(operation: string, keyword: string, duration: number, recordCount: number) {
    this.logger.log({
      type: 'data_aggregation',
      operation,
      keyword,
      duration,
      recordCount,
      throughput: recordCount / (duration / 1000), // records per second
      timestamp: new Date().toISOString()
    });
  }

  logCacheOperation(operation: 'get' | 'set' | 'invalidate', key: string, hit: boolean, latency: number) {
    this.logger.debug({
      type: 'cache_operation',
      operation,
      key,
      hit,
      latency,
      timestamp: new Date().toISOString()
    });
  }

  logApiRequest(endpoint: string, method: string, statusCode: number, duration: number, userId?: string) {
    this.logger.log({
      type: 'api_request',
      endpoint,
      method,
      statusCode,
      duration,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  logError(error: Error, context: string, additionalInfo?: Record<string, any>) {
    this.logger.error({
      type: 'error',
      message: error.message,
      stack: error.stack,
      context,
      ...additionalInfo,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 6.4 部署配置

#### Docker 配置

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# 安装 pnpm 和依赖
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# 构建应用
COPY apps/api/ ./apps/api/
COPY tsconfig.json ./
RUN pnpm run build:api

# 生产镜像
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 创建非 root 用户
RUN addgroup -g 1001 -S nestjs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

CMD ["node", "dist/main.js"]
```

#### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # BigScreen API 服务
  bigscreen-api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/pro
      - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
      - MONGODB_URL=mongodb://mongo:27017/pro_raw
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Redis 缓存
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pro
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./database/postgresql.conf:/etc/postgresql/postgresql.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ 消息队列
  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
      RABBITMQ_DEFAULT_VHOST: /
    ports:
      - "5672:5672"
      - "15672:15672" # 管理界面
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./rabbitmq/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB 原始数据存储
  mongo:
    image: mongo:6
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: pro_raw
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      - ./mongo/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    restart: unless-stopped
    command: mongod --auth --bind_ip_all

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - bigscreen-api
    restart: unless-stopped

  # Prometheus 监控
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'

  # Grafana 可视化
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  redis_data:
    driver: local
  postgres_data:
    driver: local
  rabbitmq_data:
    driver: local
  mongo_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  default:
    driver: bridge
```

#### Kubernetes 部署配置

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bigscreen
  labels:
    name: bigscreen

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: bigscreen-config
  namespace: bigscreen
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  POSTGRES_HOST: "postgres-service"
  RABBITMQ_HOST: "rabbitmq-service"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bigscreen-secrets
  namespace: bigscreen
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  RABBITMQ_PASSWORD: <base64-encoded-rabbitmq-password>

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bigscreen-api
  namespace: bigscreen
  labels:
    app: bigscreen-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bigscreen-api
  template:
    metadata:
      labels:
        app: bigscreen-api
    spec:
      containers:
      - name: bigscreen-api
        image: bigscreen/api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: bigscreen-config
        - secretRef:
            name: bigscreen-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: bigscreen-api-service
  namespace: bigscreen
spec:
  selector:
    app: bigscreen-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bigscreen-ingress
  namespace: bigscreen
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - bigscreen.example.com
    secretName: bigscreen-tls
  rules:
  - host: bigscreen.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bigscreen-api-service
            port:
              number: 80

---
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bigscreen-api-hpa
  namespace: bigscreen
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bigscreen-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## 总结

本技术方案基于现有的 NestJS 微服务架构，设计了一套完整的实时数据聚合和推送系统，具有以下特点：

### 核心优势

1. **高性能**：
   - 三层缓存策略（5秒/30秒/5分钟）
   - 异步处理和批量聚合
   - 数据库索引优化和分区设计
   - WebSocket + GraphQL 双重实时推送

2. **实时性**：
   - 5分钟滑动窗口聚合
   - 增量更新机制
   - 实时 WebSocket 推送
   - GraphQL Subscription 支持

3. **可扩展性**：
   - 微服务架构，独立部署
   - 水平扩展支持
   - 负载均衡和容错机制
   - Kubernetes 部署支持

4. **可靠性**：
   - 完善的错误处理
   - 健康检查和监控
   - 自动重试和降级
   - 数据备份和恢复策略

### 技术特色

1. **优雅的架构设计**：
   - 事件驱动架构
   - 发布订阅模式
   - 依赖注入和模块化
   - 清晰的层次结构

2. **完善的数据模型**：
   - 精心设计的数据库实体
   - 合理的索引策略
   - 时间序列数据优化
   - 地理位置数据支持

3. **智能的缓存策略**：
   - 多层缓存架构
   - 缓存预热和失效
   - 内存使用优化
   - 缓存命中率监控

4. **全面的监控体系**：
   - Prometheus + Grafana 监控
   - 结构化日志记录
   - 性能指标收集
   - 告警和通知机制

通过分阶段实施，可以逐步构建出满足 BigScreen 需求的实时数据展示系统。整个方案注重代码质量和系统性能，体现了现代微服务架构的最佳实践。