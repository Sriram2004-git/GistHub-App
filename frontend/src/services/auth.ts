import apiClient from '@/lib/api';
import type { AuthToken, LoginRequest, RegisterRequest, User } from '@/types/auth';

export const authService = {
  async register(payload: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', payload);
    return response.data;
  },

  async login(payload: LoginRequest): Promise<AuthToken> {
    const response = await apiClient.post<AuthToken>('/auth/login', payload);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  /**
   * Look up a user by exact username.
   * Returns the user's public profile (id, username).
   * GET /users/lookup?username=<username>
   */
  async lookupUser(username: string): Promise<User> {
    const response = await apiClient.get<User>('/users/lookup', {
      params: { username },
    });
    return response.data;
  },
};

export default authService;
