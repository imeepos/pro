import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser, createMockEvent } from './graphql-test-client';

describe('EventResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;
  let authToken: string;
  let testUserId: string;
  let testEventId: string;

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

  describe('Event Queries', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get paginated events list', async () => {
      const query = `
        query Events($filter: EventQueryInput) {
          events(filter: $filter) {
            edges {
              node {
                id
                eventName
                summary
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            totalCount
          }
        }
      `;

      const result = await client.query(query, {
        filter: {
          page: 1,
          pageSize: 10,
        },
      });

      expect(result).toHaveProperty('events');
      expect(result.events).toHaveProperty('edges');
      expect(result.events).toHaveProperty('pageInfo');
      expect(result.events).toHaveProperty('totalCount');
      expect(Array.isArray(result.events.edges)).toBe(true);
    });

    it('should get events for map display', async () => {
      const query = `
        query EventsForMap($filter: EventMapQueryInput) {
          eventsForMap(filter: $filter) {
            id
            eventName
            latitude
            longitude
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('eventsForMap');
      expect(Array.isArray(result.eventsForMap)).toBe(true);
    });

    it('should get nearby events', async () => {
      const query = `
        query EventsNearby($longitude: Float!, $latitude: Float!, $radius: Float!) {
          eventsNearby(longitude: $longitude, latitude: $latitude, radius: $radius) {
            id
            eventName
            latitude
            longitude
          }
        }
      `;

      const result = await client.query(query, {
        longitude: 116.4074,
        latitude: 39.9042,
        radius: 10.0,
      });

      expect(result).toHaveProperty('eventsNearby');
      expect(Array.isArray(result.eventsNearby)).toBe(true);
    });

    it('should get single event by ID', async () => {
      // First create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
            summary
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      testEventId = createResult.createEvent.id;

      // Now query the event
      const query = `
        query Event($id: ID!) {
          event(id: $id) {
            id
            eventName
            summary
            occurTime
            locationText
            latitude
            longitude
          }
        }
      `;

      const result = await client.query(query, {
        id: testEventId,
      });

      expect(result).toHaveProperty('event');
      expect(result.event.id).toBe(testEventId);
      expect(result.event.eventName).toBe(mockEvent.eventName);
      expect(result.event.summary).toBe(mockEvent.summary);
    });
  });

  describe('Event Mutations', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should create a new event', async () => {
      const mockEvent = createMockEvent();

      const mutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
            summary
            occurTime
            locationText
            latitude
            longitude
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: mockEvent,
      });

      expect(result).toHaveProperty('createEvent');
      expect(result.createEvent).toHaveProperty('id');
      expect(result.createEvent.eventName).toBe(mockEvent.eventName);
      expect(result.createEvent.summary).toBe(mockEvent.summary);
      expect(result.createEvent.locationText).toBe(mockEvent.locationText);
      expect(result.createEvent.latitude).toBe(mockEvent.latitude);
      expect(result.createEvent.longitude).toBe(mockEvent.longitude);
      testEventId = result.createEvent.id;
    });

    it('should update an existing event', async () => {
      // First create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      testEventId = createResult.createEvent.id;

      // Now update the event
      const updateData = {
        eventName: `Updated Event ${Date.now()}`,
        summary: 'Updated description',
      };

      const updateMutation = `
        mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
          updateEvent(id: $id, input: $input) {
            id
            eventName
            summary
          }
        }
      `;

      const result = await client.mutate(updateMutation, {
        id: testEventId,
        input: updateData,
      });

      expect(result).toHaveProperty('updateEvent');
      expect(result.updateEvent.id).toBe(testEventId);
      expect(result.updateEvent.eventName).toBe(updateData.eventName);
      expect(result.updateEvent.summary).toBe(updateData.summary);
    });

    it('should publish an event', async () => {
      // First create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
            status
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      testEventId = createResult.createEvent.id;

      // Now publish the event
      const mutation = `
        mutation PublishEvent($id: ID!) {
          publishEvent(id: $id) {
            id
            eventName
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        id: testEventId,
      });

      expect(result).toHaveProperty('publishEvent');
      expect(result.publishEvent.id).toBe(testEventId);
      expect(result.publishEvent.status).toBe('PUBLISHED');
    });

    it('should archive an event', async () => {
      // First create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
            status
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      testEventId = createResult.createEvent.id;

      // Now archive the event
      const mutation = `
        mutation ArchiveEvent($id: ID!) {
          archiveEvent(id: $id) {
            id
            eventName
            status
          }
        }
      `;

      const result = await client.mutate(mutation, {
        id: testEventId,
      });

      expect(result).toHaveProperty('archiveEvent');
      expect(result.archiveEvent.id).toBe(testEventId);
      expect(result.archiveEvent.status).toBe('ARCHIVED');
    });

    it('should remove an event', async () => {
      // First create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      const eventToDelete = createResult.createEvent.id;

      // Now delete the event
      const mutation = `
        mutation RemoveEvent($id: ID!) {
          removeEvent(id: $id)
        }
      `;

      const result = await client.mutate(mutation, {
        id: eventToDelete,
      });

      expect(result).toHaveProperty('removeEvent');
      expect(result.removeEvent).toBe(true);

      // Verify event is deleted
      const query = `
        query Event($id: ID!) {
          event(id: $id) {
            id
            eventName
          }
        }
      `;

      await expect(client.query(query, {
        id: eventToDelete,
      })).rejects.toThrow();
    });
  });

  describe('Event Tag Management', () => {
    let client: any;
    let eventId: string;

    beforeEach(async () => {
      client = testSetup.createTestClient(TEST_API_KEY);

      // Create an event for tag testing
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      eventId = createResult.createEvent.id;
    });

    it('should add tags to event', async () => {
      // First create some tags
      const createTagMutation1 = `
        mutation CreateTag($input: CreateTagInput!) {
          createTag(input: $input) {
            id
            tagName
          }
        }
      `;

      const createTagMutation2 = `
        mutation CreateTag($input: CreateTagInput!) {
          createTag(input: $input) {
            id
            tagName
          }
        }
      `;

      const tag1Result = await client.mutate(createTagMutation1, {
        input: {
          tagName: `Test Tag 1 ${Date.now()}`,
          tagColor: '#ff0000',
        },
      });

      const tag2Result = await client.mutate(createTagMutation2, {
        input: {
          tagName: `Test Tag 2 ${Date.now()}`,
          tagColor: '#00ff00',
        },
      });

      const tagIds = [tag1Result.createTag.id, tag2Result.createTag.id];

      const mutation = `
        mutation AddTagsToEvent($eventId: ID!, $tagIds: [ID!]!) {
          addTagsToEvent(eventId: $eventId, tagIds: $tagIds) {
            id
            eventName
            tags {
              id
              tagName
            }
          }
        }
      `;

      const result = await client.mutate(mutation, {
        eventId,
        tagIds,
      });

      expect(result).toHaveProperty('addTagsToEvent');
      expect(result.addTagsToEvent.id).toBe(eventId);
      expect(result.addTagsToEvent.tags).toHaveLength(2);
    });

    it('should remove tag from event', async () => {
      // First create a tag and add it to the event
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
          tagName: `Test Tag To Remove ${Date.now()}`,
          tagColor: '#ff00ff',
        },
      });

      const tagId = tagResult.createTag.id;

      // Add the tag to the event first
      const addTagMutation = `
        mutation AddTagsToEvent($eventId: ID!, $tagIds: [ID!]!) {
          addTagsToEvent(eventId: $eventId, tagIds: $tagIds) {
            id
            tags {
              id
              tagName
            }
          }
        }
      `;

      await client.mutate(addTagMutation, {
        eventId,
        tagIds: [tagId],
      });

      // Now remove the tag
      const mutation = `
        mutation RemoveTagFromEvent($eventId: ID!, $tagId: ID!) {
          removeTagFromEvent(eventId: $eventId, tagId: $tagId)
        }
      `;

      const result = await client.mutate(mutation, {
        eventId,
        tagId,
      });

      expect(result).toHaveProperty('removeTagFromEvent');
      expect(result.removeTagFromEvent).toBe(true);
    });
  });

  describe('Event Field Resolvers', () => {
    let client: any;
    let eventId: string;

    beforeEach(async () => {
      client = testSetup.createTestClient(TEST_API_KEY);

      // Create an event
      const createMutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      const mockEvent = createMockEvent();
      const createResult = await client.mutate(createMutation, {
        input: mockEvent,
      });

      eventId = createResult.createEvent.id;
    });

    it('should resolve event type field', async () => {
      const query = `
        query Event($id: ID!) {
          event(id: $id) {
            id
            eventName
            eventType {
              id
              eventName
            }
          }
        }
      `;

      const result = await client.query(query, { id: eventId });
      expect(result).toHaveProperty('event');
      expect(result.event).toHaveProperty('eventType');
    });

    it('should resolve industry type field', async () => {
      const query = `
        query Event($id: ID!) {
          event(id: $id) {
            id
            eventName
            industryType {
              id
              industryName
            }
          }
        }
      `;

      const result = await client.query(query, { id: eventId });
      expect(result).toHaveProperty('event');
      expect(result.event).toHaveProperty('industryType');
    });

    it('should resolve tags field', async () => {
      const query = `
        query Event($id: ID!) {
          event(id: $id) {
            id
            eventName
            tags {
              id
              tagName
            }
          }
        }
      `;

      const result = await client.query(query, { id: eventId });
      expect(result).toHaveProperty('event');
      expect(result.event).toHaveProperty('tags');
      expect(Array.isArray(result.event.tags)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should fail to create event with invalid data', async () => {
      const mutation = `
        mutation CreateEvent($input: CreateEventInput!) {
          createEvent(input: $input) {
            id
            eventName
          }
        }
      `;

      await expect(client.mutate(mutation, {
        input: {
          eventName: '', // Empty eventName should fail validation
          summary: 'Test',
        },
      })).rejects.toThrow();
    });

    it('should fail to update non-existent event', async () => {
      const mutation = `
        mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
          updateEvent(id: $id, input: $input) {
            id
            eventName
          }
        }
      `;

      await expect(client.mutate(mutation, {
        id: '00000000-0000-0000-0000-000000000000',
        input: { eventName: 'Updated' },
      })).rejects.toThrow();
    });

    it('should fail to access events without API key', async () => {
      const clientWithoutAuth = testSetup.createTestClient(); // No API key

      const query = `
        query Events {
          events {
            edges {
              node {
                id
                eventName
              }
            }
          }
        }
      `;

      await expect(clientWithoutAuth.query(query)).rejects.toThrow();
    });
  });
});