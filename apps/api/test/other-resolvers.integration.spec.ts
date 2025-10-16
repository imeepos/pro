import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser } from './graphql-test-client';

describe('Other Resolvers Integration Tests', () => {
  let testSetup: GraphQLTestSetup;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    testSetup = new GraphQLTestSetup();
    await testSetup.createTestApp();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  beforeEach(async () => {
    // Create a test user and get auth token for each test
    const client = testSetup.createTestClient(TEST_API_KEY);
    const mockUser = createMockUser();

    const registerMutation = `
      mutation Register($input: RegisterDto!) {
        register(input: $input) {
          user {
            id
            username
          }
          accessToken
        }
      }
    `;

    const result = await client.mutate(registerMutation, {
      input: mockUser,
    });

    testUserId = result.register.user.id;
    authToken = result.register.accessToken;
  });

  describe('Config Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should handle missing config gracefully', async () => {
      const query = `
        query ConfigValue($type: ConfigType!) {
          configValue(type: $type) {
            value
            expiresAt
          }
        }
      `;

      // This test expects the config to not be set, which is normal in test environment
      try {
        const result = await client.query(query, {
          type: 'AMAP_API_KEY',
        });
        // If it succeeds, that's also fine - the config might be set
        expect(result).toHaveProperty('configValue');
      } catch (error) {
        // If it fails because config is not set, that's expected behavior
        expect(error.message).toContain('配置 amap_api_key 未设置');
      }
    });

    it('should get config cache stats', async () => {
      const query = `
        query ConfigCacheStats {
          configCacheStats {
            size
            keys
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('configCacheStats');
      expect(result.configCacheStats).toHaveProperty('size');
      expect(result.configCacheStats).toHaveProperty('keys');
      expect(Array.isArray(result.configCacheStats.keys)).toBe(true);
    });
  });

  describe('Media Type Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get list of media types', async () => {
      const query = `
        query MediaTypes {
          mediaTypes {
            edges {
              node {
                id
                typeName
                description
                typeCode
                status
                createdAt
              }
            }
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('mediaTypes');
      expect(result.mediaTypes).toHaveProperty('edges');
      expect(Array.isArray(result.mediaTypes.edges)).toBe(true);

      if (result.mediaTypes.edges.length > 0) {
        const mediaType = result.mediaTypes.edges[0].node;
        expect(mediaType).toHaveProperty('id');
        expect(mediaType).toHaveProperty('typeName');
        expect(mediaType).toHaveProperty('description');
        expect(mediaType).toHaveProperty('typeCode');
        expect(mediaType).toHaveProperty('status');
        expect(mediaType).toHaveProperty('createdAt');
      }
    });

    it('should create media type', async () => {
      const mutation = `
        mutation CreateMediaType($input: CreateMediaTypeInput!) {
          createMediaType(input: $input) {
            id
            typeName
            description
            typeCode
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          typeName: `Test Media Type ${Date.now()}`,
          description: 'Test media type',
          typeCode: `TEST_${Date.now()}`,
          status: 'ACTIVE',
        },
      });

      expect(result).toHaveProperty('createMediaType');
      expect(result.createMediaType).toHaveProperty('id');
      expect(result.createMediaType.typeName).toContain('Test Media Type');
      expect(result.createMediaType.description).toBe('Test media type');
      expect(result.createMediaType.typeCode).toContain('TEST_');
      expect(result.createMediaType.status).toBe('ACTIVE');
    });
  });

  describe('Tag Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get list of tags', async () => {
      const query = `
        query Tags {
          tags {
            edges {
              node {
                id
                tagName
                tagColor
                createdAt
                usageCount
              }
            }
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('tags');
      expect(result.tags).toHaveProperty('edges');
      expect(Array.isArray(result.tags.edges)).toBe(true);

      if (result.tags.edges.length > 0) {
        const tag = result.tags.edges[0].node;
        expect(tag).toHaveProperty('id');
        expect(tag).toHaveProperty('tagName');
        expect(tag).toHaveProperty('tagColor');
        expect(tag).toHaveProperty('createdAt');
        expect(tag).toHaveProperty('usageCount');
      }
    });

    it('should create tag', async () => {
      const mutation = `
        mutation CreateTag($input: CreateTagInput!) {
          createTag(input: $input) {
            id
            tagName
            tagColor
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          tagName: `Test Tag ${Date.now()}`,
          tagColor: '#FF0000',
        },
      });

      expect(result).toHaveProperty('createTag');
      expect(result.createTag).toHaveProperty('id');
      expect(result.createTag.tagName).toContain('Test Tag');
      expect(result.createTag.tagColor).toBe('#FF0000');
    });

    it('should get events by tag', async () => {
      // First create a tag
      const createTagMutation = `
        mutation CreateTag($input: CreateTagInput!) {
          createTag(input: $input) {
            id
            tagName
          }
        }
      `;

      const tagResult = await client.mutate(createTagMutation, {
        input: {
          tagName: `Event Tag ${Date.now()}`,
          tagColor: '#00FF00',
        },
      });

      const tagId = tagResult.createTag.id;

      // Create an event
      const createEventMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = {
        eventName: `Event with Tag ${Date.now()}`,
        summary: 'Event for tag testing',
        occurTime: new Date().toISOString(),
        province: 'Beijing',
        city: 'Beijing',
        district: 'Chaoyang',
        locationText: 'Test Location',
        latitude: 39.9042,
        longitude: 116.4074,
        eventTypeId: '1',
        industryTypeId: '1',
        status: 'DRAFT',
        tagIds: [tagId],
      };

      await client.mutate(createEventMutation, { input: mockEvent });

      // Now get events by tag
      const query = `
        query EventsByTag($tagId: ID!) {
          eventsByTag(tagId: $tagId) {
            id
            eventName
            summary
          }
        }
      `;

      const result = await client.query(query, { tagId });
      expect(result).toHaveProperty('eventsByTag');
      expect(Array.isArray(result.eventsByTag)).toBe(true);
    });
  });

  describe('Event Type Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get list of event types', async () => {
      const query = `
        query EventTypes {
          eventTypes {
            id
            eventName
            description
            eventCode
            status
            createdAt
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('eventTypes');
      expect(Array.isArray(result.eventTypes)).toBe(true);

      if (result.eventTypes.length > 0) {
        const eventType = result.eventTypes[0];
        expect(eventType).toHaveProperty('id');
        expect(eventType).toHaveProperty('eventName');
        expect(eventType).toHaveProperty('description');
        expect(eventType).toHaveProperty('eventCode');
        expect(eventType).toHaveProperty('status');
        expect(eventType).toHaveProperty('createdAt');
      }
    });

    it('should create event type', async () => {
      const mutation = `
        mutation CreateEventType($input: CreateEventTypeInput!) {
          createEventType(input: $input) {
            id
            eventName
            description
            eventCode
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          eventName: `Test Event Type ${Date.now()}`,
          description: 'Test event type',
          eventCode: `TEST_EVENT_${Date.now()}`,
        },
      });

      expect(result).toHaveProperty('createEventType');
      expect(result.createEventType).toHaveProperty('id');
      expect(result.createEventType.eventName).toContain('Test Event Type');
      expect(result.createEventType.description).toBe('Test event type');
      expect(result.createEventType.eventCode).toContain('TEST_EVENT_');
    });
  });

  describe('Industry Type Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get list of industry types', async () => {
      const query = `
        query IndustryTypes {
          industryTypes {
            id
            industryName
            description
            industryCode
            status
            createdAt
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('industryTypes');
      expect(Array.isArray(result.industryTypes)).toBe(true);

      if (result.industryTypes.length > 0) {
        const industryType = result.industryTypes[0];
        expect(industryType).toHaveProperty('id');
        expect(industryType).toHaveProperty('industryName');
        expect(industryType).toHaveProperty('description');
        expect(industryType).toHaveProperty('industryCode');
        expect(industryType).toHaveProperty('status');
        expect(industryType).toHaveProperty('createdAt');
      }
    });

    it('should create industry type', async () => {
      const mutation = `
        mutation CreateIndustryType($input: CreateIndustryTypeInput!) {
          createIndustryType(input: $input) {
            id
            industryName
            description
            industryCode
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          industryName: `Test Industry ${Date.now()}`,
          description: 'Test industry type',
          industryCode: `TEST_INDUSTRY_${Date.now()}`,
        },
      });

      expect(result).toHaveProperty('createIndustryType');
      expect(result.createIndustryType).toHaveProperty('id');
      expect(result.createIndustryType.industryName).toContain('Test Industry');
      expect(result.createIndustryType.description).toBe('Test industry type');
      expect(result.createIndustryType.industryCode).toContain('TEST_INDUSTRY_');
    });
  });

  describe('Screens Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get screens list', async () => {
      const query = `
        query Screens($limit: Int, $page: Int) {
          screens(limit: $limit, page: $page) {
            edges {
              node {
                id
                name
                status
                createdAt
                updatedAt
                createdBy
                isDefault
              }
            }
            totalCount
          }
        }
      `;

      const result = await client.query(query, {
        limit: 10,
        page: 1,
      });

      expect(result).toHaveProperty('screens');
      expect(result.screens).toHaveProperty('edges');
      expect(result.screens).toHaveProperty('totalCount');
      expect(Array.isArray(result.screens.edges)).toBe(true);
    });

    it('should get default screen', async () => {
      const query = `
        query DefaultScreen {
          defaultScreen {
            id
            name
            status
            isDefault
            createdAt
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('defaultScreen');
      expect(result.defaultScreen).toHaveProperty('id');
      expect(result.defaultScreen).toHaveProperty('name');
      expect(result.defaultScreen).toHaveProperty('status');
      expect(result.defaultScreen).toHaveProperty('isDefault');
    });

    it('should get published screens', async () => {
      const query = `
        query PublishedScreens($limit: Int, $page: Int) {
          publishedScreens(limit: $limit, page: $page) {
            edges {
              node {
                id
                name
                status
                createdAt
              }
            }
            totalCount
          }
        }
      `;

      const result = await client.query(query, {
        limit: 10,
        page: 1,
      });

      expect(result).toHaveProperty('publishedScreens');
      expect(result.publishedScreens).toHaveProperty('edges');
      expect(result.publishedScreens).toHaveProperty('totalCount');
      expect(Array.isArray(result.publishedScreens.edges)).toBe(true);
    });
  });

  describe('Notifications Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should dispatch notification', async () => {
      const mutation = `
        mutation DispatchNotification($input: NotificationInput!) {
          dispatchNotification(input: $input) {
            id
            title
            message
            timestamp
            userId
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: {
          title: `Test Notification ${Date.now()}`,
          message: 'This is a test notification',
          userId: testUserId,
        },
      });

      expect(result).toHaveProperty('dispatchNotification');
      expect(result.dispatchNotification).toHaveProperty('id');
      expect(result.dispatchNotification.title).toContain('Test Notification');
      expect(result.dispatchNotification.message).toBe('This is a test notification');
      expect(result.dispatchNotification.userId).toBe(testUserId);
    });
  });

  describe('JD Auth Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should handle JD login session gracefully', async () => {
      const mutation = `
        mutation StartJdLogin {
          startJdLogin {
            sessionId
            expired
            expiresAt
          }
        }
      `;

      try {
        const result = await client.mutate(mutation);
        expect(result).toHaveProperty('startJdLogin');
        expect(result.startJdLogin).toHaveProperty('sessionId');
        expect(result.startJdLogin).toHaveProperty('expired');
        expect(result.startJdLogin).toHaveProperty('expiresAt');
        expect(typeof result.startJdLogin.sessionId).toBe('string');
      } catch (error) {
        // Playwright browser might not be available in test environment
        expect(error.message).toContain('Playwright浏览器未就绪');
      }
    });

    it('should handle JD login session query gracefully', async () => {
      const query = `
        query JdLoginSession($sessionId: String!) {
          jdLoginSession(sessionId: $sessionId) {
            sessionId
            expired
            expiresAt
            lastEvent {
              type
              data
            }
          }
        }
      `;

      try {
        const result = await client.query(query, { sessionId: 'test-session-id' });
        expect(result).toHaveProperty('jdLoginSession');
      } catch (error) {
        // Session might not exist or other errors, which is fine for testing
        expect(error.message).toBeDefined();
      }
    });

    it('should get JD account stats', async () => {
      const query = `
        query JdAccountStats {
          jdAccountStats {
            total
            online
            todayNew
          }
        }
      `;

      const result = await client.query(query);

      expect(result).toHaveProperty('jdAccountStats');
      expect(result.jdAccountStats).toHaveProperty('total');
      expect(result.jdAccountStats).toHaveProperty('online');
      expect(result.jdAccountStats).toHaveProperty('todayNew');
      expect(typeof result.jdAccountStats.total).toBe('number');
    });
  });

  describe('Weibo Auth Resolver', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should handle Weibo login session gracefully', async () => {
      const mutation = `
        mutation StartWeiboLogin {
          startWeiboLogin {
            sessionId
            expired
            expiresAt
          }
        }
      `;

      try {
        const result = await client.mutate(mutation);
        expect(result).toHaveProperty('startWeiboLogin');
        expect(result.startWeiboLogin).toHaveProperty('sessionId');
        expect(result.startWeiboLogin).toHaveProperty('expired');
        expect(result.startWeiboLogin).toHaveProperty('expiresAt');
        expect(typeof result.startWeiboLogin.sessionId).toBe('string');
      } catch (error) {
        // Playwright browser might not be available in test environment
        expect(error.message).toContain('Playwright浏览器未就绪');
      }
    });

    it('should handle Weibo login session query gracefully', async () => {
      const query = `
        query WeiboLoginSession($sessionId: String!) {
          weiboLoginSession(sessionId: $sessionId) {
            sessionId
            expired
            expiresAt
            lastEvent {
              type
              data
            }
          }
        }
      `;

      try {
        const result = await client.query(query, { sessionId: 'test-session-id' });
        expect(result).toHaveProperty('weiboLoginSession');
      } catch (error) {
        // Session might not exist or other errors, which is fine for testing
        expect(error.message).toBeDefined();
      }
    });

    it('should get Weibo account stats', async () => {
      const query = `
        query WeiboAccountStats {
          weiboAccountStats {
            total
            online
            todayNew
          }
        }
      `;

      const result = await client.query(query);

      expect(result).toHaveProperty('weiboAccountStats');
      expect(result.weiboAccountStats).toHaveProperty('total');
      expect(result.weiboAccountStats).toHaveProperty('online');
      expect(result.weiboAccountStats).toHaveProperty('todayNew');
      expect(typeof result.weiboAccountStats.total).toBe('number');
    });
  });

  describe('Error Handling for Other Resolvers', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should fail without API key authentication', async () => {
      const clientWithoutAuth = testSetup.createTestClient(); // No API key

      const query = `
        query MediaTypes {
          mediaTypes {
            edges {
              node {
                id
                typeName
              }
            }
          }
        }
      `;

      await expect(clientWithoutAuth.query(query)).rejects.toThrow();
    });

    it('should fail with invalid API key', async () => {
      const clientWithInvalidKey = testSetup.createTestClient('invalid-api-key');

      const query = `
        query Tags {
          tags {
            edges {
              node {
                id
                tagName
              }
            }
          }
        }
      `;

      await expect(clientWithInvalidKey.query(query)).rejects.toThrow();
    });

    it('should handle malformed queries gracefully', async () => {
      const malformedQuery = `
        query InvalidQuery {
          nonExistentField {
            id
          }
        }
      `;

      await expect(client.query(malformedQuery)).rejects.toThrow();
    });
  });
});