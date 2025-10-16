import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser } from './graphql-test-client';

describe('UserResolver Integration Tests', () => {
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
            email
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

  describe('Queries', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should get list of users', async () => {
      const query = `
        query Users {
          users {
            id
            username
            email
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('users');
      expect(Array.isArray(result.users)).toBe(true);
      expect(result.users.length).toBeGreaterThan(0);

      const user = result.users.find((u: any) => u.id === testUserId);
      expect(user).toBeDefined();
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
    });

    it('should get single user by ID', async () => {
      const query = `
        query User($id: String!) {
          user(id: $id) {
            id
            username
            email
          }
        }
      `;

      const result = await client.query(query, {
        id: testUserId,
      });

      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(testUserId);
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('email');
      expect(typeof result.user.username).toBe('string');
      expect(typeof result.user.email).toBe('string');
    });

    it('should return null for non-existent user', async () => {
      const query = `
        query User($id: String!) {
          user(id: $id) {
            id
            username
            email
          }
        }
      `;

      await expect(client.query(query, {
        id: '00000000-0000-0000-0000-000000000000',
      })).rejects.toThrow();
    });
  });

  describe('Mutations', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should update user information', async () => {
      const updateData = {
        username: `updated_${Date.now()}`,
        email: `updated_${Date.now()}@example.com`,
      };

      const mutation = `
        mutation UpdateUser($id: String!, $input: UpdateUserDto!) {
          updateUser(id: $id, input: $input) {
            id
            username
            email
          }
        }
      `;

      const result = await client.mutate(mutation, {
        id: testUserId,
        input: updateData,
      });

      expect(result).toHaveProperty('updateUser');
      expect(result.updateUser.id).toBe(testUserId);
      expect(result.updateUser.username).toBe(updateData.username);
      expect(result.updateUser.email).toBe(updateData.email);
    });

    it('should remove user', async () => {
      // First create a new user to delete
      const clientForCreate = testSetup.createTestClient(TEST_API_KEY);
      const mockUser = createMockUser();

      const registerMutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
            }
          }
        }
      `;

      const createResult = await clientForCreate.mutate(registerMutation, {
        input: mockUser,
      });

      const userIdToDelete = createResult.register.user.id;

      // Now delete the user
      const mutation = `
        mutation RemoveUser($id: String!) {
          removeUser(id: $id)
        }
      `;

      const result = await client.mutate(mutation, {
        id: userIdToDelete,
      });

      expect(result).toHaveProperty('removeUser');
      expect(result.removeUser).toBe(true);

      // Verify user is deleted
      const query = `
        query User($id: String!) {
          user(id: $id) {
            id
            username
          }
        }
      `;

      await expect(client.query(query, {
        id: userIdToDelete,
      })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient(TEST_API_KEY);
    });

    it('should fail to update user with invalid ID', async () => {
      const mutation = `
        mutation UpdateUser($id: String!, $input: UpdateUserDto!) {
          updateUser(id: $id, input: $input) {
            id
            username
          }
        }
      `;

      await expect(client.mutate(mutation, {
        id: 'invalid-id',
        input: { username: 'test' },
      })).rejects.toThrow();
    });

    it('should fail to delete non-existent user', async () => {
      const mutation = `
        mutation RemoveUser($id: String!) {
          removeUser(id: $id)
        }
      `;

      await expect(client.mutate(mutation, {
        id: '00000000-0000-0000-0000-000000000000',
      })).rejects.toThrow();
    });
  });

  describe('Authorization Tests', () => {
    it('should fail to access user endpoints without API key', async () => {
      const clientWithoutAuth = testSetup.createTestClient(); // No API key

      const query = `
        query Users {
          users {
            id
            username
          }
        }
      `;

      await expect(clientWithoutAuth.query(query)).rejects.toThrow();
    });

    it('should fail to update user without proper authorization', async () => {
      const clientWithInvalidKey = testSetup.createTestClient('invalid-api-key');

      const mutation = `
        mutation UpdateUser($id: String!, $input: UpdateUserDto!) {
          updateUser(id: $id, input: $input) {
            id
            username
          }
        }
      `;

      await expect(clientWithInvalidKey.mutate(mutation, {
        id: testUserId,
        input: { username: 'test' },
      })).rejects.toThrow();
    });
  });
});