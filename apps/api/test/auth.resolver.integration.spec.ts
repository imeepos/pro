import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { GraphQLTestSetup, TEST_API_KEY, createMockUser } from './graphql-test-client';

describe('AuthResolver Integration Tests', () => {
  let testSetup: GraphQLTestSetup;

  beforeAll(async () => {
    testSetup = new GraphQLTestSetup();
    await testSetup.createTestApp();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  describe('Mutations (No Auth Required)', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient();
    });

    it('should register a new user', async () => {
      const mockUser = createMockUser();
      const mutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
              username
              email
            }
            accessToken
            refreshToken
          }
        }
      `;

      const result = await client.mutate(mutation, {
        input: mockUser,
      });

      expect(result).toHaveProperty('register');
      expect(result.register).toHaveProperty('user');
      expect(result.register).toHaveProperty('accessToken');
      expect(result.register).toHaveProperty('refreshToken');
      expect(result.register.user.username).toBe(mockUser.username);
      expect(result.register.user.email).toBe(mockUser.email);
    });

    it('should login with valid credentials', async () => {
      const mockUser = createMockUser();

      // First register a user
      const registerMutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
              username
            }
          }
        }
      `;

      await client.mutate(registerMutation, {
        input: mockUser,
      });

      // Then login
      const loginMutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
              username
              email
            }
            accessToken
            refreshToken
          }
        }
      `;

      const result = await client.mutate(loginMutation, {
        input: {
          username: mockUser.username,
          password: mockUser.password,
        },
      });

      expect(result).toHaveProperty('login');
      expect(result.login).toHaveProperty('user');
      expect(result.login).toHaveProperty('accessToken');
      expect(result.login).toHaveProperty('refreshToken');
      expect(result.login.user.username).toBe(mockUser.username);
    });

    it('should refresh token', async () => {
      const mockUser = createMockUser();

      // Register and login to get tokens
      const registerMutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            accessToken
            refreshToken
          }
        }
      `;

      const registerResult = await client.mutate(registerMutation, {
        input: mockUser,
      });

      const refreshTokenMutation = `
        mutation RefreshToken($input: RefreshTokenDto!) {
          refreshToken(input: $input) {
            accessToken
            refreshToken
          }
        }
      `;

      const result = await client.mutate(refreshTokenMutation, {
        input: {
          refreshToken: registerResult.register.refreshToken,
        },
      });

      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).toHaveProperty('accessToken');
      expect(result.refreshToken).toHaveProperty('refreshToken');
      expect(typeof result.refreshToken.accessToken).toBe('string');
      expect(typeof result.refreshToken.refreshToken).toBe('string');
    });
  });

  describe('Mutations (Auth Required)', () => {
    let client: any;
    let authToken: string;

    beforeEach(async () => {
      client = testSetup.createTestClient(TEST_API_KEY);

      // Login to get auth token
      const mockUser = createMockUser();

      const registerMutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            accessToken
          }
        }
      `;

      const registerResult = await client.mutate(registerMutation, {
        input: mockUser,
      });

      authToken = registerResult.register.accessToken;

      // Update client with auth token
      client = testSetup.createTestClient(TEST_API_KEY);
      // Note: In real implementation, you might need to set Authorization header
    });

    it('should logout successfully', async () => {
      const mutation = `
        mutation Logout {
          logout
        }
      `;

      const result = await client.mutate(mutation);
      expect(result).toHaveProperty('logout');
      expect(result.logout).toBe(true);
    });
  });

  describe('Queries (Auth Required)', () => {
    let client: any;
    let authToken: string;

    beforeEach(async () => {
      client = testSetup.createTestClient(TEST_API_KEY);

      // Register and login to get auth token
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

      const registerResult = await client.mutate(registerMutation, {
        input: mockUser,
      });

      authToken = registerResult.register.accessToken;
    });

    it('should get current user info', async () => {
      const query = `
        query Me {
          me {
            id
            username
            email
          }
        }
      `;

      const result = await client.query(query);
      expect(result).toHaveProperty('me');
      expect(result.me).toHaveProperty('id');
      expect(result.me).toHaveProperty('username');
      expect(result.me).toHaveProperty('email');
      expect(typeof result.me.id).toBe('string');
      expect(typeof result.me.username).toBe('string');
      expect(typeof result.me.email).toBe('string');
    });
  });

  describe('Error Handling', () => {
    let client: any;

    beforeEach(() => {
      client = testSetup.createTestClient();
    });

    it('should fail to register with invalid email', async () => {
      const mutation = `
        mutation Register($input: RegisterDto!) {
          register(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(client.mutate(mutation, {
        input: {
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
        },
      })).rejects.toThrow();
    });

    it('should fail to login with wrong credentials', async () => {
      const mutation = `
        mutation Login($input: LoginDto!) {
          login(input: $input) {
            user {
              id
            }
          }
        }
      `;

      await expect(client.mutate(mutation, {
        input: {
          username: 'nonexistent',
          password: 'wrongpassword',
        },
      })).rejects.toThrow();
    });

    it('should fail to access protected endpoint without auth', async () => {
      const client = testSetup.createTestClient(); // No API key
      const query = `
        query Me {
          me {
            id
          }
        }
      `;

      await expect(client.query(query)).rejects.toThrow();
    });
  });
});